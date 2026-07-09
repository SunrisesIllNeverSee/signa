/**
 * taste/se.mjs — Steering Efficiency + Appropriate Steering Index (ASI v2).
 *
 * SE v1 (legacy): acceptance rate weighted average.
 *   SE = (1.0×accepted + 0.5×corrected + 0.0×rejected) / total
 *
 * ASI v2: appropriate intervention rate. Measures whether interventions
 * were the RIGHT ones, not just how often you accepted. Based on Anthropic's
 * autonomy research (experienced users interrupt MORE, not less) and the
 * "From Accuracy to Readiness" taxonomy (reliance slope, override frequency,
 * appropriate reliance).
 *
 * ASI dimensions:
 *   1. Acceptance rate     — % turns accepted as-is
 *   2. Correction rate     — % turns corrected
 *   3. Rejection rate      — % turns rejected
 *   4. Correction precision — of corrections, how many were likely needed
 *   5. Intervention timing — how quickly you intervene (tight vs loose)
 *   6. Reliance slope      — how acceptance rate changes over sessions
 *   7. Over-correction index — corrections on files likely already correct
 *   8. Under-steering index  — acceptances that led to downstream corrections
 *
 * Each dimension reports a confidence level (high/medium/low) based on
 * what can be inferred from logs alone.
 *
 * Range: [0, 1]. Higher = operator steers appropriately (not just accepts more).
 */

import { aggregateSessions } from "../logreader.mjs";

// ── SE v1 (legacy, kept for backward compat) ───────────────────────────────

/** Compute SE v1 from aggregated sessions. */
export function steeringEfficiency(agg) {
  const turns = agg.turns || [];
  if (turns.length === 0)
    return { se: 0, accepted: 0, corrected: 0, rejected: 0, total: 0 };
  let accepted = 0,
    corrected = 0,
    rejected = 0;
  for (const turn of turns) {
    if (turn.rejected) {
      rejected++;
      continue;
    }
    if (turn.corrected) {
      corrected++;
      continue;
    }
    accepted++;
  }
  const total = turns.length;
  const weight = (1.0 * accepted + 0.5 * corrected + 0.0 * rejected) / total;
  return {
    se: round(weight, 4),
    acceptanceRate: round(accepted / total, 4),
    correctionRate: round(corrected / total, 4),
    rejectionRate: round(rejected / total, 4),
    accepted,
    corrected,
    rejected,
    total,
  };
}

// ── ASI v2 ─────────────────────────────────────────────────────────────────

/** Compute ASI v2 from aggregated sessions. */
export function appropriateSteeringIndex(agg) {
  const turns = agg.turns || [];
  if (turns.length === 0) return emptyASI();

  // Dimension 1-3: basic rates (high confidence — direct from turn classification)
  let accepted = 0,
    corrected = 0,
    rejected = 0;
  for (const turn of turns) {
    if (turn.rejected) {
      rejected++;
      continue;
    }
    if (turn.corrected) {
      corrected++;
      continue;
    }
    accepted++;
  }
  const total = turns.length;
  const acceptanceRate = accepted / total;
  const correctionRate = corrected / total;
  const rejectionRate = rejected / total;

  // Dimension 4: correction precision (medium confidence)
  // Of corrections, how many were likely needed (vs additive/sequential edits)?
  // Heuristic: a correction is "likely needed" if:
  //   - the assistant's edit had an error in the tool_result, OR
  //   - the user's correction message contains rejection language, OR
  //   - the correction delta is negative (removing/changing agent's output, not adding)
  // A correction is "possibly unnecessary" if:
  //   - the assistant's edit succeeded (no error), AND
  //   - the user's correction has a positive delta (adding content, not fixing), AND
  //   - no rejection language in the user's message
  let correctionsAnalyzed = 0;
  let likelyNeeded = 0;
  let possiblyUnnecessary = 0;
  for (const turn of turns) {
    if (!turn.corrected) continue;
    correctionsAnalyzed++;
    const assistantHadError = turn.assistantMsg?.toolResults?.some(
      (tr) => tr.isError && !isRejection(tr.content),
    );
    const userText = turn.userResponse?.textContent || "";
    const hasRejectionLang = REJECTION_LANG.test(userText);
    const correctionDeltas = turn.correctionDeltas || [];
    const avgCorrectionDelta =
      correctionDeltas.length > 0
        ? correctionDeltas.reduce((a, b) => a + b, 0) / correctionDeltas.length
        : 0;
    if (assistantHadError || hasRejectionLang || avgCorrectionDelta < 0) {
      likelyNeeded++;
    } else if (avgCorrectionDelta > 100) {
      // Large positive delta = adding content, not fixing
      possiblyUnnecessary++;
    } else {
      // Ambiguous — count as likely needed (benefit of the doubt)
      likelyNeeded++;
    }
  }
  const correctionPrecision =
    correctionsAnalyzed > 0 ? likelyNeeded / correctionsAnalyzed : null;

  // Dimension 5: intervention timing (high confidence — from timestamps)
  // How quickly does the operator intervene after the agent's turn?
  // Fast intervention = tight steering. Slow = loose steering.
  // Measured in seconds between assistant message timestamp and user response timestamp.
  const timingDeltas = [];
  for (const turn of turns) {
    if (turn.corrected || turn.rejected) {
      const aTs = turn.assistantMsg?.ts;
      const uTs = turn.userResponse?.ts;
      if (aTs && uTs) {
        const deltaSec =
          (new Date(uTs).getTime() - new Date(aTs).getTime()) / 1000;
        if (deltaSec > 0 && deltaSec < 3600) timingDeltas.push(deltaSec); // ignore > 1hr (likely a break)
      }
    }
  }
  const medianTiming = timingDeltas.length > 0 ? median(timingDeltas) : null;
  const timingLabel =
    medianTiming === null
      ? "unknown"
      : medianTiming < 10
        ? "very tight (< 10s)"
        : medianTiming < 30
          ? "tight (10-30s)"
          : medianTiming < 120
            ? "moderate (30s-2min)"
            : "loose (> 2min)";

  // Dimension 6: reliance slope (high confidence — from per-session acceptance rates)
  // How does acceptance rate change over sessions? Positive slope = trusting more.
  // Negative slope = losing confidence. Computed from per-session SE.
  const perSession = perSessionASI(agg.sessions || []);
  const slopes = [];
  for (let i = 1; i < perSession.length; i++) {
    if (
      perSession[i].acceptanceRate !== null &&
      perSession[i - 1].acceptanceRate !== null
    ) {
      slopes.push(
        perSession[i].acceptanceRate - perSession[i - 1].acceptanceRate,
      );
    }
  }
  const relianceSlope =
    slopes.length > 0
      ? slopes.reduce((a, b) => a + b, 0) / slopes.length
      : null;
  const relianceTrend =
    relianceSlope === null
      ? "unknown"
      : relianceSlope > 0.01
        ? "increasing (trusting agent more)"
        : relianceSlope < -0.01
          ? "decreasing (losing confidence)"
          : "stable";

  // Dimension 7: over-correction index (low confidence — needs build/test data)
  // Corrections on files that were likely already correct.
  // Heuristic: the assistant's edit succeeded AND no error AND the user corrected
  // anyway with a positive delta (adding, not fixing). This is the weakest signal.
  const overCorrectionIndex =
    correctionsAnalyzed > 0 ? possiblyUnnecessary / correctionsAnalyzed : null;

  // Dimension 8: under-steering index (medium confidence)
  // Acceptances that led to downstream corrections on RELATED files.
  // Heuristic: an accepted turn where, within the next 5 turns, a different file
  // in the same category gets corrected. This suggests the accepted output caused
  // a downstream problem.
  let acceptedTurns = 0;
  let downstreamCorrections = 0;
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    if (!turn.accepted) continue;
    acceptedTurns++;
    const assistantFiles = new Set(
      (turn.assistantMsg?.toolUses || [])
        .filter(
          (tu) =>
            (tu.name === "Edit" || tu.name === "MultiEdit") &&
            tu.input?.file_path,
        )
        .map((tu) => categorizeFile(tu.input.file_path)),
    );
    // Look ahead 5 turns for a correction in the same category
    for (let j = i + 1; j < Math.min(i + 6, turns.length); j++) {
      if (turns[j].corrected) {
        const correctedFiles = new Set(
          (turns[j].assistantMsg?.toolUses || [])
            .filter(
              (tu) =>
                (tu.name === "Edit" || tu.name === "MultiEdit") &&
                tu.input?.file_path,
            )
            .map((tu) => categorizeFile(tu.input.file_path)),
        );
        // Check intersection of categories
        for (const cat of correctedFiles) {
          if (assistantFiles.has(cat)) {
            downstreamCorrections++;
            break;
          }
        }
        break; // only count the first downstream correction
      }
    }
  }
  const underSteeringIndex =
    acceptedTurns > 0 ? downstreamCorrections / acceptedTurns : null;

  // Composite ASI: weighted combination
  // Weights reflect confidence and importance:
  //   acceptance/correction/rejection rates: 0.15 each (0.45 total) — basic behavior
  //   correction precision: 0.20 — the key "appropriate" signal
  //   over-correction penalty: 0.15 — penalizes unnecessary corrections
  //   under-steering penalty: 0.10 — penalizes missed interventions
  //   timing + reliance slope: advisory (not in composite) — context, not score
  let asiComposite = null;
  if (
    correctionPrecision !== null &&
    overCorrectionIndex !== null &&
    underSteeringIndex !== null
  ) {
    const w = {
      acceptance: 0.15,
      correction: 0.15, // lower correction rate is better, but not too low
      rejection: 0.15, // moderate rejection is appropriate
      precision: 0.2, // higher precision = better steering
      overCorrection: 0.15, // lower over-correction = better
      underSteering: 0.1, // lower under-steering = better
    };
    // Normalize: acceptance is good, but over-acceptance (under-steering) is penalized separately
    // Correction rate: moderate is good. Too high = over-correcting. Too low = under-steering.
    // We use (1 - |correctionRate - 0.10|) as the "appropriate correction" score
    // 0.10 = 10% correction rate is the sweet spot (between over-review <5% and model-needs-help >30%)
    const appropriateCorrection = Math.max(
      0,
      1 - Math.abs(correctionRate - 0.1) * 2,
    );
    // Rejection: moderate is good. 0% = under-steering. >5% = over-rejecting.
    const appropriateRejection = Math.max(
      0,
      1 - Math.abs(rejectionRate - 0.02) * 5,
    );

    asiComposite =
      w.acceptance * acceptanceRate +
      w.correction * appropriateCorrection +
      w.rejection * appropriateRejection +
      w.precision * correctionPrecision +
      w.overCorrection * (1 - overCorrectionIndex) +
      w.underSteering * (1 - underSteeringIndex);
    asiComposite = round(asiComposite, 4);
  }

  return {
    asi: asiComposite,
    seLegacy: round(
      (1.0 * accepted + 0.5 * corrected + 0.0 * rejected) / total,
      4,
    ),
    dimensions: {
      acceptanceRate: { value: round(acceptanceRate, 4), confidence: "high" },
      correctionRate: { value: round(correctionRate, 4), confidence: "high" },
      rejectionRate: { value: round(rejectionRate, 4), confidence: "high" },
      correctionPrecision: {
        value:
          correctionPrecision !== null ? round(correctionPrecision, 4) : null,
        confidence: "medium",
      },
      interventionTiming: {
        value: medianTiming !== null ? round(medianTiming, 1) : null,
        label: timingLabel,
        confidence: "high",
      },
      relianceSlope: {
        value: relianceSlope !== null ? round(relianceSlope, 4) : null,
        trend: relianceTrend,
        confidence: "high",
      },
      overCorrectionIndex: {
        value:
          overCorrectionIndex !== null ? round(overCorrectionIndex, 4) : null,
        confidence: "low",
      },
      underSteeringIndex: {
        value:
          underSteeringIndex !== null ? round(underSteeringIndex, 4) : null,
        confidence: "medium",
      },
    },
    counts: { accepted, corrected, rejected, total },
    perSession: perSession.slice(-20), // last 20 sessions for trend display
  };
}

/** Compute per-session ASI (for trend tracking). */
export function perSessionASI(sessions) {
  const results = [];
  for (const s of sessions) {
    const turns = s.turns || [];
    if (turns.length === 0) continue;
    let accepted = 0,
      corrected = 0,
      rejected = 0;
    for (const turn of turns) {
      if (turn.rejected) {
        rejected++;
        continue;
      }
      if (turn.corrected) {
        corrected++;
        continue;
      }
      accepted++;
    }
    const total = turns.length;
    results.push({
      session: s.path?.split("/").pop() || "unknown",
      date: s.timeBounds?.end || null,
      se: round((1.0 * accepted + 0.5 * corrected) / total, 4),
      acceptanceRate: round(accepted / total, 4),
      correctionRate: round(corrected / total, 4),
      rejectionRate: round(rejected / total, 4),
      accepted,
      corrected,
      rejected,
      total,
    });
  }
  return results;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const REJECTION_LANG =
  /\b(no|wrong|revert|undo|that'?s not right|not what i want|don't do that|stop|fix this|try again|redo)\b/i;

const REJECTION_PATTERNS = [
  /user doesn't want to proceed/i,
  /user rejected/i,
  /user declined/i,
  /the user wants to stop/i,
  /tool use was rejected/i,
];

function isRejection(content) {
  return REJECTION_PATTERNS.some((p) => p.test(content));
}

function categorizeFile(path) {
  const lower = path.toLowerCase();
  if (/\.(css|scss|styled|theme)/.test(lower)) return "styling";
  if (/\.(tsx|jsx)/.test(lower)) return "ui-component";
  if (/component|card|panel|modal|nav|header|footer|layout/i.test(lower))
    return "design";
  if (/\.(test|spec)/.test(lower)) return "testing";
  if (/readme|doc|md$/.test(lower)) return "docs";
  if (/\.(py|js|mjs|ts)/.test(lower)) return "code";
  return "other";
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function emptyASI() {
  return {
    asi: 0,
    seLegacy: 0,
    dimensions: {
      acceptanceRate: { value: 0, confidence: "high" },
      correctionRate: { value: 0, confidence: "high" },
      rejectionRate: { value: 0, confidence: "high" },
      correctionPrecision: { value: null, confidence: "medium" },
      interventionTiming: { value: null, label: "unknown", confidence: "high" },
      relianceSlope: { value: null, trend: "unknown", confidence: "high" },
      overCorrectionIndex: { value: null, confidence: "low" },
      underSteeringIndex: { value: null, confidence: "medium" },
    },
    counts: { accepted: 0, corrected: 0, rejected: 0, total: 0 },
    perSession: [],
  };
}

const round = (n, d) => Number(n.toFixed(d));
