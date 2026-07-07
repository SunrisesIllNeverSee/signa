/**
 * mcp-server.mjs — signa as an MCP server.
 *
 * Exposes signa's skills as MCP tools so the operator's existing agent
 * (Claude Code, Cursor, Windsurf) can call them through MCP. The operator
 * brings their own LLM. signa provides the skills, not the brain.
 *
 * No API costs for us. No Ollama install for them. Works inside the editor
 * where they already are.
 *
 * Usage:
 *   node src/mcp-server.mjs          # starts stdio MCP server
 *   signa --mcp                      # same (via CLI flag)
 *
 * In Claude Code's .mcp.json:
 *   {
 *     "mcpServers": {
 *       "signa": {
 *         "command": "node",
 *         "args": ["/path/to/signa/src/mcp-server.mjs"]
 *       }
 *     }
 *   }
 *
 * All data stays local. The MCP server reads session logs on the same
 * machine. Nothing is transmitted unless the operator explicitly calls
 * signa_submit (which sends only 4 token pillars to the leaderboard).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js'

import { readAllSessions, aggregateSessions } from './logreader.mjs'
import { cascade as computeCascade } from './cascade.mjs'
import { steeringEfficiency, appropriateSteeringIndex } from './taste/se.mjs'
import { extractTaste } from './taste/extractor.mjs'
import { tasteCascadeBridge, formatBridgeReport } from './taste/bridge.mjs'
import { loadProfile } from './taste/profile.mjs'
import { loadHistory, loadSettings } from './store.mjs'
import { simulate, classify, round, estimateCost } from './cascade.mjs'

// Prevent silent crashes — log to stderr (MCP clients read stdout)
process.on('uncaughtException', (err) => {
  process.stderr.write(`[signa-mcp] uncaughtException: ${err?.stack || err}\n`)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  process.stderr.write(`[signa-mcp] unhandledRejection: ${reason?.stack || reason}\n`)
  process.exit(1)
})

// ── Context builder ─────────────────────────────────────────────────────────

let _cachedCtx = null
let _cacheTime = 0
const CACHE_TTL = 60_000 // 1 minute — avoid re-reading logs on every tool call

async function buildCtx(useCache = true) {
  if (useCache && _cachedCtx && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedCtx
  }
  const settings = await loadSettings()
  const sessions = await readAllSessions(undefined, { maxFiles: 500, sinceDays: 30 })
  if (sessions.length === 0) {
    return { settings, agg: null, cas: null, se: null, asi: null, taste: null, profile: null }
  }
  const agg = aggregateSessions(sessions)
  const cas = computeCascade(agg.tokens)
  const se = steeringEfficiency(agg)
  const asi = appropriateSteeringIndex(agg)
  const taste = extractTaste(agg, settings.codename || 'local', { cascade: cas })
  const profile = await loadProfile()
  _cachedCtx = { settings, agg, cas, se, asi, taste, profile, raw: { sessions } }
  _cacheTime = Date.now()
  return _cachedCtx
}

// ── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'signa_scan',
    description: 'Read your AI coding session logs locally, compute the full token cascade (Υ Yield, SNR, Leverage, Velocity, class), Steering Efficiency (SE), Appropriate Steering Index (ASI), and taste profile. Returns a summary of your current cascade state. All data stays local.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'signa_diagnose',
    description: 'Diagnose your token cascade. Shows your class (BASE/POWER/ARCHITECT/TRANSMITTER), pillar breakdown, and flags issues (low leverage, low velocity, high input, etc.). Also shows SE and ASI.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'signa_simulate',
    description: 'Simulate a pillar change and project the resulting Υ Yield and class. Shows the delta from your current state. Example: "increase output by 50000000" or "reduce input by 50%".',
    inputSchema: {
      type: 'object',
      properties: {
        change: {
          type: 'string',
          description: 'The change to simulate. Format: "<pillar> <operator> <value>" where pillar is input/output/cacheRead/cacheCreate, operator is +/-/=, value is a number or percentage. Examples: "output +50000000", "input -50%", "cacheRead =100000000".',
        },
      },
      required: ['change'],
    },
  },
  {
    name: 'signa_suggest',
    description: 'Get ranked recommendations for improving your cascade. Each suggestion shows the action, projected Υ delta, and effort level. Based on your current pillar distribution and class.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'signa_taste',
    description: 'Show your behavioral taste profile — 5 dimensions: steering signature (ASI), iteration fingerprint (which files you iterate on), workflow rhythm (tool distribution, investigate-to-edit ratio), cascade personality (pillar distribution, leverage/velocity tendencies), and correction taxonomy (design vs logic vs config corrections). Everything stays local.',
    inputSchema: {
      type: 'object',
      properties: {
        deepTaste: {
          type: 'boolean',
          description: 'If true, include Layer 3 content-based preference extraction (opt-in, reads message content). Default false.',
        },
      },
    },
  },
  {
    name: 'signa_asi',
    description: 'Show your Appropriate Steering Index (ASI v2) — 8 dimensions measuring whether your interventions were the RIGHT ones, not just how often you accepted. Based on Anthropic autonomy research. Includes acceptance rate, correction precision, intervention timing, reliance slope, over-correction index, and under-steering index. Each dimension reports confidence level.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'signa_bridge',
    description: 'The taste → cascade bridge: coaching insights connecting your behavioral taste profile to your cascade performance. This is the coaching no other tool can give — it requires both the taste profile AND the cascade formula. Returns insights sorted by severity (high/medium/low), each with observation, cascade impact, and recommendation.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'signa_cost',
    description: 'Show your token-to-cost analysis. Computes total cost based on Claude pricing (input, output, cache create, cache read rates). Shows cost breakdown and cache savings (how much you saved by using cache vs fresh input).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'signa_goal',
    description: 'Show the path to a target class. Computes what pillar changes are needed to reach the target class (BASE/POWER/ARCHITECT/ARCHITECT+/TRANSMITTER) from your current state.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          enum: ['BASE', 'POWER', 'ARCHITECT', 'ARCHITECT+', 'TRANSMITTER'],
          description: 'The target class to reach.',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'signa_compare',
    description: 'Compare your cascade against a class average or a specific operator. Shows where you stand relative to the benchmark.',
    inputSchema: {
      type: 'object',
      properties: {
        against: {
          type: 'string',
          description: 'What to compare against: a class name (POWER, ARCHITECT, TRANSMITTER) or "average".',
        },
      },
    },
  },
  {
    name: 'signa_track',
    description: 'Show your cascade metrics over time from local history. Displays trend lines for Υ, SNR, Leverage, Velocity, and class changes across recorded snapshots.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'signa_anomaly',
    description: 'Detect metric drops and anomalies in your cascade history. Pinpoints when a metric dropped and by how much, helping you identify which session caused the change.',
    inputSchema: { type: 'object', properties: {} },
  },
]

// ── Tool dispatcher ─────────────────────────────────────────────────────────

async function callTool(name, args = {}) {
  const ctx = await buildCtx()
  if (!ctx.agg) {
    return { error: 'No session logs found. Run signa scan first or ensure ~/.claude/projects/ has .jsonl files.' }
  }

  switch (name) {
    case 'signa_scan':
      return toolScan(ctx)

    case 'signa_diagnose':
      return toolDiagnose(ctx)

    case 'signa_simulate':
      return toolSimulate(ctx, args.change)

    case 'signa_suggest':
      return toolSuggest(ctx)

    case 'signa_taste':
      return toolTaste(ctx, args.deepTaste)

    case 'signa_asi':
      return toolASI(ctx)

    case 'signa_bridge':
      return toolBridge(ctx)

    case 'signa_cost':
      return toolCost(ctx)

    case 'signa_goal':
      return toolGoal(ctx, args.target)

    case 'signa_compare':
      return toolCompare(ctx, args.against)

    case 'signa_track':
      return toolTrack(ctx)

    case 'signa_anomaly':
      return toolAnomaly(ctx)

    default:
      throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${name}`)
  }
}

// ── Tool implementations ────────────────────────────────────────────────────

function toolScan(ctx) {
  const { agg, cas, se, asi, taste } = ctx
  return {
    summary: `Scanned ${agg.sessionCount} sessions · ${agg.totalToolUses} tool uses · ${agg.totalEdits} edits`,
    cascade: {
      class: cas.class,
      yield: cas.yield,
      snr: cas.snr,
      leverage: cas.leverage,
      velocity: cas.velocity,
    },
    pillars: cas.pillars,
    steering: {
      se: se.se,
      asi: asi.asi,
      acceptanceRate: se.acceptanceRate,
      correctionRate: se.correctionRate,
      rejectionRate: se.rejectionRate,
    },
    tasteProfile: taste ? {
      iterationConcentration: taste.iterationConcentration,
      workflowStyle: taste.workflowRhythm?.style,
      cascadePersonality: taste.cascadePersonality?.types,
    } : null,
    note: 'All data computed locally. Nothing transmitted.',
  }
}

function toolDiagnose(ctx) {
  const { cas, se, asi, agg } = ctx
  const issues = []
  if (cas.leverage !== null && cas.leverage < 10) {
    issues.push({ severity: 'high', issue: `Leverage ${cas.leverage}× is LOW — not reusing enough context. Increase cache reads by loading prior context instead of re-typing.` })
  }
  if (cas.velocity !== null && cas.velocity < 0.5) {
    issues.push({ severity: 'high', issue: `Velocity ${cas.velocity} is LOW — producing less output per unit of fresh input. Let the agent generate more before steering.` })
  }
  if (cas.snr !== null && cas.snr < 0.5) {
    issues.push({ severity: 'medium', issue: `SNR ${cas.snr} is LOW — too much fresh input. Compress prompts or lean on cache.` })
  }
  const p = cas.pillars
  if (pct(p.input, p.total) > 0.1) {
    issues.push({ severity: 'medium', issue: `Fresh input is ${pct(p.input, p.total)} of total — high. The cascade rewards cache reuse over fresh instruction.` })
  }
  if (cas.leverage > 100 && cas.velocity < 1) {
    issues.push({ severity: 'high', issue: `High leverage (${cas.leverage}×) but low velocity (${cas.velocity}) — hoarding context but not generating enough output. Push the agent to produce more.` })
  }
  if (asi.asi !== null && asi.asi < 0.5) {
    issues.push({ severity: 'medium', issue: `ASI ${asi.asi} is low — your steering may be over-accepting or over-correcting. Check the ASI dimensions for specifics.` })
  }
  return {
    class: cas.class,
    yield: cas.yield,
    snr: cas.snr,
    leverage: cas.leverage,
    velocity: cas.velocity,
    pillars: cas.pillars,
    steering: { se: se.se, asi: asi.asi },
    issues,
    sessionCount: agg.sessionCount,
  }
}

function toolSimulate(ctx, changeStr) {
  const { cas } = ctx
  if (!changeStr) return { error: 'Missing "change" parameter. Example: "output +50000000" or "input -50%".' }
  // Parse the change string: "<pillar> <operator> <value>"
  // pillar: input/output/cacheRead/cacheCreate
  // operator: +/-/=
  // value: number (absolute) or number% (percentage of current)
  const match = changeStr.match(/^(input|output|cacheRead|cacheCreate)\s*([+\-=])\s*([\d.]+)(%?)$/i)
  if (!match) {
    return { error: `Could not parse change: "${changeStr}". Format: "<pillar> <operator> <value>" e.g. "output +50000000" or "input -50%"` }
  }
  const [, pillar, op, numStr, isPct] = match
  const num = parseFloat(numStr)
  const key = pillar.toLowerCase()
  const current = cas.pillars[key]
  let newVal
  if (isPct) {
    newVal = op === '+' ? current * (1 + num / 100) : op === '-' ? current * (1 - num / 100) : current * (num / 100)
  } else {
    newVal = op === '+' ? current + num : op === '-' ? current - num : num
  }
  newVal = Math.max(0, Math.round(newVal))
  const changes = { [key]: newVal }
  const result = simulate(cas, changes)
  return {
    change: changeStr,
    parsed: { pillar: key, from: current, to: newVal },
    before: { yield: cas.yield, class: cas.class, leverage: cas.leverage, velocity: cas.velocity },
    after: { yield: result.yield, class: result.class, leverage: result.leverage, velocity: result.velocity },
    delta: { yield: Math.round(result.yield - cas.yield), classes: result.class !== cas.class ? `${cas.class} → ${result.class}` : 'no change' },
    newPillars: result.pillars,
  }
}

function toolSuggest(ctx) {
  const { cas, asi, taste } = ctx
  const suggestions = []
  // Leverage suggestions
  if (cas.leverage < 10) {
    suggestions.push({ action: 'Increase cache reads by loading prior context instead of re-typing', impact: 'Leverage ↑ → Υ ↑', effort: 'low', severity: 'high' })
  }
  // Velocity suggestions
  if (cas.velocity < 1) {
    const targetOutput = cas.pillars.input * 1.5
    const needed = targetOutput - cas.pillars.output
    if (needed > 0) {
      const simResult = simulate(cas, { output: cas.pillars.output + needed })
      suggestions.push({ action: `Increase output by ${fmt(needed)} tokens — ask the agent for complete implementations, not pieces`, impact: `Velocity ↑ → Υ ${Math.round(simResult.yield)} (from ${cas.yield})`, effort: 'medium', severity: 'high' })
    }
  }
  // Input suggestions
  if (pct(cas.pillars.input, cas.pillars.total) > 0.05) {
    suggestions.push({ action: 'Compress prompts — reference prior context instead of re-explaining', impact: 'Input ↓ → Υ ↑ (input is squared in denominator)', effort: 'low', severity: 'medium' })
  }
  // ASI suggestions
  if (asi.asi !== null && asi.asi < 0.7) {
    const overCorr = asi.dimensions.overCorrectionIndex
    if (overCorr && overCorr.value > 0.3) {
      suggestions.push({ action: 'Reduce unnecessary corrections — before correcting, ask if you\'re fixing or adding. If adding, let the agent do it next turn.', impact: 'Input ↓ → Υ ↑', effort: 'low', severity: 'medium' })
    }
    const timing = asi.dimensions.interventionTiming
    if (timing && timing.value !== null && timing.value < 5) {
      suggestions.push({ action: 'Let the agent finish a complete unit of work before intervening. Batch your feedback.', impact: 'Fewer context resets → cache ↑ → Υ ↑', effort: 'low', severity: 'low' })
    }
  }
  // Taste → cascade bridge insights
  if (taste) {
    const bridge = tasteCascadeBridge(taste, cas)
    for (const ins of bridge.filter(i => i.severity === 'high').slice(0, 2)) {
      suggestions.push({ action: ins.recommendation, impact: ins.cascadeImpact, effort: 'medium', severity: ins.severity, dimension: ins.dimension })
    }
  }
  // Sort by severity
  const order = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => (order[a.severity] || 3) - (order[b.severity] || 3))
  return { currentClass: cas.class, currentYield: cas.yield, suggestions }
}

function toolTaste(ctx, deepTaste) {
  const { taste } = ctx
  if (!taste) return { error: 'No taste profile available. Run signa_scan first.' }
  if (deepTaste && !taste.deepTaste) {
    // Re-extract with deep taste enabled
    const { agg, cas, settings } = ctx
    const deepTasteProfile = extractTaste(agg, settings.codename || 'local', { deepTaste: true, cascade: cas })
    return {
      ...taste,
      deepTaste: deepTasteProfile.deepTaste,
      note: 'Deep taste enabled — Layer 3 content extraction is opt-in. Raw content is not retained. Everything stays local.',
    }
  }
  return taste
}

function toolASI(ctx) {
  const { asi } = ctx
  if (!asi) return { error: 'No ASI data available. Run signa_scan first.' }
  return asi
}

function toolBridge(ctx) {
  const { taste, cas } = ctx
  if (!taste || !cas) return { error: 'No taste or cascade data available. Run signa_scan first.' }
  const insights = tasteCascadeBridge(taste, cas)
  return {
    insights,
    formatted: formatBridgeReport(insights),
    insightCount: insights.length,
    bySeverity: insights.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc }, {}),
  }
}

function toolCost(ctx) {
  const { agg, cas } = ctx
  const cost = estimateCost(agg.tokens)
  return {
    totalCost: cost.total(),
    breakdown: {
      input: cost.input,
      output: cost.output,
      cacheRead: cost.cacheRead,
      cacheCreate: cost.cacheCreate,
    },
    cacheSavings: cost.cacheSavings,
    tokens: agg.tokens,
    note: 'Costs computed using Claude pricing. Cache savings = what you would have paid without cache (cacheRead priced as fresh input).',
  }
}

function toolGoal(ctx, target) {
  const { cas } = ctx
  const classThresholds = { BASE: 0, POWER: 100, ARCHITECT: 1000, 'ARCHITECT+': 5000, TRANSMITTER: 15000 }
  const targetY = classThresholds[target]
  if (targetY === undefined) return { error: `Unknown class: ${target}. Valid: BASE, POWER, ARCHITECT, ARCHITECT+, TRANSMITTER` }
  if (cas.yield >= targetY) {
    return { currentClass: cas.class, targetClass: target, status: 'already_at_or_above_target', currentYield: cas.yield, targetYield: targetY }
  }
  // Compute what's needed: easiest lever is output increase
  // Υ = (cacheRead × output) / input²
  // Solve for output: output = (Υ × input²) / cacheRead
  const neededOutput = Math.ceil((targetY * cas.pillars.input ** 2) / cas.pillars.cacheRead)
  const outputDelta = neededOutput - cas.pillars.output
  // Also compute via input reduction
  const neededInput = Math.sqrt((cas.pillars.cacheRead * cas.pillars.output) / targetY)
  const inputDelta = cas.pillars.input - neededInput
  return {
    currentClass: cas.class,
    targetClass: target,
    currentYield: cas.yield,
    targetYield: targetY,
    gap: targetY - cas.yield,
    paths: [
      { action: `Increase output by ${fmt(outputDelta)} tokens`, from: cas.pillars.output, to: neededOutput, resultYield: targetY, effort: 'medium' },
      { action: `Reduce input by ${fmt(inputDelta)} tokens (${pct(inputDelta, cas.pillars.input)} reduction)`, from: cas.pillars.input, to: Math.ceil(neededInput), resultYield: targetY, effort: 'high' },
      { action: 'Combination: increase output 50% + reduce input 20%', resultYield: simulate(cas, { output: cas.pillars.output * 1.5, input: cas.pillars.input * 0.8 }).yield, effort: 'medium' },
    ],
  }
}

function toolCompare(ctx, against) {
  const { cas } = ctx
  // Class averages (approximate, from observed data)
  const benchmarks = {
    BASE: { yield: 50, leverage: 5, velocity: 0.5 },
    POWER: { yield: 300, leverage: 100, velocity: 1.0 },
    ARCHITECT: { yield: 2000, leverage: 200, velocity: 1.5 },
    'ARCHITECT+': { yield: 8000, leverage: 300, velocity: 2.0 },
    TRANSMITTER: { yield: 18000, leverage: 500, velocity: 3.0 },
    average: { yield: 200, leverage: 50, velocity: 0.8 },
  }
  const bench = benchmarks[against || 'average'] || benchmarks.average
  return {
    you: { class: cas.class, yield: cas.yield, leverage: cas.leverage, velocity: cas.velocity },
    benchmark: { label: against || 'average', ...bench },
    delta: {
      yield: cas.yield - bench.yield,
      yieldPct: `${Math.round(((cas.yield - bench.yield) / bench.yield) * 100)}%`,
      leverage: cas.leverage - bench.leverage,
      velocity: cas.velocity - bench.velocity,
    },
    verdict: cas.yield > bench.yield ? 'above benchmark' : 'below benchmark',
  }
}

async function toolTrack(ctx) {
  const history = await loadHistory()
  if (history.length === 0) return { error: 'No history yet. Run signa_scan to record your first snapshot.' }
  return {
    snapshots: history.slice(-20).map(h => ({
      date: h.ts,
      class: h.cascade?.class,
      yield: h.cascade?.yield,
      leverage: h.cascade?.leverage,
      velocity: h.cascade?.velocity,
      se: h.se?.se,
    })),
    trend: history.length > 1 ? {
      yieldDelta: history[history.length - 1].cascade?.yield - history[0].cascade?.yield,
      classProgression: history.map(h => h.cascade?.class).filter(Boolean),
    } : null,
  }
}

async function toolAnomaly(ctx) {
  const history = await loadHistory()
  if (history.length < 2) return { error: 'Need at least 2 snapshots to detect anomalies.' }
  const anomalies = []
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].cascade
    const curr = history[i].cascade
    if (!prev || !curr) continue
    const yieldDelta = curr.yield - prev.yield
    if (Math.abs(yieldDelta) > prev.yield * 0.2) {
      anomalies.push({
        date: history[i].ts,
        metric: 'yield',
        delta: yieldDelta,
        deltaPct: `${Math.round((yieldDelta / prev.yield) * 100)}%`,
        from: prev.yield,
        to: curr.yield,
        severity: yieldDelta < 0 ? 'drop' : 'spike',
      })
    }
  }
  return { anomalies, snapshotCount: history.length }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(Math.round(n))
}

function pct(part, whole) {
  if (!whole || whole === 0) return '0%'
  return ((part / whole) * 100).toFixed(1) + '%'
}

// ── Server startup ──────────────────────────────────────────────────────────

async function startServer() {
  const server = new Server(
    { name: 'signa', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (!TOOLS.some(t => t.name === req.params.name)) {
      throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${req.params.name}`)
    }
    try {
      const out = await callTool(req.params.name, req.params.arguments)
      return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] }
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write('[signa-mcp] server started (stdio)\n')
}

// Run if called directly
const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  startServer().catch(err => {
    process.stderr.write(`[signa-mcp] fatal: ${err?.stack || err}\n`)
    process.exit(1)
  })
}

export { startServer, TOOLS, callTool }
