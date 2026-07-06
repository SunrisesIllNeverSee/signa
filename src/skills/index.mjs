/**
 * skills/index.mjs — all signa skills in one module.
 *
 * Each skill is a function: (ctx) => string (or async => string)
 * ctx = { agg, cascade, se, profile, history, settings, raw }
 *
 * The REPL pattern-matches input to a skill and prints the result.
 * When the LLM is added later, it wraps these same skills.
 */

import { cascade as computeCascade, simulate, estimateCost, classify, round } from '../cascade.mjs'
import { steeringEfficiency } from '../taste/se.mjs'
import { loadProfile } from '../taste/profile.mjs'
import { loadHistory, appendHistory } from '../store.mjs'

// ── diagnose ────────────────────────────────────────────────────────────────

export async function skillDiagnose(ctx) {
  const { agg, cas } = ctx
  if (!cas || cas.yield === null) {
    return 'No cascade data yet. Run `scan` first to read your logs.'
  }
  const lines = []
  lines.push('═══ DIAGNOSE ═══')
  lines.push(`Class: ${cas.class}  ·  Υ ${cas.yield.toLocaleString()}  ·  SNR ${cas.snr}  ·  Leverage ${cas.leverage}×  ·  Velocity ${cas.velocity}`)
  lines.push('')
  lines.push('Pillars:')
  const p = cas.pillars
  lines.push(`  input:        ${fmt(p.input)} (${pct(p.input, p.total)} of total)`)
  lines.push(`  output:       ${fmt(p.output)} (${pct(p.output, p.total)} of total)`)
  lines.push(`  cacheCreate:  ${fmt(p.cacheCreate)} (${pct(p.cacheCreate, p.total)} of total)`)
  lines.push(`  cacheRead:    ${fmt(p.cacheRead)} (${pct(p.cacheRead, p.total)} of total)`)
  lines.push('')

  // Diagnose weak pillars
  const issues = []
  if (cas.leverage !== null && cas.leverage < 10) {
    issues.push(`Leverage ${cas.leverage}× is LOW — you're not reusing enough context. Increase cache reads by loading prior context instead of re-typing.`)
  }
  if (cas.velocity !== null && cas.velocity < 0.5) {
    issues.push(`Velocity ${cas.velocity} is LOW — you're producing less output per unit of fresh input. Let the agent generate more before steering.`)
  }
  if (cas.snr !== null && cas.snr < 0.5) {
    issues.push(`SNR ${cas.snr} is LOW — too much of your token flow is fresh input (instruction). Compress your prompts or lean on cache.`)
  }
  if (pct(p.input, p.total) > 0.1) {
    issues.push(`Fresh input is ${pct(p.input, p.total)} of total tokens — that's high. The cascade rewards cache reuse over fresh instruction.`)
  }
  if (cas.leverage !== null && cas.leverage > 100 && cas.velocity !== null && cas.velocity < 1) {
    issues.push(`High leverage (${cas.leverage}×) but low velocity (${cas.velocity}) — you're hoarding context but not generating enough output. Push the agent to produce more.`)
  }

  if (issues.length > 0) {
    lines.push('Issues found:')
    for (const issue of issues) lines.push(`  ⚠ ${issue}`)
  } else {
    lines.push('No major issues — your cascade is well-balanced.')
  }

  // Steering
  const se = ctx.se
  if (se && se.total > 0) {
    lines.push('')
    lines.push(`Steering Efficiency: ${se.se} (${se.accepted} accepted, ${se.corrected} corrected, ${se.rejected} rejected / ${se.total} turns)`)
    if (se.se < 0.7) {
      lines.push(`  ⚠ SE is below 0.7 — you're correcting the agent too often. Consider feeding your taste profile at session start.`)
    }
  }

  return lines.join('\n')
}

// ── simulate ────────────────────────────────────────────────────────────────

export async function skillSimulate(ctx, args) {
  const { cas } = ctx
  if (!cas) return 'No cascade data. Run `scan` first.'
  const changes = parseSimArgs(args, cas.pillars)
  if (Object.keys(changes).length === 0) {
    return 'Usage: simulate <pillar> <change>\nExamples:\n  simulate cacheRead +50000\n  simulate input -30%\n  simulate output *2'
  }
  const projected = simulate(cas, changes)
  const deltaY = projected.yield !== null && cas.yield !== null
    ? projected.yield - cas.yield
    : null
  const lines = []
  lines.push('═══ SIMULATE ═══')
  lines.push(`Base:    Υ ${cas.yield?.toLocaleString()}  ·  ${cas.class}`)
  lines.push(`Projected: Υ ${projected.yield?.toLocaleString()}  ·  ${projected.class}`)
  if (deltaY !== null) {
    const arrow = deltaY > 0 ? '↑' : deltaY < 0 ? '↓' : '→'
    lines.push(`Delta:   ${arrow} ${Math.abs(deltaY).toLocaleString()} (${pct(deltaY, cas.yield)})`)
    if (cas.class !== projected.class) {
      lines.push(`Class change: ${cas.class} → ${projected.class}`)
    }
  }
  lines.push('')
  lines.push('Projected pillars:')
  lines.push(`  input:       ${fmt(projected.pillars.input)}`)
  lines.push(`  output:      ${fmt(projected.pillars.output)}`)
  lines.push(`  cacheCreate: ${fmt(projected.pillars.cacheCreate)}`)
  lines.push(`  cacheRead:   ${fmt(projected.pillars.cacheRead)}`)
  return lines.join('\n')
}

// Parse simulate args with access to base pillars for % calculations
function _parseSimulateArgsWithBase(args, basePillars) {
  const changes = {}
  const text = args.trim()
  if (!text) return changes
  const parts = text.split(/\s+and\s+|\s*,\s*/i)
  for (const part of parts) {
    const m = part.trim().match(/^(input|output|cacheCreate|cacheRead)\s*([+\-*])\s*(\d+(?:%?)?)$/i)
    if (!m) continue
    const [, pillar, op, valStr] = m
    // Normalize to camelCase keys matching cascade.pillars
    const keyMap = { input: 'input', output: 'output', cachecreate: 'cacheCreate', cacheread: 'cacheRead' }
    const key = keyMap[pillar.toLowerCase()] || pillar.toLowerCase()
    const isPercent = valStr.endsWith('%')
    const val = Number(valStr.replace('%', ''))
    const base = basePillars[key] || 0
    if (op === '+') {
      changes[key] = isPercent ? Math.round(base * (1 + val / 100)) : base + val
    } else if (op === '-') {
      changes[key] = isPercent ? Math.round(base * (1 - val / 100)) : Math.max(0, base - val)
    } else if (op === '*') {
      changes[key] = Math.round(base * val)
    }
  }
  return changes
}

// ── suggest ─────────────────────────────────────────────────────────────────

export async function skillSuggest(ctx) {
  const { cas } = ctx
  if (!cas) return 'No cascade data. Run `scan` first.'
  const suggestions = []
  const p = cas.pillars

  // Suggestion 1: increase cache reads
  if (cas.leverage !== null && cas.leverage < 50) {
    const target = p.input * 50
    const needed = target - p.cacheRead
    const proj = simulate(cas, { cacheRead: target })
    suggestions.push({
      title: `Increase cache reads by ${fmt(needed)} (→ ${fmt(target)})`,
      impact: `Υ ${cas.yield?.toLocaleString()} → ${proj.yield?.toLocaleString()} (${pct(proj.yield - cas.yield, cas.yield)} gain)`,
      effort: 'medium',
      how: 'Load prior context with @file references or --resume instead of re-typing. Each cache read is ~10× cheaper than fresh input.',
    })
  }

  // Suggestion 2: reduce fresh input
  if (pct(p.input, p.total) > 0.05) {
    const target = Math.round(p.input * 0.5)
    const proj = simulate(cas, { input: target })
    suggestions.push({
      title: `Cut fresh input by 50% (→ ${fmt(target)})`,
      impact: `Υ ${cas.yield?.toLocaleString()} → ${proj.yield?.toLocaleString()} (${pct(proj.yield - cas.yield, cas.yield)} gain)`,
      effort: 'low',
      how: 'Compress your prompts. Reference files instead of pasting code. Use shorter directives. The agent can read the file itself.',
    })
  }

  // Suggestion 3: increase output
  if (cas.velocity !== null && cas.velocity < 2) {
    const target = p.input * 2
    const needed = target - p.output
    const proj = simulate(cas, { output: target })
    suggestions.push({
      title: `Increase output by ${fmt(needed)} (→ ${fmt(target)})`,
      impact: `Υ ${cas.yield?.toLocaleString()} → ${proj.yield?.toLocaleString()} (${pct(proj.yield - cas.yield, cas.yield)} gain)`,
      effort: 'medium',
      how: 'Let the agent generate more before steering. Ask for complete implementations instead of incremental pieces. Each correction loop costs input.',
    })
  }

  // Suggestion 4: taste profile feedback
  if (ctx.se && ctx.se.se < 0.8) {
    suggestions.push({
      title: 'Feed your taste profile at session start',
      impact: `SE ${ctx.se.se} → est. 0.85+ (fewer correction loops = lower input = higher Υ)`,
      effort: 'low',
      how: 'Run `signa taste` to generate your profile, then inject it into your agent\'s context at session start. The profile tells the agent your preferences upfront.',
    })
  }

  if (suggestions.length === 0) {
    return '═══ SUGGEST ═══\n\nNo suggestions — your cascade is well-optimized. Keep doing what you\'re doing.'
  }

  const lines = ['═══ SUGGEST ═══', '']
  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i]
    lines.push(`${i + 1}. ${s.title}`)
    lines.push(`   impact: ${s.impact}`)
    lines.push(`   effort: ${s.effort}`)
    lines.push(`   how:    ${s.how}`)
    lines.push('')
  }
  return lines.join('\n')
}

// ── track ───────────────────────────────────────────────────────────────────

export async function skillTrack(ctx) {
  const history = await loadHistory()
  if (history.length === 0) {
    return '═══ TRACK ═══\n\nNo history yet. Run `scan` to record your first data point.'
  }
  const lines = ['═══ TRACK ═══', '']
  lines.push(`${history.length} data points:`)
  lines.push('')
  // Show last 10
  const recent = history.slice(-10)
  for (const h of recent) {
    const date = h.ts?.slice(0, 10) || '?'
    const y = h.cascade?.yield?.toLocaleString() || '—'
    const cls = h.cascade?.class || '—'
    const se = h.se?.se ?? '—'
    lines.push(`  ${date}  Υ ${y}  ·  ${cls}  ·  SE ${se}`)
  }
  if (history.length > 10) {
    lines.push(`  ... (${history.length - 10} earlier)`)
  }
  // Trend
  if (history.length >= 2) {
    const first = history[0].cascade?.yield
    const last = history[history.length - 1].cascade?.yield
    if (first != null && last != null) {
      const trend = last > first ? '↑ improving' : last < first ? '↓ declining' : '→ flat'
      lines.push('')
      lines.push(`Trend: ${trend} (Υ ${first.toLocaleString()} → ${last.toLocaleString()})`)
    }
  }
  return lines.join('\n')
}

// ── taste ───────────────────────────────────────────────────────────────────

export async function skillTaste(ctx) {
  const profile = await loadProfile()
  if (!profile) {
    return '═══ TASTE ═══\n\nNo taste profile yet. Run `scan` to generate one from your session logs.'
  }
  const lines = ['═══ TASTE PROFILE ═══', '']
  lines.push(`Operator: ${profile.operator}  ·  Generated: ${profile.generatedAt?.slice(0, 10)}`)
  lines.push(`Sessions analyzed: ${profile.sessionsAnalyzed}  ·  Tool uses: ${profile.totalToolUses}  ·  Edits: ${profile.totalEdits}`)
  lines.push('')
  lines.push(`Steering Efficiency: ${profile.steeringEfficiency}  ·  Acceptance: ${profile.acceptanceRate}`)
  lines.push('')
  lines.push('Design preferences:')
  for (const d of profile.preferences.design) lines.push(`  · ${d}`)
  lines.push('')
  lines.push('Code preferences:')
  for (const c of profile.preferences.code) lines.push(`  · ${c}`)
  lines.push('')
  lines.push('Workflow preferences:')
  for (const w of profile.preferences.workflow) lines.push(`  · ${w}`)
  lines.push('')
  if (profile.correctionPatterns.length > 0) {
    lines.push('Top iterated files:')
    for (const cp of profile.correctionPatterns.slice(0, 5)) {
      lines.push(`  · ${cp.file}: ${cp.editCount} edits, ${cp.correctionLoops} loops${cp.converging ? ' (converging)' : ''} [${cp.category}]`)
    }
  }
  return lines.join('\n')
}

// ── goal ────────────────────────────────────────────────────────────────────

export async function skillGoal(ctx, args) {
  const { cas } = ctx
  if (!cas) return 'No cascade data. Run `scan` first.'
  const targetClass = (args.trim() || 'TRANSMITTER').toUpperCase()
  const thresholds = {
    TRANSMITTER: 5000,
    'ARCHITECT+': 1000,
    ARCHITECT: 500,
    POWER: 100,
    SIGNAL: 10,
    BURNER: 1,
  }
  const target = thresholds[targetClass]
  if (!target) return `Unknown class. Options: ${Object.keys(thresholds).join(', ')}`
  if (cas.yield >= target) {
    return `═══ GOAL ═══\n\nYou're already ${targetClass} (Υ ${cas.yield.toLocaleString()} ≥ ${target.toLocaleString()}). Set a higher goal.`
  }
  const gap = target - cas.yield
  const lines = ['═══ GOAL ═══', '']
  lines.push(`Target: ${targetClass} (Υ ≥ ${target.toLocaleString()})`)
  lines.push(`Current: Υ ${cas.yield.toLocaleString()}  ·  ${cas.class}`)
  lines.push(`Gap: ${gap.toLocaleString()} (${pct(gap, cas.yield)} to close)`)
  lines.push('')
  lines.push('Paths to close the gap:')
  // Path 1: increase cache reads
  const crNeeded = Math.ceil(cas.pillars.input * Math.sqrt(target / cas.yield) - cas.pillars.cacheRead)
  if (crNeeded > 0) {
    const proj = simulate(cas, { cacheRead: cas.pillars.cacheRead + crNeeded })
    lines.push(`  1. Increase cache reads by ${fmt(crNeeded)} → Υ ${proj.yield?.toLocaleString()}`)
  }
  // Path 2: reduce input
  const iNeeded = Math.ceil(cas.pillars.input * Math.sqrt(cas.yield / target))
  if (iNeeded < cas.pillars.input) {
    const proj = simulate(cas, { input: iNeeded })
    lines.push(`  2. Cut fresh input to ${fmt(iNeeded)} (-${pct(cas.pillars.input - iNeeded, cas.pillars.input)}) → Υ ${proj.yield?.toLocaleString()}`)
  }
  // Path 3: increase output
  const oNeeded = Math.ceil(cas.pillars.output * (target / cas.yield))
  if (oNeeded > cas.pillars.output) {
    const proj = simulate(cas, { output: oNeeded })
    lines.push(`  3. Increase output to ${fmt(oNeeded)} (+${pct(oNeeded - cas.pillars.output, cas.pillars.output)}) → Υ ${proj.yield?.toLocaleString()}`)
  }
  return lines.join('\n')
}

// ── cost ────────────────────────────────────────────────────────────────────

export async function skillCost(ctx) {
  const { cas } = ctx
  if (!cas) return 'No cascade data. Run `scan` first.'
  const cost = estimateCost(cas.pillars)
  const lines = ['═══ COST ═══', '']
  lines.push(`Input:       $${cost.input.toFixed(2)}`)
  lines.push(`Output:      $${cost.output.toFixed(2)}`)
  lines.push(`Cache read:  $${cost.cacheRead.toFixed(2)}`)
  lines.push(`Cache create: $${cost.cacheCreate.toFixed(2)}`)
  lines.push(`─────────────────`)
  lines.push(`Total:       $${cost.total().toFixed(2)}`)
  lines.push('')
  lines.push(`Cache savings: $${cost.cacheSavings.toFixed(2)} (what you saved vs re-reading fresh)`)
  if (cas.leverage > 10) {
    lines.push(`Your ${cas.leverage}× cache leverage saved you ~$${(cost.cacheSavings - cost.cacheRead).toFixed(2)} net.`)
  }
  return lines.join('\n')
}

// ── anomaly ─────────────────────────────────────────────────────────────────

export async function skillAnomaly(ctx) {
  const history = await loadHistory()
  if (history.length < 3) {
    return '═══ ANOMALY ═══\n\nNot enough history (need 3+ data points). Run `scan` a few times.'
  }
  const lines = ['═══ ANOMALY ═══', '']
  const yields = history.map(h => h.cascade?.yield).filter(y => y != null)
  if (yields.length < 3) return 'Not enough yield data.'
  // Detect drops > 20%
  const anomalies = []
  for (let i = 1; i < yields.length; i++) {
    const prev = yields[i - 1]
    const curr = yields[i]
    const change = (curr - prev) / prev
    if (change < -0.2) {
      anomalies.push({
        date: history[i].ts?.slice(0, 10),
        from: prev.toLocaleString(),
        to: curr.toLocaleString(),
        drop: pct(change, 1).replace('-', ''),
      })
    }
  }
  if (anomalies.length === 0) {
    lines.push('No anomalies detected — your cascade is stable.')
  } else {
    lines.push(`${anomalies.length} anomaly(ies) detected:`)
    for (const a of anomalies) {
      lines.push(`  ⚠ ${a.date}: Υ ${a.from} → ${a.to} (dropped ${a.drop})`)
    }
  }
  return lines.join('\n')
}

// ── self-improve ────────────────────────────────────────────────────────────

export async function skillSelfImprove(ctx) {
  const diag = await skillDiagnose(ctx)
  const sugg = await skillSuggest(ctx)
  const lines = ['═══ SELF-IMPROVE ═══', '']
  lines.push('─ Diagnosis ─')
  lines.push(diag)
  lines.push('')
  lines.push('─ Recommendations ─')
  lines.push(sugg)
  lines.push('')
  lines.push('─ Next actions ─')
  lines.push('1. Pick the highest-impact suggestion above.')
  lines.push('2. Run `signa simulate` to verify the projected gain.')
  lines.push('3. Apply the change in your next session.')
  lines.push('4. Run `signa scan` after the session to measure the result.')
  lines.push('5. Run `signa track` to see your trend over time.')
  return lines.join('\n')
}

// ── compare ─────────────────────────────────────────────────────────────────

export async function skillCompare(ctx, args) {
  const { cas } = ctx
  if (!cas) return 'No cascade data. Run `scan` first.'
  // Class averages (approximate, from public leaderboard seeds)
  const classAvgs = {
    TRANSMITTER: { yield: 1500, leverage: 500, velocity: 2.5, input: 4_500_000, output: 12_000_000, cacheRead: 2_400_000_000 },
    'ARCHITECT+': { yield: 500, leverage: 300, velocity: 1.5, input: 3_300_000, output: 5_100_000, cacheRead: 983_000_000 },
    ARCHITECT: { yield: 300, leverage: 100, velocity: 1.0, input: 2_000_000, output: 3_000_000, cacheRead: 300_000_000 },
    POWER: { yield: 50, leverage: 30, velocity: 0.5, input: 500_000, output: 1_000_000, cacheRead: 50_000_000 },
  }
  const target = args.trim().toLowerCase() === 'top' ? 'TRANSMITTER'
    : args.trim() ? args.trim().toUpperCase() : 'TRANSMITTER'
  const avg = classAvgs[target] || classAvgs.TRANSMITTER
  const lines = [`═══ COMPARE: you vs ${target} avg ═══`, '']
  lines.push(`         You              ${target} avg        Gap`)
  lines.push(`Υ:       ${fmt(cas.yield)}          ${fmt(avg.yield)}          ${cas.yield > avg.yield ? '+' : ''}${fmt(cas.yield - avg.yield)}`)
  lines.push(`Leverage: ${cas.leverage}×            ${avg.leverage}×            ${cas.leverage > avg.leverage ? '+' : ''}${(cas.leverage - avg.leverage).toFixed(1)}×`)
  lines.push(`Velocity: ${cas.velocity}            ${avg.velocity}            ${(cas.velocity - avg.velocity).toFixed(3)}`)
  lines.push(`Input:    ${fmt(cas.pillars.input)}     ${fmt(avg.input)}     ${fmt(cas.pillars.input - avg.input)}`)
  lines.push(`Output:   ${fmt(cas.pillars.output)}     ${fmt(avg.output)}     ${fmt(cas.pillars.output - avg.output)}`)
  lines.push(`CacheR:   ${fmt(cas.pillars.cacheRead)}  ${fmt(avg.cacheRead)}  ${fmt(cas.pillars.cacheRead - avg.cacheRead)}`)
  lines.push('')
  if (cas.yield < avg.yield) {
    lines.push(`You're ${pct(avg.yield - cas.yield, avg.yield)} below ${target} avg. Run \`signa suggest\` for paths to close the gap.`)
  } else {
    lines.push(`You're above ${target} avg. Nice.`)
  }
  return lines.join('\n')
}

// ── helpers ─────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(Math.round(n))
}

function pct(part, whole) {
  if (!whole || whole === 0) return '0%'
  const p = (part / whole) * 100
  return (p >= 0 ? '' : '') + p.toFixed(1) + '%'
}

// Override parseSimulateArgs to use base pillars from ctx
export function parseSimArgs(args, basePillars) {
  return _parseSimulateArgsWithBase(args, basePillars)
}
