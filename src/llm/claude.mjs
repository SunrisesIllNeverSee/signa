/**
 * llm/claude.mjs — Claude API adapter for signa's REPL.
 *
 * The operator brings their own API key. signa provides the skills (the
 * brain), the LLM wraps them (picks which to call, formats output
 * conversationally). The LLM is the mouth; the skills are the brain.
 *
 * Authentication:
 *   Set ANTHROPIC_API_KEY in your environment, or in ~/.signa/settings.json:
 *   { "llm": "claude", "llmApiKey": "sk-ant-..." }
 *
 * Privacy:
 *   When the LLM is enabled, signa sends a SUMMARY of your cascade data
 *   (class, yield, pillars, ASI dimensions, taste profile dimensions) to
 *   Claude for conversational formatting. It does NOT send your session
 *   logs, code, or message content. Only the computed metrics.
 *
 *   If you want zero data leaving your machine, keep llm: "stub" (default).
 *   The stub mode uses skill pattern-matching only — no API calls.
 *
 * Architecture:
 *   1. User types something in the REPL
 *   2. If pattern-matching catches it → skill runs directly (no LLM needed)
 *   3. If pattern-matching misses → LLM gets the input + a summary of ctx
 *   4. LLM decides which skill to call (or answers directly)
 *   5. Skill output is formatted conversationally by the LLM
 */

import { skillDiagnose, skillSimulate, skillSuggest, skillTrack,
  skillTaste, skillGoal, skillCost, skillAnomaly, skillSelfImprove, skillCompare,
} from '../skills/index.mjs'
import { tasteCascadeBridge, formatBridgeReport } from '../taste/bridge.mjs'
import { appropriateSteeringIndex } from '../taste/se.mjs'

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-sonnet-4-5-20250514' // cost-effective for coaching
const API_VERSION = '2023-06-01'

/** Check if Claude LLM is configured. */
export function hasLLM(settings) {
  if (!settings || !settings.llm || settings.llm === 'stub') return false
  if (settings.llm === 'claude') return true
  // Also check env var directly
  return !!getApiKey(settings)
}

/** Get the API key from settings or env. */
function getApiKey(settings) {
  return settings?.llmApiKey || process.env.ANTHROPIC_API_KEY || null
}

/** Build a context summary for the LLM (no raw logs, no code, no message content). */
function buildContextSummary(ctx) {
  const { cas, se, asi, taste, profile, settings } = ctx
  const parts = []

  if (cas) {
    parts.push(`CASCADE: class=${cas.class}, yield=${cas.yield}, snr=${cas.snr}, leverage=${cas.leverage}, velocity=${cas.velocity}`)
    parts.push(`PILLARS: input=${cas.pillars.input}, output=${cas.pillars.output}, cacheCreate=${cas.pillars.cacheCreate}, cacheRead=${cas.pillars.cacheRead}`)
  }
  if (se) {
    parts.push(`STEERING: SE=${se.se}, acceptanceRate=${se.acceptanceRate}, correctionRate=${se.correctionRate}, rejectionRate=${se.rejectionRate}`)
  }
  if (asi) {
    parts.push(`ASI: composite=${asi.asi}, timing=${asi.dimensions?.interventionTiming?.label}, reliance=${asi.dimensions?.relianceSlope?.trend}, overCorrection=${asi.dimensions?.overCorrectionIndex?.value}, underSteering=${asi.dimensions?.underSteeringIndex?.value}`)
  }
  if (taste) {
    parts.push(`TASTE: concentration=${taste.iterationConcentration}, workflow=${taste.workflowRhythm?.style}, personality=${taste.cascadePersonality?.types?.join(',')}`)
    if (taste.correctionTaxonomy?.length > 0) {
      parts.push(`CORRECTION_TAXONOMY: ${taste.correctionTaxonomy.map(t => `${t.category}(${t.totalLoops} loops)`).join(', ')}`)
    }
  }

  return parts.join('\n')
}

/** Build the system prompt for the LLM. */
function buildSystemPrompt(ctx) {
  return `You are signa, an interactive token-cascade coaching agent. You help AI coding operators understand and improve their token cascade architecture.

You have access to the operator's computed metrics (cascade, steering efficiency, taste profile). You do NOT have access to their session logs, code, or message content — only the computed summaries.

Your job:
1. Answer questions about their cascade, steering, and taste profile conversationally
2. When they ask for something actionable, call the appropriate skill and format the result
3. Be concise, direct, and specific. Use their actual numbers.
4. Connect insights to the cascade formula: Υ = (cacheRead × output) / input²
5. When recommending changes, show the projected Υ delta

Available skills you can reference:
- diagnose: pillar-level audit + issue detection
- simulate: project Υ/class delta from a pillar change (e.g. "output +50000000" or "input -50%")
- suggest: ranked recommendations with impact
- taste: 5-dimension behavioral taste profile
- asi: 8-dimension Appropriate Steering Index
- bridge: taste → cascade coaching insights
- cost: token-to-cost analysis
- goal: path to a target class (BASE/POWER/ARCHITECT/ARCHITECT+/TRANSMITTER)
- compare: head-to-head vs class benchmark
- track: metrics over time
- anomaly: detect metric drops

The operator's current context:
${buildContextSummary(ctx)}

Keep responses under 200 words unless they ask for detail. Use their actual numbers, not generic advice.`
}

/** Call the Claude API. */
async function callClaude(apiKey, systemPrompt, userMessage) {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Claude API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const text = data?.content?.[0]?.text
  if (!text) throw new Error('Claude API returned no text content')
  return text
}

/** Main entry: respond to user input using the LLM. */
export async function llmRespond(input, ctx) {
  const apiKey = getApiKey(ctx.settings)
  if (!apiKey) {
    return null // no API key, fall back to pattern-matching
  }

  const systemPrompt = buildSystemPrompt(ctx)

  // Check if the input matches a skill we can call directly
  const skillMatch = matchSkillForLLM(input)
  let skillOutput = null
  if (skillMatch) {
    try {
      skillOutput = await runSkill(skillMatch, ctx)
    } catch (e) {
      // Skill failed — let the LLM handle it without skill output
    }
  }

  // Build the user message: include the skill output if we have it
  let userMessage = input
  if (skillOutput) {
    userMessage = `User asked: "${input}"\n\nHere is the raw skill output:\n\n${skillOutput}\n\nPlease format this conversationally and add any insight from the numbers.`
  }

  return await callClaude(apiKey, systemPrompt, userMessage)
}

/** Match input to a skill (for LLM-assisted calls). */
function matchSkillForLLM(input) {
  const lower = input.toLowerCase().trim()
  if (/how am i|how's it going|status|diagnose|audit/.test(lower)) return 'diagnose'
  if (/what should|recommend|suggest|improve|better|next/.test(lower)) return 'suggest'
  if (/taste|preference|style|my profile/.test(lower)) return 'taste'
  if (/steering|asi|how well do i steer/.test(lower)) return 'asi'
  if (/bridge|connect|behavior.*cascade|taste.*cascade/.test(lower)) return 'bridge'
  if (/cost|spend|dollar|money|price/.test(lower)) return 'cost'
  if (/trend|history|over time|improving|declining|track/.test(lower)) return 'track'
  if (/anomaly|drop|weird|did anything/.test(lower)) return 'anomaly'
  if (/compare|vs|versus|benchmark/.test(lower)) return 'compare'
  if (/simulat|what if|project/.test(lower)) return 'simulate'
  if (/goal|target|how do i hit|reach/.test(lower)) return 'goal'
  if (/self.improve|coach|full cycle/.test(lower)) return 'self-improve'
  return null
}

/** Run a skill and return its output. */
async function runSkill(name, ctx) {
  switch (name) {
    case 'diagnose': return await skillDiagnose(ctx)
    case 'suggest': return await skillSuggest(ctx)
    case 'taste': return await skillTaste(ctx)
    case 'asi': {
      const asi = appropriateSteeringIndex(ctx.agg || ctx)
      return JSON.stringify(asi, null, 2)
    }
    case 'bridge': {
      if (!ctx.taste) return 'No taste profile available. Run scan first.'
      const insights = tasteCascadeBridge(ctx.taste, ctx.cas)
      return formatBridgeReport(insights)
    }
    case 'cost': return await skillCost(ctx)
    case 'track': return await skillTrack(ctx)
    case 'anomaly': return await skillAnomaly(ctx)
    case 'compare': return await skillCompare(ctx, '')
    case 'simulate': return await skillSimulate(ctx, '')
    case 'goal': return await skillGoal(ctx, '')
    case 'self-improve': return await skillSelfImprove(ctx)
    default: return null
  }
}

export { buildContextSummary, buildSystemPrompt }
