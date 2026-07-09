---
type: build-plan
title: signa — taste extractor cleanup + SE refinement + documentation (R&D + plan, 2026-07-07)
description: R&D findings and build plan for refining signa's taste extractor (Layer 3 noise cleanup, directive clustering, profile quality) and Steering Efficiency metric (correction detection, validation, correlation analysis). Includes documentation structure for marketing and user-facing explanation. Built by DEVIN2.
tags:
  [
    sigrank,
    signa,
    taste,
    steering-efficiency,
    refinement,
    r&d,
    documentation,
    build-plan,
  ]
timestamp: 2026-07-07T08:10:00Z
---

# signa — taste extractor cleanup + SE refinement + documentation

> **R&D session + build plan.** Explores what's there, what's broken, what needs
> refining, and how to document it for marketing and user-facing explanation.
>
> Built by DEVIN2, 2026-07-07. Companion to PLAN.md (the original build plan)
> and LAUNCH.md (the launch runbook).

---

## R&D findings — what's there, what's broken

### 1. Taste extractor — the noise problem

**What's there:** `src/taste/extractor.mjs` (200 lines) reads aggregated session
data and distills it into structured preferences across 3 layers:

- Layer 1 (metadata): tool distribution, edit style, reject rate → workflow + code preferences
- Layer 2 (structural): correction loops, convergence, file iteration concentration → correctionPatterns
- Layer 3 (content): user feedback directives → design preferences

**What's broken (verified against live data — 500 sessions):**

#### Problem A: Layer 3 directive extraction captures noise

The logreader (`logreader.mjs` line 202-211) extracts user messages that match an
imperative verb pattern (`get rid of|make|remove|add|change|move|don't|...`) and
are 5-500 chars. This catches real directives ("get rid of median") but also
catches:

- Truncated sentences: `"use the cli or this .... i relly want to see the other other one and the field i dont knwo why its"` — this is a fragment of a longer thought, not a distilled preference
- Typos and stream-of-consciousness: `"i relly want to see"` — raw user voice, not a preference signal
- Context-dependent instructions: `"make numbers larger"` could be a one-time request, not a standing preference

The extractor then clusters these by keyword (`clusterDirectives`, line 152-176)
and summarizes them (`summarizeCluster`, line 178-192). The clustering is
keyword-based and works for the known clusters (no-median, larger-numbers, compact,
color-theme, remove, add, layout, interactive). But the `other` cluster — which
catches everything that doesn't match a keyword — just dumps the raw truncated
text as the "summary."

**The result in the live profile:**

```json
"design": [
  "general directive: \"use the cli  or this .... i relly want to see the other other one and the field i dont knwo why its \"",
  "particular about layout, alignment, positioning",
  "requests additions — expanding the surface",
  "actively removes elements — minimalist tendency"
]
```

The first entry is noise. The other three are clean. The noise comes from the
`other` cluster falling through to `map.other` which dumps the raw sample.

#### Problem B: No frequency/confidence weighting

A directive that appears once ("use the cli or this") gets the same display
weight as a directive that appears 50 times ("make numbers larger"). The
clustering sorts by count (`b.count - a.count`) but the summary doesn't reflect
frequency. An operator seeing "general directive: ..." doesn't know if this
appeared once or 500 times.

#### Problem C: No temporal decay

The extractor treats all directives from the last 30 days equally. A directive
from 29 days ago ("remove the median") that the operator has since stopped
caring about still shows up. The taste profile should weight recent behavior
more than old behavior — operators evolve.

#### Problem D: Correction loop detection is too loose

The logreader (line 224-241) detects a correction loop as "3+ consecutive edits
to the same file." But "consecutive" means consecutive in the edit sequence
(only Edit/MultiEdit tool uses), not consecutive in the conversation. If the
agent edits `app.py`, then runs a Bash command, then edits `app.py` again, then
runs another Bash command, then edits `app.py` again — that's 3 consecutive
edits to `app.py` in the edit sequence, but they're interspersed with other
work. This may or may not be a "correction loop" — it could just be iterative
development.

The convergence check (`deltas.slice(1).every((d, k) => Math.abs(d) <= Math.abs(deltas[k]) + 50)`)
is also loose — it checks if edit deltas are shrinking, but with a 50-char
tolerance that's generous for small edits and tight for large ones.

### 2. Steering Efficiency — the validation problem

**What's there:** `src/taste/se.mjs` (40 lines) computes SE from the turn array
built by the logreader. Each turn is classified as accepted (1.0), corrected
(0.5), or rejected (0.0). SE = weighted sum / total turns.

**What's broken / unvalidated:**

#### Problem E: Correction detection is proximity-based, not causal

The logreader (line 269-291) marks a turn as "corrected" if, within the next 3
messages (k+1 to k+3), any Edit/MultiEdit tool use targets a file the assistant
just edited. This is proximity-based — it assumes that if you edit the same file
soon after the agent did, you're correcting the agent's work.

But this misses nuance:

- **Additive edits:** You edit the same file to ADD something new, not to fix the agent's work. This counts as a "correction" but isn't one.
- **Sequential development:** The agent edits file A, you edit file A to add the next feature. That's collaboration, not correction.
- **Missed corrections:** You wait 4+ messages before correcting. The window is k+1 to k+3 — if you correct on message k+5, it's marked "accepted."

The 2-turn window (k+1 to k+3, which is really 3 messages) is a heuristic. It
needs validation: does it actually correlate with operator dissatisfaction?

#### Problem F: SE doesn't correlate with Υ (the rank metric)

Your SE is 0.9927 (exceptionally high) and your Υ is 283.17 (POWER class, not
TRANSMITTER). This means SE alone doesn't predict cascade quality. You can
steer perfectly and still not compound efficiently.

This isn't necessarily a problem — SE is designed as a complementary signal, not
a replacement for Υ. But before promoting SE to a leaderboard metric (decision
T6 from the brainstorm), we need correlation analysis across multiple operators:
does SE correlate with Υ? With class tier? With velocity? Or is it independent?

**We can't do this analysis yet** — we only have one operator's data (yours).
The analysis needs 10+ operators with both SE and Υ data.

#### Problem G: The 0.5 / 1.0 / 0.0 weighting is unvalidated

The weights (accepted=1.0, corrected=0.5, rejected=0.0) are from the PLAN.md
spec. They're intuitive but arbitrary. Why is a correction worth exactly half an
acceptance? Why is a rejection worth zero? A rejection might be MORE
informative than an acceptance (it shows the operator has a clear taste that the
agent missed). The weights should be validated against outcomes — do operators
with higher SE actually produce higher Υ?

#### Problem H: No SE breakdown by session or time

SE is computed as a single aggregate number across all sessions. There's no
per-session SE, no SE-over-time trend, no "your SE dropped this week" anomaly
detection. The `track` skill shows cascade metrics over time but not SE over
time. For SE to be useful as a coaching signal, the operator needs to see how
it changes.

### 3. Documentation — what's missing for marketing

**What's there:** README.md (good developer-facing doc), PLAN.md (build plan),
LAUNCH.md (launch runbook).

**What's missing:**

- **User-facing explanation** of what the taste profile is, what it captures, what it doesn't
- **Marketing copy** — the hook ("your AI coding agent starts blind. signa reads your session logs, learns your taste, and tells you how to improve your token cascade.")
- **Privacy explainer** — what stays local, what the difference is between signa (reads everything, stays local) and sigrank-mcp (extracts 4 integers, submits to board)
- **SE explainer** — what it is, what it measures, what a good score looks like
- **The two-tool architecture** — signa (the coach) vs sigrank-mcp (the instrument), why they're separate, what each is for

---

## Build plan

### Phase 1: Taste extractor cleanup (no LLM needed)

#### 1A. Fix the `other` cluster noise

**File:** `src/taste/extractor.mjs`, `summarizeCluster()` function

**Change:** The `other` cluster currently dumps raw truncated text. Replace with:

- If the cluster has 3+ items, summarize as "N general feedback directives" (don't show raw text)
- If the cluster has 1-2 items, show a cleaned version (strip filler words, truncate to 60 chars, add ellipsis)
- If the item is < 20 chars or contains > 3 typos, drop it entirely

**Cleanup rules for raw directives:**

- Strip filler words ("um", "like", "i relly", "i dont knwo why")
- Truncate to first complete sentence (split on `. ! ?`)
- Drop if < 10 chars after cleanup
- Drop if contains "..." (indicates truncation mid-thought)

#### 1B. Add frequency/confidence to preferences

**File:** `src/taste/extractor.mjs`, `clusterDirectives()` output

**Change:** Each cluster summary should include the count:

- `"particular about layout, alignment, positioning (12 directives)"` instead of just `"particular about layout, alignment, positioning"`
- Clusters with 1 directive get a `(1 directive — low confidence)` suffix
- Clusters with 10+ get `(strong signal — N directives)`

#### 1C. Add temporal decay

**File:** `src/taste/extractor.mjs`, `extractTaste()` function

**Change:** Weight directives by recency. A directive from today gets weight 1.0,
from 7 days ago gets 0.8, from 14 days ago gets 0.5, from 30 days ago gets 0.2.
The cluster count becomes a weighted sum, not a raw count. This means recent
preferences dominate the profile, and old ones fade.

**Requires:** The logreader needs to pass timestamps with each directive. Currently
it only stores the text (`session.feedbackDirectives.push(text.slice(0, 200))`).
Change to `{ text, ts }` objects.

#### 1D. Tighten correction loop detection

**File:** `src/logreader.mjs`, third pass (line 214-241)

**Change:** A correction loop should be 3+ edits to the same file with NO other
file edits in between (not just "consecutive in the edit sequence"). If the
agent edits file A, then file B, then file A again — that's iteration, not a
correction loop. Only count it as a loop if the edits to file A are
uninterrupted by edits to other files.

Also: add a time window. If 3 edits to the same file happen within 5 minutes,
that's a correction loop. If they're spread across 2 hours, that's just
iterative development.

### Phase 2: SE refinement

#### 2A. Improve correction detection

**File:** `src/logreader.mjs`, turn classification (line 269-291)

**Changes:**

- **Distinguish additive vs corrective edits:** If the user's edit to the same file has a positive delta (adding content) AND the edit is in a different part of the file (different old_string), it's additive, not corrective. Mark as "accepted" not "corrected."
- **Expand the window to k+5:** The current k+1 to k+3 window misses slow corrections. Expand to k+1 to k+5 but weight by proximity (k+1 = likely correction, k+5 = maybe correction).
- **Check for rejection language in user message:** If the user's response message contains "no", "wrong", "revert", "undo", "that's not right" — mark as corrected even if no same-file edit is detected.

#### 2B. Add per-session SE

**File:** `src/taste/se.mjs`

**Change:** Add `steeringEfficiencyBySession(sessions)` that returns an array of
`{ session, se, accepted, corrected, rejected, total, date }` — one entry per
session. The `track` skill can then show SE over time alongside cascade metrics.

#### 2C. Add SE to the track skill

**File:** `src/skills/index.mjs`, `skillTrack()`

**Change:** The track skill currently shows Υ/SNR/Leverage/Velocity over time.
Add SE as a second track. Show: "SE trend: 0.99 → 0.98 → 0.99 (stable)" or
"SE dropped this week: 0.95 → 0.89 (more corrections than usual)."

#### 2D. SE validation framework (for when we have multiple operators)

**File:** new `src/taste/se-validate.mjs`

**Change:** Add a validation function that, given multiple operators' data,
computes:

- Correlation between SE and Υ (Pearson r)
- Correlation between SE and class tier (Spearman rho)
- SE distribution by class (do TRANSMITTER operators have higher SE?)
- SE variance over time (is SE stable or volatile for a given operator?)

This can't run yet (only one operator), but the framework should be in place for
when signa has multiple users. Mark as "awaiting data" in the output.

### Phase 3: Documentation

#### 3A. User-facing taste profile explainer

**File:** new `docs/TASTE_PROFILE.md`

**Content:**

- What the taste profile is (your operating style, distilled from session logs)
- What it captures (design preferences, code style, workflow habits, correction patterns)
- What it doesn't capture (your code content, your prompts — only the patterns)
- How it's generated (Layer 1/2/3 explanation in plain language)
- How to read it (what each field means)
- Privacy (stays local, never submitted, operator-owned)
- How to use it (feed it to your agent at session start, share it opt-in, edit it by hand)

#### 3B. SE explainer

**File:** new `docs/STEERING_EFFICIENCY.md`

**Content:**

- What SE is (how well you steer your agent — accepted vs corrected vs rejected)
- The formula in plain language
- What a good score looks like (0.9+ = excellent, 0.7-0.9 = good, < 0.7 = needs work)
- Why it matters (corrections are the hidden tax on input — you double-pay)
- Why it doesn't directly predict Υ (you can steer perfectly and still not compound efficiently — they're complementary signals)
- How to improve it (feed your taste profile at session start, be explicit about preferences, reject early not late)

#### 3C. The two-tool architecture explainer

**File:** new `docs/SIGNA_VS_SIGRANK.md`

**Content:**

- signa = the coach (reads everything, stays local, talks back)
- sigrank-mcp = the instrument (extracts 4 integers, submits to board, privacy-preserving)
- Why they're separate (different privacy boundaries, different audiences)
- How they work together (signa coaches you, sigrank-mcp submits your numbers)
- The install flow (both, or either — what each gives you)

#### 3D. Marketing copy

**File:** new `docs/MARKETING.md`

**Content:**

- The hook: "your AI coding agent starts blind. signa reads your session logs, learns your taste, and tells you how to improve your token cascade."
- The positioning: not an analytics tool, not a dashboard — a coach that talks back
- The differentiation: local-only, taste-aware, steering-efficient
- The ecosystem: signa (coach) + sigrank-mcp (instrument) + signalaf.com (leaderboard)
- The audience: AI coding operators who want to get better, not just measure
- The proof: smoke-tested against 500 real sessions, SE 0.99, $13K cache savings

---

## Execution order

1. **Phase 1A-1D** (taste extractor cleanup) — pure code, no LLM, immediate quality improvement
2. **Phase 2A-2C** (SE refinement) — pure code, improves coaching quality
3. **Phase 3A-3D** (documentation) — can be written in parallel with 1-2
4. **Phase 2D** (SE validation framework) — code the framework, mark "awaiting data"

**Estimated scope:** ~400 lines of code changes + ~800 lines of documentation.
No new dependencies. No LLM needed. All testable against the existing 500-session
dataset.

---

## What this enables

After this work:

- The taste profile is clean enough to show to users without embarrassment
- SE is a real coaching signal, not just a number
- The documentation explains the product to users and marketers
- The validation framework is ready for when multiple operators exist
- The local agent is solid enough to ship alongside the MCP server mode (the next phase)

---

_Built by DEVIN2, 2026-07-07. Companion to PLAN.md + LAUNCH.md._
