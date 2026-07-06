/**
 * taste/se.mjs — Steering Efficiency computation.
 *
 * SE = (sum of turn outcome weights) / (total turns)
 *
 * Outcomes per turn:
 *   Accepted  = 1.0  (assistant output followed by new context, not a re-edit of same file)
 *   Corrected = 0.5  (user re-edits the same file the assistant edited, within 2 turns)
 *   Rejected  = 0.0  (tool_result with rejection pattern)
 *
 * Range: [0, 1]. Higher = operator steers well.
 */

import { aggregateSessions } from '../logreader.mjs'

/** Compute SE from aggregated sessions. */
export function steeringEfficiency(agg) {
  const turns = agg.turns || []
  if (turns.length === 0) return { se: 0, accepted: 0, corrected: 0, rejected: 0, total: 0 }
  let accepted = 0, corrected = 0, rejected = 0
  for (const turn of turns) {
    if (turn.rejected) { rejected++; continue }
    if (turn.corrected) { corrected++; continue }
    accepted++
  }
  const total = turns.length
  const weight = (1.0 * accepted + 0.5 * corrected + 0.0 * rejected) / total
  return {
    se: round(weight, 4),
    acceptanceRate: round(accepted / total, 4),
    correctionRate: round(corrected / total, 4),
    rejectionRate: round(rejected / total, 4),
    accepted,
    corrected,
    rejected,
    total,
  }
}

const round = (n, d) => Number(n.toFixed(d))
