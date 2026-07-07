/**
 * taste/extractor.mjs — extract taste signal from session logs (v2).
 *
 * v2 reframe: the taste profile is a BEHAVIORAL SIGNATURE, not a content
 * extraction. It profiles the OPERATOR's behavior, not the CODE's style.
 *
 * Five behavioral dimensions:
 *   1. Steering signature — ASI dimensions (from se.mjs)
 *   2. Iteration fingerprint — which files, loop depth, convergence
 *   3. Workflow rhythm — tool distribution, session shape, investigate-to-edit ratio
 *   4. Cascade personality — pillar distribution, leverage tendency, velocity pattern
 *   5. Correction taxonomy — design vs logic vs config corrections (categories, not content)
 *
 * Layer 3 (content extraction) is OPT-IN ("deep taste"), default off.
 * This solves the noise problem (truncated sentences, typos) AND the privacy
 * concern (content extraction is the most privacy-sensitive part).
 *
 * v1's preferences.design/code/workflow arrays are kept for backward compat
 * but are now generated from behavioral signals, not raw content extraction.
 */

import { steeringEfficiency, appropriateSteeringIndex } from './se.mjs'

/**
 * Extract taste v2 from aggregated sessions.
 * @param {object} agg - aggregated session data from logreader.aggregateSessions
 * @param {string} operator - operator codename
 * @param {object} opts - { deepTaste: false (default), cascade: null }
 *   deepTaste: if true, include Layer 3 content extraction (opt-in)
 *   cascade: cascade object { yield, snr, leverage, velocity, pillars } for taste→cascade bridge
 */
export function extractTaste(agg, operator = 'local', opts = {}) {
  const { deepTaste = false, cascade = null } = opts
  const se = steeringEfficiency(agg)
  const asi = appropriateSteeringIndex(agg)

  // ── 1. Steering signature (from ASI) ──────────────────────────────────────
  const steeringSignature = {
    asi: asi.asi,
    seLegacy: asi.seLegacy,
    dimensions: asi.dimensions,
    counts: asi.counts,
    perSession: asi.perSession,
  }

  // ── 2. Iteration fingerprint ──────────────────────────────────────────────
  // Which files you iterate on most, correction loop depth, convergence patterns.
  // The SHAPE of your iteration, not the content.
  const fileEntries = Object.entries(agg.fileEditCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)

  const iterationFingerprint = fileEntries.map(([file, count]) => {
    const loops = agg.correctionLoops.filter(l => l.file === file)
    const converging = loops.some(l => l.converging)
    const diverging = loops.some(l => !l.converging)
    const maxDepth = loops.length > 0 ? Math.max(...loops.map(l => l.depth)) : 0
    return {
      file: file.split('/').pop(),
      fullPath: file,
      editCount: count,
      correctionLoops: loops.length,
      maxLoopDepth: maxDepth,
      converging,
      diverging,
      category: categorizeFile(file),
      intensity: count > 50 ? 'high' : count > 20 ? 'moderate' : 'low',
    }
  })

  // Iteration concentration: how much of your editing is on few files
  const totalEdits = agg.totalEdits || 1
  const topFileShare = fileEntries.length > 0 ? fileEntries[0][1] / totalEdits : 0
  const top3Share = fileEntries.slice(0, 3).reduce((sum, [, c]) => sum + c, 0) / totalEdits
  const iterationConcentration = top3Share > 0.5 ? 'concentrated' : top3Share > 0.3 ? 'moderate' : 'dispersed'

  // ── 3. Workflow rhythm ────────────────────────────────────────────────────
  // Tool distribution, session shape, investigate-to-edit ratio.
  const toolEntries = Object.entries(agg.toolNameCounts).sort((a, b) => b[1] - a[1])
  const totalTools = agg.totalToolUses || 1
  const topTool = toolEntries[0]
  const readCount = agg.toolNameCounts.Read || 0
  const editCount = (agg.toolNameCounts.Edit || 0) + (agg.toolNameCounts.MultiEdit || 0) + (agg.toolNameCounts.Write || 0)
  const bashCount = agg.toolNameCounts.Bash || 0
  const grepCount = (agg.toolNameCounts.Grep || 0) + (agg.toolNameCounts.Glob || 0)
  const investigateCount = readCount + grepCount

  const investigateToEdit = editCount > 0 ? investigateCount / editCount : 0
  const bashToEdit = editCount > 0 ? bashCount / editCount : 0

  const workflowRhythm = {
    primaryTool: topTool ? { name: topTool[0], share: round((topTool[1] / totalTools) * 100, 1) } : null,
    toolDistribution: {
      read: round((readCount / totalTools) * 100, 1),
      edit: round((editCount / totalTools) * 100, 1),
      bash: round((bashCount / totalTools) * 100, 1),
      investigate: round((investigateCount / totalTools) * 100, 1),
    },
    investigateToEdit: round(investigateToEdit, 2),
    bashToEdit: round(bashToEdit, 2),
    style: investigateToEdit > 1.5 ? 'investigate-first (explores before editing)'
      : bashToEdit > 2 ? 'trial-and-error (tests by running)'
      : editCount > investigateCount ? 'iterative (rapid edit cycles)'
      : 'balanced',
    askUserFrequency: agg.totalAskUser > 0
      ? { calls: agg.totalAskUser, perTurn: round(agg.totalAskUser / (agg.totalTurns || 1) * 100, 1) }
      : { calls: 0, perTurn: 0, note: 'prefers autonomy (zero AskUserQuestion calls)' },
    sessionShape: agg.sessionCount > 0
      ? { count: agg.sessionCount, avgToolsPerSession: round(totalTools / agg.sessionCount, 1) }
      : null,
  }

  // ── 4. Cascade personality ───────────────────────────────────────────────
  // Pillar distribution, leverage tendency, velocity pattern.
  // Are you a cache-hoarder? An output-pusher? An input-minimizer?
  let cascadePersonality = null
  if (cascade && cascade.pillars) {
    const p = cascade.pillars
    const total = p.total || (p.input + p.output + p.cacheCreate + p.cacheRead)
    const cacheReadShare = p.cacheRead / total
    const inputShare = p.input / total
    const outputShare = p.output / total

    const personality = []
    if (cacheReadShare > 0.9) personality.push('cache-hoarder')
    if (inputShare < 0.02) personality.push('input-minimizer')
    if (inputShare > 0.10) personality.push('input-heavy')
    if (outputShare > 0.10) personality.push('output-pusher')
    if (outputShare < 0.01) personality.push('output-light')
    if (cascade.leverage > 100) personality.push('high-leverage')
    if (cascade.leverage < 10) personality.push('low-leverage')
    if (cascade.velocity > 1.5) personality.push('high-velocity')
    if (cascade.velocity < 0.5) personality.push('low-velocity')

    cascadePersonality = {
      types: personality,
      pillarDistribution: {
        input: round(inputShare * 100, 1),
        output: round(outputShare * 100, 1),
        cacheCreate: round((p.cacheCreate / total) * 100, 1),
        cacheRead: round(cacheReadShare * 100, 1),
      },
      leverage: cascade.leverage,
      velocity: cascade.velocity,
      snr: cascade.snr,
      yield: cascade.yield,
      class: cascade.class,
    }
  }

  // ── 5. Correction taxonomy ────────────────────────────────────────────────
  // Not "what you said" but "what you corrected": design vs logic vs config.
  // The CATEGORIES of your corrections, not the content.
  const correctionTaxonomy = {}
  for (const item of iterationFingerprint) {
    if (item.correctionLoops > 0) {
      const cat = item.category
      if (!correctionTaxonomy[cat]) {
        correctionTaxonomy[cat] = { files: 0, totalLoops: 0, totalEdits: 0, maxDepth: 0 }
      }
      correctionTaxonomy[cat].files++
      correctionTaxonomy[cat].totalLoops += item.correctionLoops
      correctionTaxonomy[cat].totalEdits += item.editCount
      correctionTaxonomy[cat].maxDepth = Math.max(correctionTaxonomy[cat].maxDepth, item.maxLoopDepth)
    }
  }
  // Sort by total loops (most corrected category first)
  const taxonomySorted = Object.entries(correctionTaxonomy)
    .map(([cat, data]) => ({ category: cat, ...data, avgLoopsPerFile: round(data.totalLoops / data.files, 1) }))
    .sort((a, b) => b.totalLoops - a.totalLoops)

  // ── v1 backward compat: preferences arrays ────────────────────────────────
  // Generate from behavioral signals, not raw content extraction
  const preferences = {
    design: buildDesignPreferences(iterationFingerprint, taxonomySorted, deepTaste, agg),
    code: buildCodePreferences(agg, se),
    workflow: buildWorkflowPreferences(workflowRhythm, agg),
  }

  // ── v1 backward compat: correctionPatterns ────────────────────────────────
  const correctionPatterns = iterationFingerprint.slice(0, 10).map(item => ({
    file: item.file,
    fullPath: item.fullPath,
    editCount: item.editCount,
    correctionLoops: item.correctionLoops,
    maxLoopDepth: item.maxLoopDepth,
    converging: item.converging,
    category: item.category,
  }))

  // ── v1 backward compat: metrics ───────────────────────────────────────────
  const designIterationIndex = fileEntries.length > 0 && agg.totalEdits > 0
    ? round(fileEntries[0][1] / agg.totalEdits, 4) : 0
  const alignmentScore = round(
    se.acceptanceRate * (1 - Math.min(0.5, agg.correctionLoops.length / (agg.totalTurns || 1))),
    4
  )

  // ── Deep taste (opt-in Layer 3) ───────────────────────────────────────────
  let deepTasteData = null
  if (deepTaste) {
    deepTasteData = extractDeepTaste(agg)
  }

  return {
    // v2 structure
    steeringSignature,
    iterationFingerprint,
    iterationConcentration,
    workflowRhythm,
    cascadePersonality,
    correctionTaxonomy: taxonomySorted,
    deepTaste: deepTasteData,
    // v1 backward compat
    preferences,
    correctionPatterns,
    metrics: {
      steeringEfficiency: se.se,
      asi: asi.asi,
      acceptanceRate: se.acceptanceRate,
      correctionRate: se.correctionRate,
      rejectionRate: se.rejectionRate,
      designIterationIndex,
      agentAlignmentScore: alignmentScore,
    },
    raw: {
      sessionsAnalyzed: agg.sessionCount,
      totalToolUses: agg.totalToolUses,
      totalEdits: agg.totalEdits,
      totalRejections: agg.totalRejections,
      correctionLoops: agg.correctionLoops.length,
      totalTurns: agg.totalTurns,
    },
  }
}

// ── Deep taste (opt-in Layer 3 content extraction) ─────────────────────────

function extractDeepTaste(agg) {
  const directives = agg.feedbackDirectives.slice(0, 100)
  // Filter noise: drop truncated, too-short, or stream-of-consciousness entries
  const cleaned = directives.filter(d => {
    const text = typeof d === 'string' ? d : d.text
    if (!text || text.length < 10) return false
    if (text.includes('...')) return false // truncated mid-thought
    if (/\b(um|uh|relly|knwo|wanna|gonna)\b/i.test(text)) return false // stream-of-consciousness
    if (text.split(' ').length < 3) return false // too short to be meaningful
    return true
  }).map(d => typeof d === 'string' ? d : d.text)

  const clusters = clusterDirectives(cleaned)
  return {
    enabled: true,
    directiveCount: directives.length,
    cleanedCount: cleaned.length,
    clusters: clusters.slice(0, 8),
    note: 'Layer 3 content extraction is opt-in. Directives are filtered for noise. Raw content is not retained.',
  }
}

function clusterDirectives(directives) {
  const clusters = {}
  for (const d of directives) {
    const lower = d.toLowerCase()
    let key = 'other'
    if (/median|average|avg/.test(lower)) key = 'no-median'
    else if (/larger|bigger|size|font|scale|prominent/.test(lower)) key = 'larger-numbers'
    else if (/smaller|compact|dense|tight/.test(lower)) key = 'compact'
    else if (/color|gold|amber|dark|light|theme/.test(lower)) key = 'color-theme'
    else if (/remove|get rid|delete|drop|hide/.test(lower)) key = 'remove'
    else if (/add|include|show|display/.test(lower)) key = 'add'
    else if (/move|align|center|position|layout/.test(lower)) key = 'layout'
    else if (/click|link|button|interactive|preview/.test(lower)) key = 'interactive'
    if (!clusters[key]) clusters[key] = []
    clusters[key].push(d)
  }
  return Object.entries(clusters)
    .map(([key, items]) => ({
      key,
      count: items.length,
      summary: summarizeCluster(key, items),
    }))
    .sort((a, b) => b.count - a.count)
}

function summarizeCluster(key, items) {
  const count = items.length
  const freq = count > 10 ? `(strong signal — ${count} directives)` : count > 3 ? `(${count} directives)` : `(1 directive — low confidence)`
  const map = {
    'no-median': `dislikes median/average display — prefers the primary numbers as the show ${freq}`,
    'larger-numbers': `prefers large, prominent numbers — "they are the show" ${freq}`,
    'compact': `prefers compact, dense layouts ${freq}`,
    'color-theme': `specific color/theme preferences (gold accent, dark backgrounds) ${freq}`,
    'remove': `actively removes elements — minimalist tendency ${freq}`,
    'add': `requests additions — expanding the surface ${freq}`,
    'layout': `particular about layout, alignment, positioning ${freq}`,
    'interactive': `wants interactive elements (clicks, previews, links) ${freq}`,
    'other': count > 2 ? `${count} general feedback directives (not clustered)` : `general feedback (low frequency)`,
  }
  return map[key] || map.other
}

// ── v1 compat preference builders (behavioral, not content-based) ──────────

function buildDesignPreferences(fingerprint, taxonomy, deepTaste, agg) {
  const design = []
  // From correction taxonomy: what categories do you correct most?
  const designCats = taxonomy.filter(t => ['design', 'ui-component', 'styling'].includes(t.category))
  if (designCats.length > 0) {
    const top = designCats[0]
    design.push(`iterates heavily on ${top.category} (${top.totalLoops} correction loops across ${top.files} files — primary design focus)`)
  }
  // From iteration fingerprint: concentration
  if (fingerprint.length > 0 && fingerprint[0].editCount > 50) {
    design.push(`concentrated design iteration on ${fingerprint[0].file} (${fingerprint[0].editCount} edits, ${fingerprint[0].correctionLoops} loops)`)
  }
  // From deep taste (if enabled)
  if (deepTaste && deepTaste.clusters) {
    for (const cluster of deepTaste.clusters.slice(0, 4)) {
      if (cluster.key !== 'other') {
        design.push(cluster.summary)
      }
    }
  }
  // Fallback: from correction loop patterns
  if (design.length === 0 && fingerprint.length > 0) {
    const converging = fingerprint.filter(f => f.converging).length
    const diverging = fingerprint.filter(f => f.diverging).length
    if (converging > diverging) {
      design.push('design iterations converge (agent eventually matches taste)')
    } else if (diverging > converging) {
      design.push('design iterations diverge (agent struggles to match taste — consider feeding preferences at session start)')
    }
  }
  return design.length > 0 ? design : ['no strong design iteration patterns detected']
}

function buildCodePreferences(agg, se) {
  const code = []
  if (agg.editSizes.length > 0) {
    const med = median(agg.editSizes)
    if (med < 200) code.push(`prefers small targeted edits (median edit ~${Math.round(med)} chars)`)
    else if (med > 1000) code.push(`prefers large rewrites (median edit ~${Math.round(med)} chars)`)
    else code.push(`mixed edit sizes (median edit ~${Math.round(med)} chars)`)
  }
  if (agg.editDeltas.length > 0) {
    const avgDelta = agg.editDeltas.reduce((a, b) => a + b, 0) / agg.editDeltas.length
    if (Math.abs(avgDelta) < 50) code.push('tweaks more than adds/removes (near-zero net delta)')
    else if (avgDelta > 0) code.push(`net adder (avg delta +${Math.round(avgDelta)} chars per edit)`)
    else code.push(`net remover (avg delta ${Math.round(avgDelta)} chars per edit)`)
  }
  if (agg.replaceAllCount > 0) {
    code.push(`convention-aware (${agg.replaceAllCount} replace_all edits — global changes)`)
  }
  const rejectRate = agg.totalToolUses > 0 ? agg.totalRejections / agg.totalToolUses : 0
  if (rejectRate < 0.01) {
    code.push(`high acceptance (${round(rejectRate * 100, 2)}% reject rate — agent output usually matches taste)`)
  } else if (rejectRate > 0.05) {
    code.push(`corrective (${round(rejectRate * 100, 1)}% reject rate — agent often misses taste)`)
  }
  return code
}

function buildWorkflowPreferences(rhythm, agg) {
  const workflow = []
  if (rhythm.primaryTool) {
    workflow.push(`primary tool: ${rhythm.primaryTool.name} (${rhythm.primaryTool.share}% of ${agg.totalToolUses} tool uses)`)
  }
  workflow.push(rhythm.style)
  if (rhythm.askUserFrequency.calls > 0) {
    workflow.push(`prefers to be consulted (${rhythm.askUserFrequency.calls} AskUserQuestion calls, ${rhythm.askUserFrequency.perTurn}% of turns)`)
  } else {
    workflow.push('prefers autonomy (zero AskUserQuestion calls — lets the agent decide)')
  }
  return workflow
}

// ── Helpers ────────────────────────────────────────────────────────────────

function categorizeFile(path) {
  const lower = path.toLowerCase()
  if (/\.(css|scss|styled|theme)/.test(lower)) return 'styling'
  if (/\.(tsx|jsx)/.test(lower)) return 'ui-component'
  if (/component|card|panel|modal|nav|header|footer|layout/i.test(lower)) return 'design'
  if (/\.(test|spec)/.test(lower)) return 'testing'
  if (/readme|doc|md$/.test(lower)) return 'docs'
  if (/\.(py|js|mjs|ts)/.test(lower)) return 'code'
  return 'other'
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const round = (n, d) => Number(n.toFixed(d))
