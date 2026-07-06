/**
 * taste/extractor.mjs — extract taste signal from session logs.
 *
 * Reads the aggregated session data (from logreader.aggregateSessions) and
 * distills it into structured taste preferences across 3 layers:
 *   Layer 1: metadata (tool distribution, edit counts, reject rate)
 *   Layer 2: structural (correction loops, convergence, session shape)
 *   Layer 3: content (user feedback directives — distilled, not retained)
 *
 * The output is the taste profile's `preferences` + `correctionPatterns` + `metrics`.
 */

import { steeringEfficiency } from './se.mjs'

/** Extract taste preferences from aggregated sessions. */
export function extractTaste(agg, operator = 'local') {
  const se = steeringEfficiency(agg)

  // Layer 1: workflow style from tool distribution
  const workflow = []
  const toolEntries = Object.entries(agg.toolNameCounts).sort((a, b) => b[1] - a[1])
  const totalTools = agg.totalToolUses || 1
  const topTool = toolEntries[0]
  if (topTool) {
    const pct = round((topTool[1] / totalTools) * 100, 1)
    workflow.push(`primary tool: ${topTool[0]} (${pct}% of ${agg.totalToolUses} tool uses)`)
  }
  const readCount = agg.toolNameCounts.Read || 0
  const editCount = (agg.toolNameCounts.Edit || 0) + (agg.toolNameCounts.MultiEdit || 0) + (agg.toolNameCounts.Write || 0)
  const bashCount = agg.toolNameCounts.Bash || 0
  if (readCount > editCount && readCount > bashCount) {
    workflow.push('investigate-first workflow (Read-heavy — cautious, explores before editing)')
  } else if (editCount > readCount && editCount > bashCount) {
    workflow.push('iterative workflow (Edit-heavy — rapid correction cycles)')
  } else if (bashCount > readCount) {
    workflow.push('trial-and-error workflow (Bash-heavy — tests by running)')
  }
  if (agg.totalAskUser > 0) {
    const askPct = round((agg.totalAskUser / agg.totalTurns) * 100, 1)
    workflow.push(`prefers to be consulted (${agg.totalAskUser} AskUserQuestion calls, ${askPct}% of turns)`)
  } else {
    workflow.push('prefers autonomy (zero AskUserQuestion calls — lets the agent decide)')
  }

  // Layer 1: edit style
  const code = []
  if (agg.editSizes.length > 0) {
    const medianEdit = median(agg.editSizes)
    if (medianEdit < 200) {
      code.push(`prefers small targeted edits (median edit ~${Math.round(medianEdit)} chars)`)
    } else if (medianEdit > 1000) {
      code.push(`prefers large rewrites (median edit ~${Math.round(medianEdit)} chars)`)
    } else {
      code.push(`mixed edit sizes (median edit ~${Math.round(medianEdit)} chars)`)
    }
  }
  if (agg.editDeltas.length > 0) {
    const avgDelta = agg.editDeltas.reduce((a, b) => a + b, 0) / agg.editDeltas.length
    if (Math.abs(avgDelta) < 50) {
      code.push('tweaks more than adds/removes (near-zero net delta)')
    } else if (avgDelta > 0) {
      code.push(`net adder (avg delta +${Math.round(avgDelta)} chars per edit)`)
    } else {
      code.push(`net remover (avg delta ${Math.round(avgDelta)} chars per edit)`)
    }
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

  // Layer 2: correction patterns — top iterated files
  const fileEntries = Object.entries(agg.fileEditCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const correctionPatterns = fileEntries.map(([file, count]) => {
    const loops = agg.correctionLoops.filter(l => l.file === file)
    const converging = loops.some(l => l.converging)
    return {
      file: file.split('/').pop(),
      fullPath: file,
      editCount: count,
      correctionLoops: loops.length,
      maxLoopDepth: loops.length > 0 ? Math.max(...loops.map(l => l.depth)) : 0,
      converging,
      category: categorizeFile(file),
    }
  })

  // Layer 2: design iteration index (how concentrated edits are on few files)
  const designIterationIndex = fileEntries.length > 0 && agg.totalEdits > 0
    ? round(fileEntries[0][1] / agg.totalEdits, 4)
    : 0

  // Layer 3: design preferences from user feedback directives
  const design = []
  const directives = agg.feedbackDirectives.slice(0, 50) // cap
  // Cluster similar directives
  const directiveClusters = clusterDirectives(directives)
  for (const cluster of directiveClusters.slice(0, 8)) {
    design.push(cluster.summary)
  }
  if (design.length === 0 && correctionPatterns.length > 0) {
    design.push(`iterates heavily on ${correctionPatterns[0].file} (${correctionPatterns[0].editCount} edits — primary design focus)`)
  }

  // Agent alignment score: how well the agent matches the operator's taste
  // = acceptance rate weighted by inverse correction loop density
  const alignmentScore = round(
    se.acceptanceRate * (1 - Math.min(0.5, agg.correctionLoops.length / (agg.totalTurns || 1))),
    4
  )

  return {
    preferences: { design, code, workflow },
    correctionPatterns,
    metrics: {
      steeringEfficiency: se.se,
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

function clusterDirectives(directives) {
  // Simple keyword-based clustering
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
  const sample = items[0]?.slice(0, 100) || ''
  const map = {
    'no-median': `dislikes median/average display — prefers the primary numbers as the show`,
    'larger-numbers': `prefers large, prominent numbers — "they are the show"`,
    'compact': `prefers compact, dense layouts`,
    'color-theme': `specific color/theme preferences (gold accent, dark backgrounds)`,
    'remove': `actively removes elements — minimalist tendency`,
    'add': `requests additions — expanding the surface`,
    'layout': `particular about layout, alignment, positioning`,
    'interactive': `wants interactive elements (clicks, previews, links)`,
    'other': `general directive: "${sample}"`,
  }
  return map[key] || map.other
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const round = (n, d) => Number(n.toFixed(d))
