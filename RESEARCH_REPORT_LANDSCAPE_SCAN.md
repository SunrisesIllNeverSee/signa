---
type: research-report
title: signa — full landscape scan + findings + build recommendations (2026-07-07)
description: Comprehensive competitive landscape analysis for the signa agent. Covers 30+ tools across 6 categories (session analysis, taste profiling, token optimization, session replay, Strava-for-coding, prompt coaching), the academic research baseline, the corrected competitive positioning (StraVIBE is a calorie counter, SigRank is a metabolic panel), what's genuinely novel vs me-too, and prioritized build recommendations. Built by DEVIN2 after full landscape scan.
tags:
  [
    sigrank,
    signa,
    research,
    competitive-landscape,
    findings,
    build-recommendations,
    cascade,
    steering-efficiency,
    moat,
  ]
timestamp: 2026-07-07T09:00:00Z
---

# signa — full landscape scan + findings + build recommendations

> **Research report.** Full landscape scan of the AI coding agent analysis
> space, conducted 2026-07-07 by DEVIN2. Covers 30+ tools across 6 categories,
> the academic research baseline, the corrected competitive positioning, and
> prioritized build recommendations.
>
> Companion to: RESEARCH_AND_BRAINSTORM.md (the brainstorm that came out of
> this scan), PLAN.md (original build plan), LAUNCH.md (launch runbook).

---

## Executive summary

The AI coding agent analysis space has 30+ tools, but they operate on a
different layer of data than SigRank. The landscape divides into two tiers:

- **Tier 1 (raw token counts):** StraVIBE, straude, Cursor Analytics, Copilot
  metrics — they count tokens burned. Like a calorie counter.
- **Tier 2 (behavioral/style analysis):** Code Insights, Microsoft AI Engineer
  Coach, taste-ai, Command Code, TokenPilot, Recall, vibe-replay — they analyze
  session patterns, code style, prompt quality, or replay sessions.

**SigRank operates on a third layer that nobody else has: the cascade
architecture** — Υ Yield, SNR, Leverage, Velocity, the class system. These are
proprietary metrics derived from the relationship between the four token
pillars, not the pillars themselves. No other tool computes them.

**signa is the interface to that layer.** It's not a coaching tool that happens
to use cascade data. It IS the cascade data, made conversational. The cascade is
the moat; signa is the agent that reads the moat and talks back about it.

**The "crowded space" was a false alarm.** The other tools don't have the
cascade. They have token counts (Tier 1) or behavioral patterns (Tier 2). signa
operates on the cascade architecture (Tier 3), which only SigRank provides.

---

## Part 1: The landscape — full inventory

### Category 1: Session analysis tools (7 tools)

Tools that parse AI coding session logs and provide analysis, insights, or
anti-pattern detection.

| Tool                                    | What it does                                                                                                                                                                                                                                                 | Data layer          | Privacy |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------- |
| **Code Insights**                       | CLI, parses Claude Code/Cursor/Codex/Copilot sessions into local SQLite. Session browser, AI-powered insights (decisions, learnings, techniques), prompt quality scoring, weekly cross-session synthesis with friction breakdown.                            | Behavioral (Tier 2) | Local   |
| **Microsoft AI Engineer Coach**         | VS Code extension + Copilot canvas. Reads local session logs, detects 45 anti-patterns across prompt quality, session hygiene, code review, tool mastery, context management. Tracks progress, measures AI-generated code volume, discovers reusable skills. | Behavioral (Tier 2) | Local   |
| **claude-code-devtools**                | Local web app with live tool-call timeline, context inspector, file heatmap, replay scrubber. Real-time observability.                                                                                                                                       | Behavioral (Tier 2) | Local   |
| **Claude Code Session Analyzer**        | Zero-dependency Python viewer. 4 modes: Chat View, API View (reconstructed API boundaries with token breakdown), Stats, Timeline.                                                                                                                            | Token + behavioral  | Local   |
| **claude-session-analyzer** (yonk-labs) | CLI/TUI for per-session and per-skill token/cost/time analysis. Finds which prompts or skills are slowing you down.                                                                                                                                          | Token + behavioral  | Local   |
| **claude-code-sessions**                | Plugin with 11 skills and web dashboard for session intelligence: search, analyze, manage sessions across projects.                                                                                                                                          | Behavioral (Tier 2) | Local   |
| **cursor-session-tracer**               | MCP-based observability layer for Cursor. Logs agent decisions, file touches, reasoning chains in real-time. Creates trace graphs for debugging and PR review.                                                                                               | Behavioral (Tier 2) | Local   |

**What they measure:** tool call distribution, session duration, file edit
patterns, prompt quality scores, anti-pattern detection, context health.

**What they DON'T have:** the cascade (Υ/SNR/Leverage/Velocity), the class
system, SE, taste → cascade connection, leaderboard integration.

### Category 2: Taste/preference profiling tools (6 tools)

Tools that extract coding style, naming conventions, or design preferences.

| Tool                   | What it does                                                                                                                                                                                              | Approach                         | Output format                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| **Command Code Taste** | Meta neuro-symbolic "taste-1" model with continuous RL. Learns from every accept, reject, edit. Builds invisible architecture of choices, structures, patterns. Transferable across projects.             | Proprietary RL model             | Opaque (locked to platform)                 |
| **taste-ai**           | Zero-config auto-learner. Compresses context from 56K→1.9K tokens. Learns coding patterns from git history and session logs. Extracts NAMING, ARCHITECTURE, IMPORTS, ERROR_HANDLING, STYLE into TASTE.md. | Pattern extraction from git/logs | TASTE.md + .agent-taste.json                |
| **Taster**             | Teach AI your taste by showing examples. Reverse-engineers standards into reusable profile that's both human-readable style guide and executable classifier. Works for photos, essays, code standards.    | Example-based learning           | Style guide + classifier                    |
| **tasteID**            | Maps design sensibility across 23 dimensions. Exports as creative brief any AI tool understands. Three sections: ALWAYS (rigid principles), BY DEFAULT (flexible defaults), SPECIFIC (personal words).    | Questionnaire-based              | Creative brief                              |
| **CoderProfile**       | Turns coding style into AI-ready rules for Claude, Cursor, Codex. Quick/Detailed/Deep questionnaires, optional GitHub repo scan.                                                                          | Questionnaire + repo scan        | CLAUDE.md, .cursorrules, AI-INSTRUCTIONS.md |
| **gitstyle**           | Generates personal engineering style wiki from GitHub commit history. 5-stage pipeline: fetch, sample, extract, compile, lint.                                                                            | Git history extraction           | Obsidian-compatible markdown                |

**What they profile:** code style (naming, architecture, imports, error
handling), design sensibility, banned patterns.

**What they DON'T have:** the cascade connection. None of them can say "your
taste profile is costing you X in Υ yield." They profile the CODE, not the
OPERATOR's behavior in relation to cascade efficiency.

### Category 3: Token optimization tools (5 tools)

Tools that reduce token consumption through context management, output
filtering, or behavioral changes.

| Tool                                 | What it does                                                                                                                                                                                      | Reduction claim             | Approach                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------- |
| **TokenPilot**                       | MCP server for token-efficient code navigation with AST-aware structural reading. Smart read tools, PreToolUse hooks to intercept heavy native calls, tp-* subagents with tight response budgets. | Up to 90% context reduction | AST-aware structural reading |
| **token-diet**                       | Always-on token-efficiency skill for coding agents. Trims tokens across replies, docs, tests, code, context, tool use. Modes: on, lite, ultra, off.                                               | ~31% lower bill on average  | Behavioral trimming          |
| **token-optimizer** (edisonaugusthy) | Filters noisy command output before sent back to agent. Preserves errors, failures, changed files, paths, summaries while removing repeated progress output, boilerplate.                         | 60-75% reduction            | Output filtering             |
| **Token Optimizer** (alexgreensh)    | Cuts tokens across 8 surfaces: structural (bloated configs, unused skills), runtime (verbose output, re-reads), behavioral (model misrouting, cache expiry, retry loops).                         | Not specified               | 8-surface optimization       |
| **context-stats**                    | Live status line + graph dashboard, session export, cross-project reports. Tracks context zone, MI score, token delta, cache activity. Cache keep-warm for Claude's 5-minute TTL.                 | Not specified (monitoring)  | Monitoring + cache keep-warm |

**What they optimize:** context window usage, output verbosity, cache hit rates,
model routing.

**What they DON'T have:** the cascade. They optimize tokens in isolation —
"reduce input" or "increase cache hits" — without understanding how those
changes affect Υ yield. They can't say "cutting your input by 50% would move
you from POWER to ARCHITECT+ class."

### Category 4: Session replay tools (6 tools)

Tools that record and replay AI coding sessions as visual experiences.

| Tool                    | What it does                                                                                                                                                                   | Platforms                                    | Export                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------ |
| **Recall**              | Video-player-style replay. Frame-by-frame playback, timeline scrubber, dead air compression, keyboard shortcuts, full-text search, work units.                                 | Claude Code, Codex, Gemini CLI               | Local                    |
| **vibe-replay**         | Animated, interactive web replays. One self-contained HTML file. Activity heatmaps, project analytics, cost estimates.                                                         | Claude Code, Cursor, Codex, Pi               | HTML, SVG, GIF, markdown |
| **claude-replay**       | Self-contained embeddable HTML replays. Interactive playback, collapse/expand tool calls and thinking blocks, bookmarks, secret redaction, multiple themes.                    | Claude Code, Cursor, Codex, Gemini, OpenCode | HTML                     |
| **claude-trace-replay** | Trace viewer for Claude Code. Replay sessions, inspect agent flows and tool calls, spot token spikes, compare runs.                                                            | Claude Code                                  | Local                    |
| **Culpa**               | Deterministic replay + counterfactual debugging. Flight recorder capturing every LLM call, tool invocation, file change. Fork at any decision point for "what if" experiments. | AI agents generally                          | Local                    |
| **AgentReel**           | "Loom for AI coding sessions." Every session becomes shareable, scrubbable replay. Timeline scrubber, diff viewer, MP4 export with auto-edited highlights.                     | Claude Code, Cursor                          | MP4, share URLs          |

**What they do:** visualize sessions, enable replay, support debugging.

**What they DON'T have:** cascade coaching, SE, taste profiling, leaderboard
integration. These are visualization tools, not coaching tools.

### Category 5: "Strava for coding" / social tools (5 tools)

Tools that track coding activity and provide social/competitive features.

| Tool         | What it ranks                                       | Metric                                                             | Privacy                             | Social features                                                      |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------- |
| **StraVIBE** | Total tokens burned across Claude Code/Codex/Cursor | Token volume (raw count)                                           | Only token counts leave machine     | Public leaderboard, Spotify-Wrapped-style shareable cards, auto-sync |
| **straude**  | Total tokens burned                                 | Token volume (raw count)                                           | Only aggregate token usage uploaded | Auto-posts sessions with AI captions, leaderboard                    |
| **DevsLOG**  | Productivity score, streaks, lines of code          | LOC + time                                                         | VS Code extension, local            | Community sharing, daily/weekly/monthly reports                      |
| **Gitrava**  | GitHub activity                                     | LOC additions/deletions, contribution calendar                     | GitHub OAuth                        | 9:16 PNG summaries for sharing                                       |
| **KERN**     | Developer behavioral intelligence                   | Activity classification (Coding/Debugging/Testing/DevOps/Research) | Terminal agent captures             | Real-time dashboard, AI standups, team blocker intelligence          |

**The critical finding — StraVIBE vs SigRank:**

StraVIBE is the closest competitor in form (token leaderboard, npm install,
privacy model) but the farthest in substance. StraVIBE ranks by **token
volume** — who burned the most. SigRank ranks by **Υ Yield** — who compounded
the best. These are opposite games:

- StraVIBE: more tokens = higher rank. The game is consumption.
- SigRank: better ratio = higher rank. The game is efficiency.

**StraVIBE is a calorie counter. SigRank is a metabolic panel.** They look
similar from the outside (token leaderboard, privacy model, npm install) but
they measure fundamentally different things. StraVIBE says "you burned 48.2M
tokens." SigRank says "your cache leverage is 259× and your velocity is 1.09 —
you're hoarding context but not generating enough output."

The privacy models are identical ("only token counts leave your machine") but
what each DOES with those counts is completely different. StraVIBE sums them.
SigRank computes the cascade architecture from their relationships.

### Category 6: Prompt coaching tools (4 tools)

Tools that provide real-time or post-hoc feedback on prompt quality.

| Tool                            | What it does                                                                                                                                                                   | Approach                   | When                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | --------------------- |
| **AI Coach**                    | Real-time guidance for Claude Code. Hooks into UserPromptSubmit and PostToolUse events. Catches ambiguous prompts and context issues. Decision tree adjusts based on feedback. | Hook-based, real-time      | During session        |
| **Prompt Sensei**               | Local-first prompt coach for Claude Code and Codex. Stage-aware feedback, rewrites rough prompts, observes prompting habits, analyzes local history with consent.              | Local analysis + rewriting | During + post-session |
| **prompt-coach**                | Claude skill that silently analyzes every prompt, scores for token efficiency, shows what to cut, trains better prompting over time.                                           | Silent analysis + scoring  | During session        |
| **claude-code-prompt-improver** | Injects right context at right moment (prompt submit, tool use, subagent start) for better first output.                                                                       | Context injection          | During session        |

**What they coach:** prompt clarity, context management, token efficiency at the
prompt level.

**What they DON'T have:** the cascade, SE, taste profiling, leaderboard
integration. They coach on the prompt, not on the operator's cascade behavior.

---

## Part 2: The academic research baseline

Research that exists in academia but hasn't been implemented in coding tools:

### Human-AI collaboration metrics

**"From Accuracy to Readiness: Metrics and Benchmarks for Human–AI Decision-Making"**
(arxiv.org/html/2603.18895v1)

- Four-part taxonomy: Outcome metrics, Reliance & Interaction metrics
  (accept-on-wrong, changed-to-wrong, override frequency, reliance slope),
  Safety & Harm metrics, Learning & Readiness metrics
- Organized around Understand–Control–Improve (U–C–I) lifecycle
- **Relevance to SE:** provides the vocabulary for steering quality that no
  coding tool implements

**Anthropic's "Measuring AI agent autonomy in practice"**
(anthropic.com/research/measuring-agent-autonomy)

- Analyzed millions of human-agent interactions across Claude Code and public API
- Key finding: experienced users auto-approve more BUT interrupt more often
- Measures: autonomy granted, autonomy interrupted, action risk classification
- **Relevance to SE:** proves that good steering isn't "accept more" — it's
  "interrupt precisely." The current SE (acceptance rate) rewards the wrong
  behavior.

**CoTrace** (arxiv.org/html/2605.21363v1)

- Framework for measuring human and AI contributions at goal level
- Models account for 11-26% of goal-shaping contribution
- **Relevance:** goal-level contribution measurement, not just turn-level

### Steerability research

**"A Course Correction in Steerability Evaluation"**
(ojs.aaai.org/index.php/AAAI/article/view/41057)

- Multi-dimensional goal space modeling user goals and LLM outputs as vectors
- Finds current LLMs induce "side-effects" that impede steerability

**"Evaluating the Prompt Steerability of Large Language Models"**
(arxiv.org/html/2411.12405v1)

- Formal definition of prompt steerability as shifting model's behavioral
  distribution
- Benchmark reveals limited steerability due to baseline behavior skew

### Preference learning

**"Learning the Preferences of Ignorant, Inconsistent Agents"**
(doi.org/10.1609/aaai.v30i1.10010)

- Bayesian inverse planning for preference inference from choices
- Incorporates false beliefs, sub-optimal planning, temporal inconsistency

**"Learning Structured Preferences"**
(owainevans.github.io/pdfs/learning_structured_preferences_evans.pdf)

- Bayesian inference + utility-based models for learning structured preferences
  from sparse data

### Industry frameworks

**Human-in-the-Loop Patterns** (ai-solutions.wiki/patterns/human-in-the-loop/)

- Correction rate benchmarks: below 5% = over-reviewing, above 30% = model needs
  improvement
- Pre-approval gates, confidence-based escalation, post-hoc audit loops

**Agent Patterns Catalog** (agentpatternscatalog.org)

- Classify every agent action by risk/cost and route to different approval
  policies
- Addresses approval-fatigue and asynchronous approval stalls

---

## Part 3: Findings — the three-tier data landscape

The landscape divides into three tiers based on what data layer each tool
operates on:

### Tier 1: Raw token counts (the calorie counters)

**Tools:** StraVIBE, straude, Cursor Analytics, Copilot metrics, DevsLOG,
Gitrava

**What they have:** token volume, cost, model usage, session duration, lines of
code, streaks

**What they rank on:** total tokens burned (volume = rank)

**The game:** consumption — who burned the most

**The insight:** none — a count is not an insight

**Privacy model:** "only token counts leave your machine"

### Tier 2: Behavioral/style analysis (the pattern finders)

**Tools:** Code Insights, MS AI Engineer Coach, taste-ai, Command Code,
TokenPilot, token-diet, Recall, vibe-replay, AI Coach, Prompt Sensei, and 15+
others

**What they have:** tool call patterns, edit sizes, correction loops, prompt
quality scores, anti-pattern detection, code style extraction, session replay,
context health

**What they rank on:** nothing (most don't have leaderboards) or token volume
(the ones that do)

**The game:** analysis — understand what happened

**The insight:** behavioral patterns, anti-patterns, style preferences

**Privacy model:** varies (local-first to cloud)

### Tier 3: Cascade architecture (the metabolic panel)

**Tools:** SigRank (sigrank-mcp + signa + signalaf.com)

**What it has:** Υ Yield (cache_read × output / input²), SNR, Leverage,
Velocity, the class system (BASE → TRANSMITTER), SE (Steering Efficiency),
taste → cascade bridge

**What it ranks on:** Υ Yield (efficiency = rank)

**The game:** compounding — who turned tokens into the best yield

**The insight:** the architecture of your token flow — not how much you burned,
but how well you compounded

**Privacy model:** "only 4 integers leave your machine" (same as Tier 1 in
privacy, completely different in what it computes from those integers)

### The critical insight

**Tier 1 and Tier 3 have the same privacy model but opposite games.** Both say
"only token counts leave your machine." But:

- Tier 1 (StraVIBE) sums the counts → volume → "you burned 48.2M tokens"
- Tier 3 (SigRank) computes the relationships between the counts → cascade →
  "your leverage is 259×, your velocity is 1.09, you're POWER class"

The privacy model is identical. The computation is completely different. The
insight is completely different. The game is completely different.

**Tier 2 tools don't compete with Tier 3.** They operate on behavioral patterns
(how you work) not on cascade architecture (how your tokens compound). They can
complement SigRank — a Tier 2 tool can analyze your sessions while SigRank
computes your cascade — but they can't replace it because they don't have the
cascade formula.

**The cascade is the moat.** Nobody else computes Υ Yield, SNR, Leverage,
Velocity, or the class system. These are proprietary metrics derived from the
relationship between the four token pillars. The formula is the intellectual
property. The four integers are the input. The cascade is the output.

---

## Part 4: What's genuinely novel — the honest assessment

### What signa has that nobody else has

**1. The cascade architecture (Υ/SNR/Leverage/Velocity/Class)**

No other tool computes these metrics. They're derived from the relationship
between the four token pillars (input, output, cacheCreate, cacheRead), not the
pillars themselves. The formula is proprietary. The class system (BASE →
TRANSMITTER) is a ranking framework that nobody else has.

This is the moat. Everything else is built on top of this.

**2. Steering Efficiency (SE) — behavioral metric connected to the cascade**

The academic research has the vocabulary (reliance slope, override frequency,
appropriate reliance) but no coding tool implements it. signa has a working SE
computation. SE measures the OPERATOR, not the agent — every other tool
measures the agent.

The connection to the cascade is what makes SE novel: "your SE is 0.99 but your
Υ is 283 — you steer well but you're not compounding." No other tool can make
this statement because no other tool has both SE and Υ.

**3. The taste → cascade bridge**

No other tool connects behavioral taste to cascade metrics. signa can say "your
Bash-heavy workflow (50.3%) is burning cache reads" or "your 78 edits on
SCRATCHPAD.md aren't contributing to Υ." This is coaching from cascade data,
not from behavioral patterns alone.

**4. The two-tool architecture (coach + instrument)**

signa (coach, reads everything, stays local) + sigrank-mcp (instrument,
extracts 4 integers, submits to board). The privacy boundary IS the product
design. No other tool has this separation — they're either all-local (no
leaderboard) or all-cloud (no privacy).

**5. The leaderboard ecosystem with cascade ranking**

StraVIBE has a leaderboard, but it ranks on token volume. SigRank's board ranks
on Υ Yield. The coaching (signa) is connected to the competition (the board)
through the same metric. You coach toward better Υ, which is the leaderboard
metric.

### What signa has that's me-too (table stakes, not differentiators)

- Session log parsing (Code Insights, MS AI Engineer Coach, 5+ others)
- Tool call distribution analysis (multiple tools)
- Token cost breakdown (multiple tools)
- Correction loop detection (Code Insights, MS AI Engineer Coach)
- Taste/preference extraction (taste-ai, Command Code, 4 others)
- Local-first privacy (many tools)
- Interactive REPL (claude-session-analyzer, claude-code-sessions)

These are needed but not the story. The story is the cascade.

### What signa should NOT try to be

- **A session replay tool** — Recall, vibe-replay, and 4 others own this. Not
  our lane.
- **A prompt coach** — AI Coach, Prompt Sensei, and 2 others own this. signa's
  coaching is at the cascade level, not the prompt level.
- **A token optimizer** — TokenPilot, token-diet, and 3 others own this. signa's
  token angle is "your steering is wasting tokens," not "let me trim your
  context."
- **A code-style taste profiler** — taste-ai, Command Code, CoderProfile own
  this. signa profiles the OPERATOR's behavior, not the CODE's style.
- **A "Strava for coding" social tool** — StraVIBE, straude own this. signa's
  social angle is the cascade leaderboard, not sharing sessions.

---

## Part 5: SE — findings and recommendations

### Current state

The current SE (accepted=1.0, corrected=0.5, rejected=0.0, weighted average) is
a starting point. It works (0.99 for your data, 25,987 turns classified) but
it's too simple.

### Findings from the research

**Anthropic's autonomy research:** experienced users auto-approve more BUT
interrupt more often. This means SE isn't linear — the best operators grant
more autonomy AND interrupt more precisely. The current SE rewards acceptance,
but accepting everything isn't good steering.

**HITL correction rate benchmarks:** below 5% = over-reviewing, above 30% = model
needs improvement. Your SE is 0.99 (correction rate 0.7%) — this might indicate
over-acceptance, not excellent steering.

**"From Accuracy to Readiness":** the academic framework has richer metrics —
accept-on-wrong, changed-to-wrong, override frequency, reliance slope,
appropriate reliance rate. None implemented in coding tools.

### Problems with the current SE

1. **Rewards acceptance, not appropriateness.** Accepting bad output scores
   higher than correcting it. The Anthropic research says the best operators
   interrupt MORE.

2. **Proximity-based correction detection.** Marks a turn as "corrected" if the
   user edits the same file within 3 messages. Misses additive edits (adding to
   the file, not fixing it) and slow corrections (beyond the 3-message window).

3. **No distinction between over-correction and appropriate correction.** A
   correction on a file the agent got right (over-correction) scores the same as
   a correction on a file the agent got wrong (appropriate correction).

4. **No temporal dimension.** SE is a single aggregate. No per-session SE, no
   SE-over-time trend, no "your SE dropped this week."

5. **No correlation to Υ validated.** Your SE is 0.99 but your Υ is 283 (POWER,
   not TRANSMITTER). SE alone doesn't predict cascade quality. Needs multi-
   operator correlation analysis (can't do yet — only one operator).

### SE v2 recommendation: Appropriate Steering Index (ASI)

Reframe SE from "acceptance rate" to "appropriate intervention rate." Measure
whether interventions were the RIGHT ones, not just how often you accepted.

**ASI dimensions:**

| Dimension             | What it measures                                                    | How (from logs)                                                           | Confidence                  |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------- |
| Acceptance rate       | % of turns accepted as-is                                           | Turn classification (current)                                             | High                        |
| Correction rate       | % of turns corrected                                                | Turn classification (current)                                             | High                        |
| Rejection rate        | % of turns rejected                                                 | Turn classification (current)                                             | High                        |
| Correction precision  | Of corrections, how many were on files the agent actually got wrong | Infer from error patterns, retry patterns, edit deltas                    | Medium                      |
| Intervention timing   | How quickly you intervene (tight vs loose steering)                 | Timestamp deltas between agent edit and user correction                   | High                        |
| Reliance slope        | How your acceptance rate changes over sessions                      | SE per session over time, trend line                                      | High                        |
| Over-correction index | Corrections on files that didn't need correction                    | Agent's edit followed by successful build/test, but user corrected anyway | Low (needs build/test data) |
| Under-steering index  | Acceptances that led to downstream problems                         | Accepted an edit, then corrected a related file within 5 turns            | Medium                      |

**The honest limitation:** we can't measure all of these from logs alone. Some
require knowing if the code was "correct" — which needs test results, build
status, or runtime behavior. The logreader can infer some (error patterns,
retry patterns) but not all.

**The approach:** measure what we can, estimate what we can't, report confidence
levels. "ASI 0.85 (high confidence — 25,987 turns) · correction precision 0.92
(medium confidence — inferred from edit patterns)"

---

## Part 6: Taste profiling — findings and recommendations

### Current state

The current extractor does:

- Layer 1 (metadata): tool distribution, edit style, reject rate → clean, useful
- Layer 2 (structural): correction loops, convergence, file concentration → clean, useful
- Layer 3 (content): user feedback directives → NOISY (truncated sentences, typos, stream-of-consciousness)

### Findings from the landscape

**Command Code taste-1:** proprietary RL model, learns from every accept/reject/
edit. Opaque, locked to their platform. Profiles the CODE.

**taste-ai:** extracts NAMING, ARCHITECTURE, IMPORTS, ERROR_HANDLING, STYLE from
git history. Produces TASTE.md + BANNED_PATTERNS. Profiles the CODE.

**CoderProfile:** questionnaire-based, exports to CLAUDE.md/.cursorrules.
Profiles the DEVELOPER's stated preferences.

**gitstyle:** from GitHub commit history, 5-stage pipeline. Profiles the CODE
style.

**The key distinction:** these tools profile the CODE. signa should profile the
OPERATOR — their behavior, their steering patterns, their cascade personality.

### Problems with the current taste profile

1. **Layer 3 content extraction is noisy.** The directive extraction catches
   truncated sentences ("use the cli or this .... i relly want to see") and
   stream-of-consciousness fragments, not distilled preferences.

2. **No frequency/confidence weighting.** A directive that appears once gets the
   same display weight as one that appears 50 times.

3. **No temporal decay.** A directive from 29 days ago that the operator has
   stopped caring about still shows up.

4. **No connection to cascade.** The taste profile describes preferences but
   doesn't explain cascade performance.

### Taste profile v2 recommendation: behavioral signature

Reframe the taste profile from content extraction to behavioral signature. Drop
Layer 3 content extraction by default. Make it opt-in "deep taste."

**v2 taste profile = behavioral signature:**

1. **Steering signature** — your ASI dimensions (from SE v2). This IS your taste
   profile at the behavioral level.

2. **Iteration fingerprint** — which files you iterate on most, correction loop
   depth, convergence patterns. The SHAPE of your iteration, not the content.

3. **Workflow rhythm** — tool distribution, session shape (bursty vs steady),
   investigate-to-edit ratio. How you work, not what you work on.

4. **Cascade personality** — pillar distribution, leverage tendency, velocity
   pattern. Are you a cache-hoarder? An output-pusher? An input-minimizer?

5. **Correction taxonomy** — not "what you said" but "what you corrected":
   design files vs logic files vs config files. The CATEGORIES of corrections,
   not the content.

**Layer 3 (content) becomes opt-in "deep taste"** — default off. Solves the
noise problem AND the privacy concern (content extraction is the most
privacy-sensitive part).

### The taste → cascade bridge

This is the coaching nobody else can give. Connect the taste profile to cascade
performance:

- "Your iteration fingerprint shows 78 edits on SCRATCHPAD.md — you're spending
  output tokens on documentation, not production code. This doesn't contribute
  to Υ."
- "Your workflow rhythm is Bash-heavy (50.3%) — you're verifying by running, not
  by reading. This burns cache reads (re-loading context after each run)."
- "Your correction taxonomy shows 6 correction loops on UI components — your
  design taste is specific, and the agent is struggling to match it. Each loop
  costs ~2K input tokens. Feed your taste profile at session start to reduce
  these."
- "Your cascade personality is cache-hoarder (94.8% cache read) — excellent
  leverage, but your velocity is 1.09 (low). You're hoarding context but not
  generating enough output. Push the agent to produce more."

---

## Part 7: signa as "the agent of the product"

### The two surfaces

**Surface 1: Local coach (the operator's daily driver)**

- Reads session logs locally
- Computes cascade + ASI + taste profile
- Coaches on steering, token efficiency, cascade improvement
- Submits to the board (via integrated submit flow)
- Everything stays local

**Surface 2: Site agent (the intelligence behind signalaf.com)**

- NOT a chatbot. The brain that makes the site feel alive.
- Powers operator spotlights ("why MO§ES jumped 3 classes this week")
- Powers trend analysis ("cache read is becoming the dominant pillar across the
  board")
- Powers the visitor experience ("here's what your cascade would look like")
- Coaches from board data only (4 pillars per snapshot) — can't see logs, can't
  build a taste profile, but CAN coach on cascade strategy

### The line between the two

|                | Local signa                 | Site signa                                |
| -------------- | --------------------------- | ----------------------------------------- |
| What it sees   | All 3 layers (your logs)    | Board data only (4 pillars per snapshot)  |
| Taste profile  | Yes (behavioral signature)  | No (can't see your behavior)              |
| SE / ASI       | Yes (from your turns)       | No (no turn data on the board)            |
| Coaching depth | Deep (behavioral + cascade) | Shallow (cascade strategy only)           |
| Privacy        | Everything stays local      | Your submitted pillars are already public |

### The "plug your own agent in" angle (MCP server mode)

signa as MCP server → the operator's existing agent (Claude Code, Cursor,
Windsurf) calls signa's skills through MCP. The operator brings their own LLM.
signa provides the skills (diagnose, simulate, suggest, taste, ASI analysis),
not the brain. No API costs for us. No Ollama install for them. Works inside the
editor where they already are.

### The standalone hosted agent (R&D, tabled)

If budget weren't the constraint: a server-side agent on signalaf.com with its
own Claude API key. A /signa page where visitors chat. Two modes: visitor
(explains the product) and operator (pulls pillars from the board, coaches on
cascade strategy). The brain behind site content: spotlights, trends, anomalies.

Needs: server-side LLM, /signa page, board-data integration, conversation
design. Real work, real API costs. Table until budget or demand.

---

## Part 8: Build recommendations — prioritized

### Phase 1: Build now (no LLM needed, pure code)

**1. SE v2 — Appropriate Steering Index (ASI)**

- Reframe SE from acceptance rate to appropriate intervention rate
- Implement the 8 ASI dimensions from Part 5
- Report confidence levels honestly
- Add per-session ASI + ASI-over-time trend
- This is the differentiator — it needs to be real, not just a number
- **Why first:** SE is the thing nobody else has. It's the moat within the moat.

**2. Taste profile v2 — behavioral signature**

- Drop Layer 3 content extraction by default (solves noise + privacy)
- Reframe as behavioral: steering signature, iteration fingerprint, workflow
  rhythm, cascade personality, correction taxonomy
- Layer 3 becomes opt-in "deep taste" module
- Add frequency weighting + temporal decay
- **Why second:** the taste profile needs to be clean enough to show users.
  The current version has truncated sentence fragments.

**3. The taste → cascade bridge**

- Connect taste profile to cascade coaching
- "Your [taste dimension] is causing [cascade impact] — here's the fix"
- This is the coaching nobody else can give
- **Why third:** this is the unique value proposition. It's what makes signa
  more than a calculator.

**4. Documentation — 4 documents**

- Positioning document (internal): what signa is, what it's NOT, the lane
- User-facing explainer (docs/): what signa does, what it sees, what stays local
- Marketing copy (docs/): the hook, the positioning, the proof, the ecosystem
- Competitive landscape (internal): the 30+ tools, where signa's lane is
- **Why fourth:** needed for launch regardless of which features ship first.
  Also forces clarity on the positioning.

### Phase 2: Build next (needs LLM decision)

**5. MCP server mode**

- Expose signa's skills as MCP tools
- The operator's own agent calls them (Claude Code, Cursor, Windsurf)
- No API cost for us. No Ollama for them.
- This is the reach play — signa works inside the editor where operators are
- **Why fifth:** biggest reach for least cost. The skills are pure functions;
  wrapping as MCP tools is mostly schema work.

**6. LLM wiring**

- Claude API adapter for the REPL (operator brings their own API key)
- Turns the calculator into a conversational coach
- The LLM wraps the existing skills — it picks which skill to call and formats
  the output conversationally
- **Why sixth:** the UX leap from calculator to coach. But the skills need to be
  solid first (Phases 1-3).

### Phase 3: Tabled (needs precondition)

**7. Standalone hosted agent** — needs server-side LLM + API budget. Table until
budget or demand.

**8. Events/hackathons** — needs users first. Table.

**9. Session replay** — crowded space, not our lane. Table.

**10. Multi-platform adapters** (Cursor/Codex/Gemini log readers) — important
but not urgent. Claude Code operators are the first audience. Table.

---

## Part 9: The positioning — for documentation and marketing

### The one-line positioning

**"Every other tool tells you how many tokens you burned. signa tells you what
those tokens were worth."**

### The three-tier analogy

- Tier 1 (StraVIBE): calorie counter — "you burned 48.2M tokens"
- Tier 2 (Code Insights, taste-ai): nutrition diary — "your tool distribution is
  Bash-heavy, your edits are small and targeted"
- Tier 3 (signa): metabolic panel — "your cache leverage is 259×, your velocity
  is 1.09, you're POWER class, and your steering is costing you 19.43M in
  missing output"

### The differentiation table

|                  | Tier 1 (StraVIBE)         | Tier 2 (Code Insights etc.) | Tier 3 (signa)                             |
| ---------------- | ------------------------- | --------------------------- | ------------------------------------------ |
| What it measures | Token volume              | Behavioral patterns         | Cascade architecture                       |
| The metric       | "48.2M tokens"            | "45 anti-patterns detected" | "Υ 283.17, SNR 0.522, Leverage 259×"       |
| The insight      | None (a count)            | Patterns (what you did)     | Architecture (what your tokens were worth) |
| The game         | Consumption               | Analysis                    | Compounding                                |
| The coaching     | None                      | Anti-pattern detection      | Cascade + steering coaching                |
| The leaderboard  | Token volume rank         | None                        | Υ Yield rank                               |
| Privacy          | "Only token counts leave" | Varies                      | "Only 4 integers leave"                    |

### The ecosystem

- **sigrank-mcp** = the instrument (your agent uses it, 4 integers leave)
- **signa** = the coach (you use it, everything stays local, it talks back)
- **signalaf.com** = the leaderboard (where the 4 integers land, where you
  compete)

### The audience

AI coding operators who want to know what their tokens were worth, not just how
many they burned. Operators who want to get better at compounding, not just
consume more. Operators who want to compete on efficiency, not volume.

### The proof

Smoke-tested against 500 real sessions: SE 0.99, Υ 283.17 (POWER), $13K cache
savings, "increase output by 19.43M → Υ 518 (83% gain)." The coaching produces
specific, actionable, cascade-connected insights — not just counts.

---

_Research conducted by DEVIN2, 2026-07-07. Landscape scan of 30+ tools across 6
categories. Companion to RESEARCH_AND_BRAINSTORM.md + PLAN.md + LAUNCH.md._
