/**
 * cascade.mjs — pure SigRank yield cascade (no deps).
 * Copied from sigrank-mcp/cascade.mjs — the canonical math.
 * Υ = (cacheRead × output) / input² = leverage × velocity.
 */

export const round = (n, d) => (Number.isFinite(n) ? Number(n.toFixed(d)) : null)

// Class thresholds (approximate, from public leaderboard boundaries).
// The exact RS.05 values are server-only; these are the visible breakpoints.
const CLASS_THRESHOLDS = [
  { min: 5000, class: 'TRANSMITTER' },
  { min: 1000, class: 'ARCHITECT+' },
  { min: 500, class: 'ARCHITECT' },
  { min: 100, class: 'POWER' },
  { min: 10, class: 'SIGNAL' },
  { min: 1, class: 'BURNER' },
  { min: 0, class: 'STATIC' },
]

export function classify(yield_, dev10x) {
  if (yield_ === null || !Number.isFinite(yield_)) return 'UNRANKED'
  for (const t of CLASS_THRESHOLDS) {
    if (yield_ >= t.min) return t.class
  }
  return 'STATIC'
}

/** The four raw token pillars → the cascade. */
export function cascade({ input, output, cacheCreate, cacheRead }) {
  const i = Number(input), o = Number(output), cw = Number(cacheCreate), cr = Number(cacheRead)
  const total = i + o + cw + cr
  const warnings = []

  const snrDenom = i + o
  const snr = snrDenom > 0 ? o / snrDenom : null
  if (snr === null) warnings.push('snr_undefined: input+output=0')

  const velocity = i > 0 ? o / i : null
  if (velocity === null) warnings.push('velocity_undefined: input=0')

  const leverage = i > 0 ? cr / i : null
  if (leverage === null) warnings.push('leverage_undefined: input=0')

  const yield_ = leverage !== null && velocity !== null ? leverage * velocity : null
  if (yield_ === null && !warnings.some((w) => w.startsWith('yield')))
    warnings.push('yield_undefined: requires input>0')

  let dev10x = null
  if (i > 0 && o > 0 && cw > 0 && cr > 0) {
    dev10x = Math.log10((o / i) * (cw / o) * (cr / cw))
  } else {
    warnings.push('dev10x_undefined: requires all four pillars > 0')
  }

  return {
    pillars: { input: i, output: o, cacheCreate: cw, cacheRead: cr, total },
    yield: round(yield_, 2),
    snr: round(snr, 4),
    leverage: round(leverage, 1),
    velocity: round(velocity, 3),
    dev10x: round(dev10x, 2),
    class: classify(yield_, dev10x),
    warnings,
  }
}

/** Simulate a pillar change and return the projected cascade. */
export function simulate(base, changes) {
  const next = {
    input: changes.input ?? base.pillars.input,
    output: changes.output ?? base.pillars.output,
    cacheCreate: changes.cacheCreate ?? base.pillars.cacheCreate,
    cacheRead: changes.cacheRead ?? base.pillars.cacheRead,
  }
  return cascade(next)
}

// Claude pricing (per 1M tokens, as of 2026-07). Used by the cost skill.
export const CLAUDE_PRICING = {
  'claude-opus-4': { input: 15, output: 75, cacheRead: 1.5, cacheCreate: 18.75 },
  'claude-opus-4-5': { input: 15, output: 75, cacheRead: 1.5, cacheCreate: 18.75 },
  'claude-sonnet-4': { input: 3, output: 15, cacheRead: 0.3, cacheCreate: 3.75 },
  'claude-sonnet-4-5': { input: 3, output: 15, cacheRead: 0.3, cacheCreate: 3.75 },
  'claude-haiku-4': { input: 0.8, output: 4, cacheRead: 0.08, cacheCreate: 1 },
  default: { input: 3, output: 15, cacheRead: 0.3, cacheCreate: 3.75 },
}

export function estimateCost(pillars, model = 'default') {
  const p = CLAUDE_PRICING[model] || CLAUDE_PRICING.default
  const cost = (n, rate) => (n / 1_000_000) * rate
  return {
    input: cost(pillars.input, p.input),
    output: cost(pillars.output, p.output),
    cacheRead: cost(pillars.cacheRead, p.cacheRead),
    cacheCreate: cost(pillars.cacheCreate, p.cacheCreate),
    total() {
      return this.input + this.output + this.cacheRead + this.cacheCreate
    },
    cacheSavings: cost(pillars.cacheRead, p.input - p.cacheRead), // what you saved vs re-reading fresh
  }
}
