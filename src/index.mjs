#!/usr/bin/env node
/**
 * index.mjs — signa entry point.
 *
 * Usage:
 *   signa                    → start interactive REPL
 *   signa scan               → one-shot scan (read logs, compute, save, print)
 *   signa diagnose           → one-shot diagnose
 *   signa simulate <args>    → one-shot simulate
 *   signa taste              → one-shot taste profile
 *   signa watch              → start watch daemon
 *   signa --help             → help
 *
 * Everything stays local. Nothing leaves your machine.
 */

import { join } from 'node:path'
import { homedir } from 'node:os'
import { readAllSessions, aggregateSessions } from './logreader.mjs'
import { cascade as computeCascade } from './cascade.mjs'
import { steeringEfficiency } from './taste/se.mjs'
import { generateAndSave, loadProfile } from './taste/profile.mjs'
import { loadSettings, saveSettings, appendHistory } from './store.mjs'
import { startRepl } from './repl.mjs'
import {
  skillDiagnose, skillSimulate, skillSuggest, skillTrack,
  skillTaste, skillGoal, skillCost, skillAnomaly, skillSelfImprove, skillCompare,
} from './skills/index.mjs'

const DEFAULT_ROOT = join(homedir(), '.claude', 'projects')

/** Scan logs, compute everything, save to history + taste profile, return ctx. */
async function scan(opts = {}) {
  const settings = await loadSettings()
  const root = opts.root || settings.root || DEFAULT_ROOT
  const sinceDays = opts.sinceDays || 30

  console.log(`Reading logs from ${root} (last ${sinceDays}d)...`)
  const sessions = await readAllSessions(root, { sinceDays, maxFiles: 500 })
  if (sessions.length === 0) {
    console.log('No sessions found.')
    return null
  }
  console.log(`  ${sessions.length} sessions found.`)

  const agg = aggregateSessions(sessions)
  const cas = computeCascade(agg.tokens)
  const se = steeringEfficiency(agg)

  // Generate + save taste profile
  const profile = await generateAndSave(agg, settings.codename || 'local')

  // Append to history
  await appendHistory({
    cascade: cas,
    se,
    tokens: agg.tokens,
    sessionCount: agg.sessionCount,
  })

  console.log(`  Υ ${cas.yield?.toLocaleString()}  ·  ${cas.class}  ·  SE ${se.se}`)
  console.log(`  Taste profile saved.`)

  return { agg, cas, se, profile, settings, raw: { sessions, agg } }
}

/** Build ctx from the most recent history entry (for non-scan commands). */
async function ctxFromHistory() {
  const settings = await loadSettings()
  const { loadHistory } = await import('./store.mjs')
  const history = await loadHistory()
  if (history.length === 0) return { settings, cas: null, se: null, profile: null, agg: null }
  const last = history[history.length - 1]
  const profile = await loadProfile()
  return {
    settings,
    cas: last.cascade,
    se: last.se,
    profile,
    agg: null,
  }
}

async function main() {
  const arg = process.argv[2] || ''
  const rest = process.argv.slice(3).join(' ')

  // MCP server mode — expose skills as MCP tools for the operator's own agent
  if (arg === '--mcp' || arg === 'mcp') {
    const { startServer } = await import('./mcp-server.mjs')
    await startServer()
    return
  }

  switch (arg) {
    case '':
    case 'repl':
    case 'chat': {
      // Start REPL — scan first if no history
      let ctx = await ctxFromHistory()
      if (!ctx.cas) {
        console.log('No history found. Running initial scan...\n')
        ctx = await scan()
        if (!ctx) { process.exit(0) }
      }
      await startRepl(ctx, async () => {
        const fresh = await scan()
        if (fresh) {
          ctx.cas = fresh.cas
          ctx.se = fresh.se
          ctx.profile = fresh.profile
          ctx.agg = fresh.agg
        }
      })
      break
    }
    case 'scan': {
      const ctx = await scan()
      if (!ctx) process.exit(1)
      console.log('\n' + await skillDiagnose(ctx))
      break
    }
    case 'diagnose': {
      const ctx = await ctxFromHistory()
      console.log(await skillDiagnose(ctx))
      break
    }
    case 'simulate': {
      const ctx = await ctxFromHistory()
      console.log(await skillSimulate(ctx, rest))
      break
    }
    case 'suggest': {
      const ctx = await ctxFromHistory()
      console.log(await skillSuggest(ctx))
      break
    }
    case 'track': {
      const ctx = await ctxFromHistory()
      console.log(await skillTrack(ctx))
      break
    }
    case 'taste': {
      const ctx = await ctxFromHistory()
      console.log(await skillTaste(ctx))
      break
    }
    case 'goal': {
      const ctx = await ctxFromHistory()
      console.log(await skillGoal(ctx, rest))
      break
    }
    case 'cost': {
      const ctx = await ctxFromHistory()
      console.log(await skillCost(ctx))
      break
    }
    case 'anomaly': {
      const ctx = await ctxFromHistory()
      console.log(await skillAnomaly(ctx))
      break
    }
    case 'self-improve': {
      const ctx = await ctxFromHistory()
      console.log(await skillSelfImprove(ctx))
      break
    }
    case 'compare': {
      const ctx = await ctxFromHistory()
      console.log(await skillCompare(ctx, rest))
      break
    }
    case 'watch': {
      const { startWatch } = await import('./watch.mjs')
      const settings = await loadSettings()
      const root = settings.root || DEFAULT_ROOT
      console.log('Starting watch daemon. Ctrl-C to stop.')
      startWatch(root, async () => {
        console.log('\n[watch] change detected, scanning...')
        await scan()
        console.log('[watch] done.\n')
      })
      // Keep alive
      setInterval(() => {}, 1000)
      break
    }
    case '--help':
    case '-h':
    case 'help': {
      console.log(`
signa — interactive token-cascade agent

Usage:
  signa                    Start interactive REPL
  signa scan               Read logs, compute cascade + taste, save
  signa diagnose           Pillar-level audit
  signa simulate <args>    Project Υ delta (e.g. "cacheRead +50000")
  signa suggest            Ranked recommendations
  signa track              Metrics over time
  signa taste              Show taste profile
  signa goal <class>       Path to target class (e.g. "transmitter")
  signa cost               Token-to-cost analysis
  signa anomaly            Detect metric drops
  signa self-improve       Full cycle: diagnose → suggest → actions
  signa compare <class>    Head-to-head vs class average
  signa watch              Start background daemon
  signa --mcp              Start MCP server (expose skills to your AI agent)

MCP server mode:
  signa --mcp starts a stdio MCP server that exposes signa's skills as
  MCP tools. Your AI agent (Claude Code, Cursor, Windsurf) can call them
  through MCP. You bring your own LLM; signa provides the skills.

  In .mcp.json:
    { "mcpServers": { "signa": { "command": "signa", "args": ["--mcp"] } } }

Everything stays local. Nothing leaves your machine.
`)
      break
    }
    default:
      console.log(`Unknown command: ${arg}. Run "signa help" for usage.`)
      process.exit(1)
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`)
  process.exit(1)
})
