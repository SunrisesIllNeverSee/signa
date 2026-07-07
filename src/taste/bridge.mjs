/**
 * taste/bridge.mjs — the taste → cascade bridge.
 *
 * This is the coaching nobody else can give. It connects the behavioral taste
 * profile (steering signature, iteration fingerprint, workflow rhythm, cascade
 * personality, correction taxonomy) to cascade performance (Υ, SNR, Leverage,
 * Velocity, class).
 *
 * No other tool has both sides: Tier 1 tools have token counts, Tier 2 tools
 * have behavioral patterns, Tier 3 (us) has the cascade. Only signa connects
 * behavior to cascade architecture.
 *
 * Output: array of coaching insights, each with:
 *   { dimension, observation, cascadeImpact, recommendation, severity }
 */

/**
 * Generate taste → cascade coaching insights.
 * @param {object} taste - taste profile from extractTaste()
 * @param {object} cascade - cascade object { yield, snr, leverage, velocity, class, pillars }
 * @returns {array} coaching insights
 */
export function tasteCascadeBridge(taste, cascade) {
  if (!taste || !cascade || cascade.yield === null) return []

  const insights = []

  // ── 1. Steering signature → cascade ───────────────────────────────────────
  const steering = taste.steeringSignature
  if (steering) {
    // High SE but low Υ = over-accepting, not compounding
    if (steering.seLegacy > 0.95 && cascade.yield < 500) {
      insights.push({
        dimension: 'steering',
        observation: `Your SE is ${steering.seLegacy} (near-perfect acceptance) but your Υ is ${cascade.yield.toLocaleString()} (${cascade.class}).`,
        cascadeImpact: 'You accept almost everything the agent produces, but your cascade isn\'t compounding. High acceptance means low intervention — you\'re not steering the agent toward higher-yield output.',
        recommendation: 'Push the agent to produce more output per turn. Your steering is efficient but your velocity is the bottleneck. Ask for complete implementations, not incremental pieces.',
        severity: 'medium',
      })
    }

    // High over-correction index = wasting tokens on unnecessary corrections
    const overCorr = steering.dimensions.overCorrectionIndex
    if (overCorr && overCorr.value > 0.3) {
      insights.push({
        dimension: 'steering',
        observation: `Your over-correction index is ${(overCorr.value * 100).toFixed(0)}% — ${overCorr.confidence} confidence. Nearly ${Math.round(overCorr.value * steering.counts.corrected)} of your ${steering.counts.corrected} corrections may be additive edits, not fixes.`,
        cascadeImpact: 'Each unnecessary correction costs ~2K input tokens (re-reading the file + re-instructing the agent). Over 500 sessions, that\'s wasted input that inflates your denominator and suppresses Υ.',
        recommendation: 'Before correcting, ask: am I fixing the agent\'s output, or adding to it? If adding, let the agent do it in the next turn instead of correcting manually.',
        severity: 'medium',
      })
    }

    // Very tight intervention timing = reactive steering
    const timing = steering.dimensions.interventionTiming
    if (timing && timing.value !== null && timing.value < 5) {
      insights.push({
        dimension: 'steering',
        observation: `Your intervention timing is ${timing.value}s — ${timing.label}. You intervene almost instantly after the agent acts.`,
        cascadeImpact: 'Very tight steering can prevent the agent from completing multi-step work. Each interruption resets the agent\'s context, potentially causing cache misses and re-reads.',
        recommendation: 'Let the agent finish a complete unit of work before intervening. Batch your feedback instead of correcting each step.',
        severity: 'low',
      })
    }

    // Reliance slope decreasing = losing confidence, possibly over-correcting
    const reliance = steering.dimensions.relianceSlope
    if (reliance && reliance.value !== null && reliance.value < -0.01) {
      insights.push({
        dimension: 'steering',
        observation: `Your reliance slope is ${reliance.value} — ${reliance.trend}. You\'re accepting less over time.`,
        cascadeImpact: 'Decreasing reliance may indicate the agent is degrading, or you\'re becoming more cautious. Either way, more corrections = more input tokens = lower Υ.',
        recommendation: 'Check if the agent\'s output quality actually changed, or if your standards shifted. If the agent is fine, your extra corrections are pure token waste.',
        severity: 'low',
      })
    }
  }

  // ── 2. Iteration fingerprint → cascade ────────────────────────────────────
  const fingerprint = taste.iterationFingerprint
  if (fingerprint && fingerprint.length > 0) {
    // Heavy iteration on docs/non-production files = output not contributing to Υ
    const docsEdits = fingerprint.filter(f => f.category === 'docs')
    const docsTotal = docsEdits.reduce((sum, f) => sum + f.editCount, 0)
    const allTotal = fingerprint.reduce((sum, f) => sum + f.editCount, 0)
    if (allTotal > 0 && docsTotal / allTotal > 0.3) {
      insights.push({
        dimension: 'iteration',
        observation: `You have ${docsTotal} edits on documentation files (${((docsTotal / allTotal) * 100).toFixed(0)}% of your top-file edits). Primary: ${docsEdits[0].file} (${docsEdits[0].editCount} edits).`,
        cascadeImpact: 'Documentation edits generate output tokens but don\'t improve your cascade architecture. Υ rewards output that compounds (code, not docs). Your output is going to non-compounding work.',
        recommendation: 'Delegate documentation to the agent in larger batches. Spend your steering on production code where output quality directly affects Υ.',
        severity: 'low',
      })
    }

    // Diverging correction loops = agent struggling, burning tokens
    const diverging = fingerprint.filter(f => f.diverging && f.correctionLoops > 2)
    if (diverging.length > 0) {
      insights.push({
        dimension: 'iteration',
        observation: `${diverging.length} files have diverging correction loops (edits getting larger, not converging): ${diverging.map(f => f.file).join(', ')}.`,
        cascadeImpact: 'Diverging loops are the most expensive token waste — each iteration produces MORE output that needs MORE correction. The agent isn\'t matching your taste on these files.',
        recommendation: 'For diverging files, stop the loop and give explicit taste guidance. Feed your taste profile at session start. If a file diverges past 5 edits, start fresh with a clearer prompt.',
        severity: 'high',
      })
    }

    // Concentrated iteration on one file = potential bottleneck
    if (taste.iterationConcentration === 'concentrated' && fingerprint[0]) {
      insights.push({
        dimension: 'iteration',
        observation: `Your iteration is concentrated: ${fingerprint[0].file} has ${fingerprint[0].editCount} edits (${fingerprint[0].intensity} intensity).`,
        cascadeImpact: 'Concentrated iteration on one file means your output tokens are going to a single surface. If that surface is production code, this is fine. If it\'s polish/design, you\'re over-investing output in one area.',
        recommendation: 'Check if this file is production-critical. If not, consider whether the iteration depth is justified or if you\'re perfectionism-cycling.',
        severity: 'low',
      })
    }
  }

  // ── 3. Workflow rhythm → cascade ──────────────────────────────────────────
  const rhythm = taste.workflowRhythm
  if (rhythm) {
    // Bash-heavy workflow = burning cache reads
    if (rhythm.toolDistribution.bash > 40) {
      insights.push({
        dimension: 'workflow',
        observation: `Your workflow is Bash-heavy (${rhythm.toolDistribution.bash}% of tool uses). You verify by running, not by reading.`,
        cascadeImpact: `Each Bash command that produces output forces a context reload. Your cache read is high (${cascade.pillars ? pct(cascade.pillars.cacheRead, cascade.pillars.total) : '?'} of tokens), but Bash output may be displacing useful cached context with command output.`,
        recommendation: 'Use Read/Grep to verify before Bash. Reading is cache-friendly (reuses context); running generates new output that displaces cache.',
        severity: 'medium',
      })
    }

    // Low investigate-to-edit ratio = editing blind
    if (rhythm.investigateToEdit < 0.5) {
      insights.push({
        dimension: 'workflow',
        observation: `Your investigate-to-edit ratio is ${rhythm.investigateToEdit} — you edit ${Math.round(1 / rhythm.investigateToEdit)}x more than you investigate.`,
        cascadeImpact: 'Editing without investigating leads to correction loops (the agent doesn\'t have enough context). Each correction loop costs input tokens for re-instruction.',
        recommendation: 'Read the file before editing. Let the agent investigate (Read/Grep) before it edits. The cache cost of reading is lower than the input cost of correcting.',
        severity: 'medium',
      })
    }

    // Prefers autonomy (no AskUserQuestion) but low Υ = agent needs direction
    if (rhythm.askUserFrequency.calls === 0 && cascade.velocity < 1) {
      insights.push({
        dimension: 'workflow',
        observation: `You prefer autonomy (zero AskUserQuestion calls) but your velocity is ${cascade.velocity} (low).`,
        cascadeImpact: 'The agent is running autonomously but not producing enough output. Without your direction, it may be cautious — generating less output per turn.',
        recommendation: 'Give the agent explicit output targets: "implement the full feature, not just the skeleton." Autonomy works best when the agent knows what "done" looks like.',
        severity: 'low',
      })
    }
  }

  // ── 4. Cascade personality → cascade ──────────────────────────────────────
  const personality = taste.cascadePersonality
  if (personality) {
    // Cache-hoarder with low velocity = hoarding but not producing
    if (personality.types.includes('cache-hoarder') && personality.types.includes('low-velocity')) {
      insights.push({
        dimension: 'cascade-personality',
        observation: `You're a cache-hoarder (${personality.pillarDistribution.cacheRead}% cache read) with low velocity (${personality.velocity}). Leverage is ${personality.leverage}×.`,
        cascadeImpact: 'You\'re excellent at reusing context (high leverage) but you\'re not converting that context into output. Υ = (cacheRead × output) / input². Your cacheRead is high but your output is low — the formula punishes you for not producing.',
        recommendation: 'Push the agent to generate more. Ask for complete implementations, not pieces. Your cache leverage is your strength — use it to produce more output, not to hoard more context.',
        severity: 'high',
      })
    }

    // Input-heavy = too much instruction, not enough cache
    if (personality.types.includes('input-heavy')) {
      insights.push({
        dimension: 'cascade-personality',
        observation: `Your input is ${personality.pillarDistribution.input}% of total tokens — that's high.`,
        cascadeImpact: 'Fresh input is the most expensive token type. The cascade rewards cache reuse (low input, high cacheRead). High input suppresses leverage and SNR.',
        recommendation: 'Compress your prompts. Reference prior context instead of re-explaining. Let the agent read files instead of pasting content into the prompt.',
        severity: 'high',
      })
    }

    // Output-light = not generating enough
    if (personality.types.includes('output-light')) {
      insights.push({
        dimension: 'cascade-personality',
        observation: `Your output is only ${personality.pillarDistribution.output}% of total tokens.`,
        cascadeImpact: 'Υ = (cacheRead × output) / input². Output is in the numerator — low output directly suppresses Υ. You\'re spending tokens on input and cache but not producing results.',
        recommendation: 'Ask the agent for more: complete files, full implementations, detailed analysis. Each output token contributes to Υ; each input token detracts.',
        severity: 'high',
      })
    }
  }

  // ── 5. Correction taxonomy → cascade ──────────────────────────────────────
  const taxonomy = taste.correctionTaxonomy
  if (taxonomy && taxonomy.length > 0) {
    const topCat = taxonomy[0]
    // Heavy correction on design = taste mismatch costing tokens
    if (['design', 'ui-component', 'styling'].includes(topCat.category) && topCat.totalLoops > 10) {
      insights.push({
        dimension: 'correction-taxonomy',
        observation: `Your most-corrected category is ${topCat.category}: ${topCat.totalLoops} correction loops across ${topCat.files} files (max depth ${topCat.maxDepth}).`,
        cascadeImpact: `Design corrections are the most expensive — they\'re often subjective, so the agent can\'t learn from the correction pattern. Each loop costs ~2K input tokens. ${topCat.totalLoops} loops × 2K = ~${(topCat.totalLoops * 2).toFixed(0)}K wasted input tokens.`,
        recommendation: 'Feed your design preferences to the agent at session start. Use the taste profile. Be explicit about design rules: "no median, large numbers, gold accent." Reduce the loop depth by front-loading taste.',
        severity: 'high',
      })
    }

    // Heavy correction on code = agent struggling with logic
    if (topCat.category === 'code' && topCat.totalLoops > 5) {
      insights.push({
        dimension: 'correction-taxonomy',
        observation: `Your most-corrected category is code: ${topCat.totalLoops} correction loops across ${topCat.files} files.`,
        cascadeImpact: 'Code corrections indicate the agent is producing buggy or wrong logic. Unlike design corrections, these should converge (the agent learns from the fix). If they\'re not converging, the agent may be in the wrong context.',
        recommendation: 'Check if the agent has enough context before it starts coding. Read the relevant files first. If loops diverge, stop and re-explain the requirement.',
        severity: 'medium',
      })
    }
  }

  // Sort by severity (high first)
  const severityOrder = { high: 0, medium: 1, low: 2 }
  insights.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3))

  return insights
}

/** Format a taste→cascade bridge report for the REPL. */
export function formatBridgeReport(insights) {
  if (insights.length === 0) {
    return 'No taste → cascade insights available. Run `scan` first.'
  }
  const lines = []
  lines.push('═══ TASTE → CASCADE BRIDGE ═══')
  lines.push('')
  lines.push(`${insights.length} insight${insights.length === 1 ? '' : 's'} connecting your behavior to your cascade:`)
  lines.push('')
  for (const ins of insights) {
    const icon = ins.severity === 'high' ? '🔴' : ins.severity === 'medium' ? '🟡' : '🟢'
    lines.push(`${icon} [${ins.severity.toUpperCase()}] ${ins.dimension.toUpperCase()}`)
    lines.push(`  observation: ${ins.observation}`)
    lines.push(`  cascade impact: ${ins.cascadeImpact}`)
    lines.push(`  recommendation: ${ins.recommendation}`)
    lines.push('')
  }
  return lines.join('\n')
}

// ── helpers ─────────────────────────────────────────────────────────────────

function pct(part, total) {
  if (!total || total === 0) return '0%'
  return `${(part / total * 100).toFixed(1)}%`
}
