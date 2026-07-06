/**
 * logreader.mjs — rich session-log reader for signa.
 *
 * Unlike sigrank-mcp's tokenpull (which only extracts usage blocks),
 * this reader extracts ALL three signal layers:
 *   Layer 1: metadata (tool names, file paths, edit sizes, reject/error rates)
 *   Layer 2: structural (correction loops, convergence, session shape)
 *   Layer 3: content (user feedback, edit diffs — distilled, not retained)
 *
 * Everything stays local. Nothing is transmitted.
 *
 * Claude Code format: ~/.claude/projects/<project>/<session>.jsonl
 * Each line is a JSON event with type, message, timestamp.
 */

import { readdir, readFile, lstat } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

const DEFAULT_ROOT = join(homedir(), '.claude', 'projects')

// Tooling to exclude (same list as sigrank-mcp — these inflate metrics)
const EXCLUDE_TOOLING = /(^|[/-])(claude-mem|mem0|claude-self-reflect|basic-memory|memento|cipher-mem|memory-keeper)\b|observer-(sessions|archive)/i

const REJECTION_PATTERNS = [
  /user doesn't want to proceed/i,
  /user rejected/i,
  /user declined/i,
  /the user wants to stop/i,
  /tool use was rejected/i,
]

/** Recursively yield every *.jsonl path under dir (skips symlink dirs). */
async function* walkJsonl(dir, max = 10_000) {
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue
    const full = join(dir, ent.name)
    if (ent.isSymbolicLink()) continue
    if (ent.isDirectory()) {
      yield* walkJsonl(full, max)
    } else if (ent.isFile() && ent.name.endsWith('.jsonl')) {
      yield full
    }
  }
}

/** Parse one .jsonl file into a rich session object with all 3 layers. */
export async function parseSession(path) {
  let text
  try {
    text = await readFile(path, 'utf-8')
  } catch {
    return null
  }

  const events = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      events.push(JSON.parse(trimmed))
    } catch {
      // skip unparseable lines
    }
  }
  if (events.length === 0) return null

  const session = {
    path,
    project: path.split('/.claude/projects/')[1]?.split('/')[0] || 'unknown',
    events: [],
    messages: [], // normalized: {role, model, ts, tokens, toolUses, toolResults, content}
    turns: [], // grouped into assistant-turn / user-response pairs
    // Layer 1: metadata
    toolNameCounts: {},
    fileEditCounts: {},
    editSizes: [],
    editDeltas: [],
    replaceAllCount: 0,
    rejectCount: 0,
    errorCount: 0,
    askUserCount: 0,
    commandFirstWords: {},
    // Layer 2: structural
    correctionLoops: [],
    // Layer 3: content (distilled)
    feedbackDirectives: [], // user feedback messages (preference signals)
    editDiffs: [], // {file, oldLen, newLen, delta} — sizes only, not content
    // Token telemetry (for cascade)
    tokens: { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 },
    timeBounds: { start: null, end: null },
  }

  // First pass: normalize events into messages
  for (const evt of events) {
    if (!evt || typeof evt !== 'object') continue
    const msg = evt.message
    if (!msg || typeof msg !== 'object') continue

    const role = msg.role || evt.type || 'unknown'
    const model = msg.model || null
    const ts = evt.timestamp || evt.ts || null
    const usage = msg.usage
    const content = msg.content

    const message = {
      role,
      model,
      ts,
      tokens: { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 },
      toolUses: [],
      toolResults: [],
      textContent: '',
      thinkingContent: '',
    }

    if (usage && typeof usage === 'object') {
      message.tokens.input = Number(usage.input_tokens || 0)
      message.tokens.output = Number(usage.output_tokens || 0)
      message.tokens.cacheCreate = Number(usage.cache_creation_input_tokens || 0)
      message.tokens.cacheRead = Number(usage.cache_read_input_tokens || 0)
      session.tokens.input += message.tokens.input
      session.tokens.output += message.tokens.output
      session.tokens.cacheCreate += message.tokens.cacheCreate
      session.tokens.cacheRead += message.tokens.cacheRead
    }

    // Parse content blocks
    if (typeof content === 'string') {
      message.textContent = content
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (!block || typeof block !== 'object') {
          if (typeof block === 'string') message.textContent += block
          continue
        }
        if (block.type === 'text' && typeof block.text === 'string') {
          message.textContent += block.text
        } else if (block.type === 'thinking' && typeof block.thinking === 'string') {
          message.thinkingContent += block.thinking
        } else if (block.type === 'tool_use') {
          message.toolUses.push({
            id: block.id,
            name: block.name,
            input: block.input || {},
          })
        } else if (block.type === 'tool_result') {
          message.toolResults.push({
            toolUseId: block.tool_use_id,
            isError: block.is_error || false,
            content: typeof block.content === 'string' ? block.content :
                     Array.isArray(block.content) ? block.content.map(c => c?.text || '').join('') : '',
          })
        }
      }
    }

    session.messages.push(message)
    if (ts) {
      if (!session.timeBounds.start || ts < session.timeBounds.start) session.timeBounds.start = ts
      if (!session.timeBounds.end || ts > session.timeBounds.end) session.timeBounds.end = ts
    }
  }

  // Second pass: extract Layer 1 + Layer 3 signals from messages
  for (const msg of session.messages) {
    // Layer 1: tool metadata
    for (const tu of msg.toolUses) {
      session.toolNameCounts[tu.name] = (session.toolNameCounts[tu.name] || 0) + 1
      if (tu.name === 'AskUserQuestion') session.askUserCount++
      if (tu.name === 'Bash' && tu.input?.command) {
        const first = tu.input.command.trim().split(/\s+/)[0]
        if (first) session.commandFirstWords[first] = (session.commandFirstWords[first] || 0) + 1
      }
      if (tu.name === 'Edit' || tu.name === 'Write' || tu.name === 'MultiEdit') {
        const file = tu.input?.file_path || tu.input?.path
        if (file) {
          session.fileEditCounts[file] = (session.fileEditCounts[file] || 0) + 1
        }
        if (tu.name === 'Edit') {
          const oldLen = (tu.input?.old_string || '').length
          const newLen = (tu.input?.new_string || '').length
          session.editSizes.push(newLen)
          session.editDeltas.push(newLen - oldLen)
          if (tu.input?.replace_all) session.replaceAllCount++
          // Layer 3: edit diff sizes (not content)
          session.editDiffs.push({ file, oldLen, newLen, delta: newLen - oldLen })
        }
      }
    }
    // Layer 1: reject/error counts
    for (const tr of msg.toolResults) {
      if (tr.isError) {
        const isRejection = REJECTION_PATTERNS.some(p => p.test(tr.content))
        if (isRejection) session.rejectCount++
        else session.errorCount++
      }
    }
    // Layer 3: user feedback directives (distilled — just the text, not retained long-term)
    if (msg.role === 'user' && msg.textContent) {
      // Heuristic: short user messages with imperative verbs are taste directives
      const text = msg.textContent.trim()
      if (text.length > 5 && text.length < 500) {
        const imperative = /^(get rid of|make|remove|add|change|move|don't|do not|stop|use|prefer|want|need|fix|update|replace|hide|show|increase|decrease|larger|smaller|bigger)\b/i
        if (imperative.test(text) && !text.startsWith('{') && !text.startsWith('<')) {
          session.feedbackDirectives.push(text.slice(0, 200))
        }
      }
    }
  }

  // Third pass: Layer 2 — correction loops
  // A correction loop = 3+ consecutive edits to the same file
  const editSequence = []
  for (const msg of session.messages) {
    for (const tu of msg.toolUses) {
      if ((tu.name === 'Edit' || tu.name === 'MultiEdit') && tu.input?.file_path) {
        editSequence.push({ file: tu.input.file_path, ts: msg.ts, delta: (tu.input.new_string || '').length - (tu.input.old_string || '').length })
      }
    }
  }
  let i = 0
  while (i < editSequence.length) {
    const file = editSequence[i].file
    let j = i
    while (j < editSequence.length && editSequence[j].file === file) j++
    const runLen = j - i
    if (runLen >= 3) {
      const deltas = editSequence.slice(i, j).map(e => e.delta)
      const converging = deltas.length >= 3 && deltas.slice(1).every((d, k) => Math.abs(d) <= Math.abs(deltas[k]) + 50)
      session.correctionLoops.push({
        file,
        depth: runLen,
        converging,
        deltas,
      })
    }
    i = j
  }

  // Group messages into turns (assistant turn + following user response)
  for (let k = 0; k < session.messages.length; k++) {
    const msg = session.messages[k]
    if (msg.role === 'assistant') {
      const turn = {
        assistantMsg: msg,
        userResponse: null,
        accepted: true, // default
        corrected: false,
        rejected: false,
      }
      // Find the next user message
      for (let m = k + 1; m < session.messages.length; m++) {
        if (session.messages[m].role === 'user') {
          turn.userResponse = session.messages[m]
          break
        }
        if (session.messages[m].role === 'assistant') break
      }
      // Determine outcome: rejected?
      for (const tr of msg.toolResults) {
        if (tr.isError && REJECTION_PATTERNS.some(p => p.test(tr.content))) {
          turn.rejected = true
          turn.accepted = false
        }
      }
      // Determine outcome: corrected? (user edits same file assistant edited, within next 2 turns)
      if (!turn.rejected && turn.userResponse) {
        const assistantEditFiles = new Set(
          msg.toolUses
            .filter(tu => (tu.name === 'Edit' || tu.name === 'MultiEdit') && tu.input?.file_path)
            .map(tu => tu.input.file_path)
        )
        if (assistantEditFiles.size > 0) {
          for (let m = k + 1; m < Math.min(k + 4, session.messages.length); m++) {
            const next = session.messages[m]
            if (next.role === 'user' || next.role === 'assistant') {
              for (const tu of next.toolUses) {
                if ((tu.name === 'Edit' || tu.name === 'MultiEdit') && assistantEditFiles.has(tu.input?.file_path)) {
                  turn.corrected = true
                  turn.accepted = false
                  break
                }
              }
            }
            if (turn.corrected) break
          }
        }
      }
      session.turns.push(turn)
    }
  }

  return session
}

/** Read all sessions under a root dir. Returns array of session objects. */
export async function readAllSessions(root = DEFAULT_ROOT, opts = {}) {
  const { maxFiles = 500, sinceDays = null } = opts
  const sessions = []
  let count = 0
  const cutoff = sinceDays ? Date.now() - sinceDays * 86_400_000 : null
  for await (const path of walkJsonl(root)) {
    if (count >= maxFiles) break
    if (EXCLUDE_TOOLING.test(path)) continue
    const session = await parseSession(path)
    if (session && session.messages.length > 0) {
      if (cutoff && session.timeBounds.end) {
        const endMs = new Date(session.timeBounds.end).getTime()
        if (endMs < cutoff) continue
      }
      sessions.push(session)
      count++
    }
  }
  return sessions
}

/** Aggregate sessions into windowed pillar totals + taste signals. */
export function aggregateSessions(sessions) {
  const agg = {
    sessionCount: sessions.length,
    tokens: { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 },
    totalMessages: 0,
    totalTurns: 0,
    totalToolUses: 0,
    totalEdits: 0,
    totalRejections: 0,
    totalErrors: 0,
    totalAskUser: 0,
    toolNameCounts: {},
    fileEditCounts: {},
    editSizes: [],
    editDeltas: [],
    replaceAllCount: 0,
    correctionLoops: [],
    feedbackDirectives: [],
    commandFirstWords: {},
    turns: [], // all turns across sessions (for SE)
    timeBounds: { start: null, end: null },
  }
  for (const s of sessions) {
    agg.tokens.input += s.tokens.input
    agg.tokens.output += s.tokens.output
    agg.tokens.cacheCreate += s.tokens.cacheCreate
    agg.tokens.cacheRead += s.tokens.cacheRead
    agg.totalMessages += s.messages.length
    agg.totalTurns += s.turns.length
    agg.totalToolUses += Object.values(s.toolNameCounts).reduce((a, b) => a + b, 0)
    agg.totalEdits += Object.values(s.fileEditCounts).reduce((a, b) => a + b, 0)
    agg.totalRejections += s.rejectCount
    agg.totalErrors += s.errorCount
    agg.totalAskUser += s.askUserCount
    agg.replaceAllCount += s.replaceAllCount
    for (const [k, v] of Object.entries(s.toolNameCounts)) {
      agg.toolNameCounts[k] = (agg.toolNameCounts[k] || 0) + v
    }
    for (const [k, v] of Object.entries(s.fileEditCounts)) {
      agg.fileEditCounts[k] = (agg.fileEditCounts[k] || 0) + v
    }
    for (const [k, v] of Object.entries(s.commandFirstWords)) {
      agg.commandFirstWords[k] = (agg.commandFirstWords[k] || 0) + v
    }
    agg.editSizes.push(...s.editSizes)
    agg.editDeltas.push(...s.editDeltas)
    agg.correctionLoops.push(...s.correctionLoops)
    agg.feedbackDirectives.push(...s.feedbackDirectives)
    agg.turns.push(...s.turns)
    if (s.timeBounds.start && (!agg.timeBounds.start || s.timeBounds.start < agg.timeBounds.start)) {
      agg.timeBounds.start = s.timeBounds.start
    }
    if (s.timeBounds.end && (!agg.timeBounds.end || s.timeBounds.end > agg.timeBounds.end)) {
      agg.timeBounds.end = s.timeBounds.end
    }
  }
  return agg
}
