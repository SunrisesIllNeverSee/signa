---
type: brainstorm
title: signa — fresh R&D + brainstorm (2026-07-07)
description: Honest competitive landscape analysis + fresh brainstorm for signa's identity, SE refinement, taste profiling approach, and position as "the agent of the product." Reckons with the reality that the session-analysis/taste-profiling/token-coaching space is crowded. Identifies what's genuinely novel vs me-too. Built by DEVIN2.
tags:
  [
    sigrank,
    signa,
    brainstorm,
    r&d,
    competitive-landscape,
    steering-efficiency,
    taste,
    agent-of-product,
    documentation,
  ]
timestamp: 2026-07-07T08:30:00Z
---

# signa — fresh R&D + brainstorm

> **Honest premise:** the session-analysis / taste-profiling / token-coaching
> space is CROWDED. This brainstorm reckons with that reality and finds what's
> genuinely ours. Built by DEVIN2, 2026-07-07, after a full landscape scan.
>
> Companion to: PLAN.md (original build plan), LAUNCH.md (launch runbook),
> PLAN_TASTE_SE_RESEARCH.md (the fix-the-bugs plan — now superseded by this
> document's broader scope).

---

## Part 0: The corrected framing (post-StraVIBE check)

**The "crowded space" was a false alarm.** The 30+ tools in the landscape
operate on different data layers than SigRank:

- **Tier 1 (StraVIBE, straude):** raw token counts. "You burned 48.2M tokens."
  A calorie counter. Ranks on volume. Same privacy model as us ("only token
  counts leave") but opposite game — they sum the counts, we compute the
  relationships between them.
- **Tier 2 (Code Insights, taste-ai, MS AI Engineer Coach, 25+ others):**
  behavioral/style analysis. "Your tool distribution is Bash-heavy." A nutrition
  diary. They analyze patterns but don't have the cascade.
- **Tier 3 (SigRank — us):** cascade architecture. "Your leverage is 259×,
  your velocity is 1.09, you're POWER class." A metabolic panel. Nobody else
  computes Υ/SNR/Leverage/Velocity/Class.

**signa is not competing with coaching tools. It's the interface to data that
only SigRank has.** The cascade is the moat. signa is the agent that reads the
moat and talks back about it.

Full landscape scan with 30+ tools inventoried: see
RESEARCH_REPORT_LANDSCAPE_SCAN.md.

---

## Part 1: The landscape — what actually exists

### The crowded fields (Tier 2 — not our competition)

**Session analysis tools (10+):**

- Code Insights — CLI, parses Claude Code/Cursor/Codex/Copilot sessions into SQLite, AI-powered insights, weekly synthesis
- Microsoft AI Engineer Coach — VS Code extension, 45 anti-patterns, reads local session logs
- claude-code-devtools — live tool-call timeline, context inspector, file heatmap, replay scrubber
- Claude Code Session Analyzer — 4 view modes (Chat, API, Stats, Timeline)
- claude-session-analyzer — per-skill token/cost/time analysis
- claude-code-sessions — 11 skills, web dashboard, session intelligence
- cursor-session-tracer — MCP observability layer for Cursor

**Taste/preference profiling tools (6+):**

- Command Code Taste — Meta neuro-symbolic "taste-1" model, continuous RL, learns from every accept/reject/edit
- taste-ai — zero-config auto-learner, compresses context from 56K→1.9K, extracts patterns from git/session logs
- Taster — teach AI your taste by showing examples, reverse-engineers standards
- tasteID — maps design sensibility across 23 dimensions, exports as creative brief
- CoderProfile — turns coding style into AI-ready rules for Claude/Cursor/Codex
- gitstyle — generates personal engineering style wiki from GitHub commit history

**Token optimization tools (5+):**

- TokenPilot — MCP server, AST-aware structural reading, 90% context reduction
- token-diet — always-on token-efficiency skill, ~31% lower bill
- token-optimizer — filters noisy command output, 60-75% reduction
- Token Optimizer (alexgreensh) — 8 surfaces of token waste
- context-stats — live status line, cache keep-warm, MI score

**Session replay tools (6+):**

- Recall — video-player-style replay, 100% local, works with Claude Code/Codex/Gemini
- vibe-replay — animated web replays, one self-contained HTML file, export to MP4/GIF
- claude-replay — self-contained embeddable HTML replays
- claude-trace-replay — trace viewer, token spike spotting, session compare
- Culpa — deterministic replay + counterfactual debugging, fork at decision points
- AgentReel — "Loom for AI coding sessions," shareable scrubbable replays

**"Strava for coding" tools (5+):**

- StraVIBE — tracks every token burned across Claude Code/Codex/Cursor, public leaderboard
- straude — Strava for Claude Code/Codex, auto-posts sessions with AI captions
- DevsLOG — VS Code extension, productivity score, streaks, community
- Gitrava — GitHub activity as 9:16 PNG summaries
- KERN — developer behavioral intelligence, terminal agent, AI standups

**Prompt coaching tools (4+):**

- AI Coach — real-time guidance, hooks into UserPromptSubmit/PostToolUse
- Prompt Sensei — local-first prompt coach, stage-aware feedback, rewrites prompts
- prompt-coach — scores prompts for token efficiency, trains better prompting
- claude-code-prompt-improver — injects right context at right moment

### The academic research (that nobody's using in practice)

- **"From Accuracy to Readiness"** — 4-part taxonomy: Outcome, Reliance & Interaction (accept-on-wrong, changed-to-wrong, override frequency, reliance slope), Safety, Learning & Readiness. The U-C-I lifecycle.
- **Anthropic's "Measuring AI agent autonomy in practice"** — analyzed millions of human-agent interactions. Key finding: experienced users auto-approve more BUT interrupt more often. Autonomy granted vs autonomy interrupted.
- **CoTrace** — goal-level contribution measurement. Models account for 11-26% of goal-shaping.
- **Steerability research** — multi-dimensional goal space, "side-effects" that impede steerability, prompt steerability as shifting behavioral distribution.
- **Human-in-the-Loop patterns** — correction rate benchmarks: below 5% = over-reviewing, above 30% = model needs improvement.

### What NOBODY has (the gaps)

1. **Steering efficiency as a metric.** Nobody measures how well the human steers the agent. Academic research has "reliance slope" and "override frequency" but no coding tool implements them.

2. **Taste → token efficiency connection.** Taste tools (Command Code, taste-ai) don't connect to token coaching. Token tools (TokenPilot, token-diet) don't know your taste. Nobody connects "your taste profile says you prefer large rewrites, and that's costing you 40% more tokens than targeted edits would."

3. **Cascade coaching.** Nobody coaches on multi-step workflow efficiency. RAMP (academic) evaluates cascading failures but doesn't coach. Token tools optimize single interactions.

4. **Behavioral taste inference (from corrections, not questionnaires).** taste-ai extracts patterns from git history. Command Code learns from accepts/rejects. But nobody infers taste from CORRECTION PATTERNS — the shape of how you fix what the agent got wrong.

5. **The leaderboard connection.** StraVIBE and straude have leaderboards, but they're token-count leaderboards. Nobody connects coaching to a cascade-efficiency leaderboard (Υ yield).

6. **Integrated local-first coaching.** Most tools are either local analysis (no coaching) or cloud coaching (no privacy). Nobody does local-first coaching with the full stack (taste + steering + tokens + cascade).

---

## Part 2: What's genuinely ours — the honest assessment

### What signa does that's me-too

If signa ONLY does session analysis, it's competing with Code Insights, Microsoft AI Engineer Coach, and 8 other tools. If it ONLY does taste profiling, it's competing with Command Code, taste-ai, and 4 others. If it ONLY does token coaching, it's competing with TokenPilot, token-diet, and 3 others.

**These are table stakes now, not differentiators.** signa needs them, but they're not the story.

### What signa does that's genuinely novel

**1. Steering Efficiency (SE) — the thing nobody else measures**

This is the real differentiator. The academic research has the vocabulary (reliance slope, override frequency, appropriate reliance) but no coding tool implements it. signa has a working SE computation (0.99 for your data, 25,987 turns classified). It needs refinement, but the concept is ours.

The insight: **every other tool measures the agent. signa measures the operator.**

- Token tools: "the agent used too many tokens"
- Taste tools: "the agent doesn't match your taste"
- Prompt coaches: "your prompt was ambiguous"
- **signa: "your steering is costing you tokens"**

SE flips the lens. The agent isn't the problem — your steering is. And SE quantifies that.

**2. The cascade connection — taste/steering → Υ yield**

No other tool connects human behavior to the cascade metric. signa can say: "your SE is 0.99 but your Υ is 283 (POWER). You steer well but you're not compounding. The gap is your output volume — you're accepting everything but not pushing the agent to produce enough. Increase output by 19.43M → Υ 518 (83% gain)."

This is the bridge nobody else has: human behavior → cascade metric → coaching action.

**3. The two-tool architecture — coach + instrument**

signa (coach, reads everything, stays local) + sigrank-mcp (instrument, extracts 4 integers, submits to board). The privacy boundary is the product design, not an afterthought. No other tool has this separation — they're either all-local (no leaderboard) or all-cloud (no privacy).

**4. The leaderboard ecosystem**

StraVIBE has a token leaderboard. But it's a token-COUNT leaderboard — who burned the most. SigRank's board is a cascade-EFFICIENCY leaderboard — who compounded the best. signa coaches you toward better Υ, which is the leaderboard metric. The coaching is connected to the competition.

### What signa should NOT try to be

- **A session replay tool.** Recall, vibe-replay, and 4 others own this. signa doesn't need to replay sessions — it needs to coach from them.
- **A prompt coach.** AI Coach, Prompt Sensei, and 2 others own this. signa's coaching is at the cascade/steering level, not the prompt level.
- **A token optimizer.** TokenPilot, token-diet, and 3 others own this. signa's token angle is "your steering is wasting tokens," not "let me trim your context."
- **A "Strava for coding" social tool.** StraVIBE, straude, and 3 others own this. signa's social angle is the leaderboard competition, not sharing sessions.

**signa is the coach that connects your behavior to your cascade rank.** That's the lane. Everything else is someone else's lane.

---

## Part 3: SE — fresh thinking

### The current SE is too simple

The current SE (accepted=1.0, corrected=0.5, rejected=0.0, weighted average) is a starting point, not a finished metric. The academic research gives us much richer vocabulary:

**From "From Accuracy to Readiness":**

- **Accept-on-wrong** — accepting incorrect AI output (false positive)
- **Changed-to-wrong** — changing correct AI output (false negative)
- **Override frequency** — how often you override the agent
- **Reliance slope** — how your reliance changes as you learn the agent's capabilities
- **Appropriate reliance rate** — relying on the agent when you should, overriding when you should

**From Anthropic's autonomy research:**

- **Autonomy granted** — how much you let the agent do without intervention
- **Autonomy interrupted** — how often you step in
- **Key finding:** experienced users auto-approve more BUT interrupt more often. This means SE isn't linear — the best operators grant more autonomy AND interrupt more precisely.

**From the HITL patterns:**

- **Correction rate benchmarks:** below 5% = over-reviewing, above 30% = model needs improvement. Your SE is 0.99 (correction rate 0.7%) — this might indicate over-acceptance, not excellent steering.

### The reframe: SE should measure appropriateness, not just acceptance

The current SE rewards acceptance. But accepting everything isn't good steering — sometimes you SHOULD reject or correct. The Anthropic research shows the best operators interrupt MORE, not less.

**Proposed SE v2: Appropriate Steering Index (ASI)**

Instead of "how often did you accept," measure "how often did you make the RIGHT intervention":

| Situation                        | Right intervention       | Wrong intervention                    |
| -------------------------------- | ------------------------ | ------------------------------------- |
| Agent output is correct          | Accept (1.0)             | Correct/reject (over-correction, 0.3) |
| Agent output is wrong            | Correct/reject (0.5-1.0) | Accept (under-steering, 0.0)          |
| Agent output is taste-mismatched | Correct (0.7)            | Accept (taste-blind, 0.3)             |
| Agent output is taste-matched    | Accept (1.0)             | Correct (over-steering, 0.3)          |

The problem: we can't always tell if agent output was "correct" vs "wrong" from the logs alone. But we CAN infer:

- If the agent edited a file and the user never touched it again → likely correct (accepted)
- If the agent edited a file and the user re-edited it within 2 turns → likely wrong (corrected)
- If the user rejected the tool use → likely wrong (rejected)
- If the user's next message is a new direction → likely correct (accepted)
- If the user's next message contains "no", "wrong", "revert" → likely wrong (corrected)

**This is what the current SE already does — but it doesn't distinguish "over-correction" from "appropriate correction."** The v2 should.

### SE v2 dimensions

Instead of one number, SE v2 should report:

1. **Acceptance rate** — what % of turns you accepted (current SE)
2. **Correction rate** — what % you corrected (current SE)
3. **Rejection rate** — what % you rejected (current SE)
4. **Correction precision** — of your corrections, how many were on files the agent actually got wrong (vs files you were just adding to). Estimated via: did the agent's edit have errors? did the user's correction fix a bug or add a feature?
5. **Intervention timing** — how quickly you intervene (fast = tight steering, slow = loose steering). Measured via timestamp deltas.
6. **Reliance slope** — how your acceptance rate changes over sessions. Are you trusting the agent more (learning) or less (losing confidence)?
7. **Over-correction index** — corrections on files that didn't need correction (estimated via: the agent's edit was followed by a successful build/test, but you corrected anyway)
8. **Under-steering index** — acceptances that led to downstream problems (estimated via: you accepted an edit, then had to correct a RELATED file within 5 turns)

### The honest limitation

We can't measure all of these from logs alone. Some require knowing if the code was "correct" — which needs test results, build status, or runtime behavior. The logreader can infer SOME of this (error patterns, retry patterns) but not all.

**The approach:** measure what we can, estimate what we can't, and be honest about the confidence level. SE v2 reports both the number AND the confidence: "ASI 0.85 (high confidence — 25,987 turns) · correction precision 0.92 (medium confidence — inferred from edit patterns)"

---

## Part 4: Taste profiling — fresh thinking

### The current taste profile is metadata + noisy content extraction

The current extractor does:

- Layer 1 (metadata): tool distribution, edit style, reject rate → clean, useful
- Layer 2 (structural): correction loops, convergence, file concentration → clean, useful
- Layer 3 (content): user feedback directives → NOISY (truncated sentences, typos, stream-of-consciousness)

### The competitive landscape for taste

- **Command Code taste-1** — proprietary RL model, learns from every accept/reject/edit. Opaque, locked to their platform.
- **taste-ai** — extracts NAMING, ARCHITECTURE, IMPORTS, ERROR_HANDLING, STYLE from git history. Produces TASTE.md + BANNED_PATTERNS. Zero-config.
- **CoderProfile** — questionnaire-based, exports to CLAUDE.md/.cursorrules.
- **gitstyle** — from GitHub commit history, 5-stage pipeline, Obsidian-compatible markdown.

### What's our angle?

**These tools profile the CODE. signa profiles the OPERATOR.**

- taste-ai: "your code uses snake_case, early returns, try/catch" → code style
- Command Code: "the agent should produce output matching your patterns" → agent alignment
- **signa: "you iterate heavily on visual layout, you prefer large numbers, you correct design more than logic, your steering is 0.99 but your cascade is POWER"** → operator behavior

The taste profile isn't about the code — it's about the PERSON. How they work, what they care about, where they spend their corrections, what their steering patterns reveal.

### Taste profile v2 — the reframe

**Drop the Layer 3 content extraction (or make it optional).** The noisy directive extraction ("use the cli or this .... i relly want to see") isn't worth the noise. Instead:

**v2 taste profile = behavioral signature, not content extraction:**

1. **Steering signature** — your SE dimensions (acceptance, correction, rejection, timing, reliance slope). This IS your taste profile at the behavioral level.

2. **Iteration fingerprint** — which files you iterate on most, your correction loop depth, your convergence patterns. Not what you said about the design — the SHAPE of your iteration.

3. **Workflow rhythm** — your tool distribution, your session shape (bursty vs steady), your investigate-to-edit ratio. How you work, not what you work on.

4. **Cascade personality** — your pillar distribution, your leverage tendency, your velocity pattern. Are you a cache-hoarder? An output-pusher? An input-minimizer?

5. **Correction taxonomy** — not "what you said" but "what you corrected": design files vs logic files vs config files. The CATEGORIES of your corrections, not the content.

**Layer 3 (content) becomes an optional, opt-in "deep taste" module** that the operator can enable if they want content-based preference extraction. Default: off. This solves the noise problem AND the privacy concern (content extraction is the most privacy-sensitive part).

### The taste → cascade bridge

This is the thing nobody else has. The taste profile should directly explain cascade performance:

- "Your iteration fingerprint shows 78 edits on SCRATCHPAD.md — you're spending output tokens on documentation, not production code. This doesn't contribute to Υ."
- "Your workflow rhythm is Bash-heavy (50.3%) — you're verifying by running, not by reading. This burns cache reads (re-loading context after each run)."
- "Your correction taxonomy shows 6 correction loops on UI components — your design taste is specific, and the agent is struggling to match it. Each loop costs ~2K input tokens. Feed your taste profile at session start to reduce these."
- "Your cascade personality is cache-hoarder (94.8% cache read) — excellent leverage, but your velocity is 1.09 (low). You're hoarding context but not generating enough output. Push the agent to produce more."

**This is the coaching that no other tool can give** — because no other tool connects behavioral taste to cascade metrics.

---

## Part 5: signa as "the agent of the product"

### The two surfaces

**Surface 1: Local coach (the operator's daily driver)**

- Reads your session logs
- Computes your cascade + SE + taste profile
- Coaches you on steering, token efficiency, cascade improvement
- Submit to the board (via the integrated submit flow)
- Everything stays local

**Surface 2: Site agent (the intelligence behind signalaf.com)**

- NOT a chatbot. The brain that makes the site feel alive.
- Powers operator spotlights ("why MO§ES jumped 3 classes this week")
- Powers trend analysis ("cache read is becoming the dominant pillar across the board")
- Powers the visitor experience ("you're thinking about trying SigRank? Here's what your cascade would look like")
- Coaches from board data only (4 pillars per snapshot) — can't see your logs, can't build a taste profile, but CAN coach on cascade strategy

### The line between the two

|                      | Local signa                 | Site signa                                |
| -------------------- | --------------------------- | ----------------------------------------- |
| **What it sees**     | All 3 layers (your logs)    | Board data only (4 pillars per snapshot)  |
| **Taste profile**    | Yes (behavioral signature)  | No (can't see your behavior)              |
| **SE**               | Yes (from your turns)       | No (no turn data on the board)            |
| **Coaching depth**   | Deep (behavioral + cascade) | Shallow (cascade strategy only)           |
| **Privacy**          | Everything stays local      | Your submitted pillars are already public |
| **The relationship** | Your daily driver           | The site's intelligence                   |

### The "plug your own agent in" angle

This is the MCP server mode — and it's the cleanest path for the local coach:

- signa as MCP server → the operator's existing agent (Claude Code, Cursor, Windsurf) calls signa's skills
- The operator brings their own LLM (whatever they're already paying for)
- signa provides the skills (diagnose, simulate, suggest, taste, SE analysis), not the brain
- No API costs for you. No Ollama install for them.
- Works inside the editor where they already are.

**This is the "basic site agent that worked for aqua" pattern inverted** — instead of you hosting the agent, the operator's own agent hosts signa's skills. The operator's Claude Code calls `signa_diagnose`, `signa_suggest`, `signa_taste` through MCP.

### The standalone hosted agent (the R&D play)

If budget weren't the constraint, the standalone hosted signa would be:

1. A server-side agent on signalaf.com with its own Claude API key
2. A `/signa` page where visitors chat with the agent
3. Two modes: visitor mode (explains the product, no data needed) and operator mode (pulls your pillars from the board, coaches on cascade strategy)
4. The brain behind site content: spotlights, trends, anomalies
5. Eventually: the events coordinator (when challenges/hackathons come)

**This needs: server-side LLM, /signa page, board-data integration, conversation design. Real work, real API costs. Table it until the budget's there or the local agent proves demand.**

---

## Part 6: Documentation structure — for marketing and users

### What needs to exist

**1. The positioning document (internal)**

- What signa is (the coach that connects your behavior to your cascade rank)
- What signa is NOT (not a session replay tool, not a prompt coach, not a token optimizer, not a Strava-for-coding social tool)
- The lane: behavioral coaching → cascade improvement → leaderboard competition
- The differentiation: SE (nobody else measures it), taste→cascade bridge (nobody else connects them), two-tool architecture (coach + instrument)

**2. The user-facing explainer (docs/)**

- "What is signa?" — one paragraph, plain language
- "How it works" — the 3 layers, the cascade, the SE, the taste profile — explained without jargon
- "What it sees" — honest about what signa reads from your logs
- "What stays local" — the privacy promise
- "signa vs sigrank-mcp" — the two-tool architecture, why they're separate
- "Steering Efficiency" — what it is, what your number means, how to improve it
- "The taste profile" — what it captures, what it doesn't, how to use it

**3. The marketing copy (docs/)**

- The hook: "Every other tool measures the agent. signa measures you."
- The positioning: not analytics, not optimization — coaching
- The proof: smoke-tested against 500 real sessions, SE 0.99, $13K cache savings, Υ 283 → 518 with one adjustment
- The ecosystem: signa (coach) + sigrank-mcp (instrument) + signalaf.com (leaderboard)
- The audience: AI coding operators who want to get better, not just measure

**4. The competitive landscape doc (internal, for positioning)**

- The 30+ tools in the space, what each does, where signa's lane is
- The "what we don't compete on" list (session replay, prompt coaching, token optimization, social sharing)
- The "what's ours" list (SE, taste→cascade bridge, two-tool architecture, leaderboard ecosystem)

---

## Part 7: Execution priorities

### What to build now (no LLM needed, pure code)

1. **SE v2 — Appropriate Steering Index** — reframe SE from "acceptance rate" to "appropriate intervention rate." Add the dimensions from Part 3. Be honest about confidence levels. This is the differentiator — it needs to be real, not just a number.

2. **Taste profile v2 — behavioral signature** — drop the noisy Layer 3 content extraction by default. Reframe the profile as behavioral (steering signature, iteration fingerprint, workflow rhythm, cascade personality, correction taxonomy). Make Layer 3 an opt-in "deep taste" module.

3. **The taste → cascade bridge** — connect the taste profile to cascade coaching. "Your iteration fingerprint shows X, and that's costing you Y in Υ." This is the coaching nobody else can give.

4. **Documentation** — the 4 documents from Part 6. These are needed for launch regardless of which features ship first.

### What to build next (needs LLM decision)

5. **MCP server mode** — expose signa's skills as MCP tools. The operator's own agent calls them. No API cost for us. This is the reach play.

6. **LLM wiring** — Claude API adapter for the REPL. Turns the calculator into a conversational coach. The operator brings their own API key.

### What to table

7. **Standalone hosted agent** — needs server-side LLM + API budget. Table until budget or demand.
8. **Events/hackathons** — needs users first. Table.
9. **Session replay** — crowded space, not our lane. Table.
10. **Multi-platform adapters** — Cursor/Codex/Gemini log readers. Important but not urgent. Claude Code operators are the first audience.

---

## Part 8: The honest summary

**The space is crowded.** 30+ tools do parts of what signa does. Session analysis, taste profiling, token optimization, session replay, prompt coaching, Strava-for-coding — all have multiple players.

**What's genuinely ours:**

1. **Steering Efficiency** — nobody measures how well the human steers. The academic research has the vocabulary but no coding tool implements it. signa has a working (if simple) version. SE v2 (ASI) makes it real.
2. **Taste → cascade bridge** — nobody connects behavioral taste to cascade metrics. signa can say "your steering costs you X tokens, your iteration pattern costs you Y Υ."
3. **Two-tool architecture** — coach (local, reads everything) + instrument (extracts 4 integers, submits to board). The privacy boundary IS the product design.
4. **Leaderboard ecosystem** — the coaching is connected to the competition. You coach toward better Υ, which is the leaderboard metric.

**What's NOT ours (and shouldn't be):**

- Session replay (Recall, vibe-replay own this)
- Prompt coaching (AI Coach, Prompt Sensei own this)
- Token optimization (TokenPilot, token-diet own this)
- Social sharing (StraVIBE, straude own this)
- Code-style taste profiling (taste-ai, Command Code own this)

**signa's lane: behavioral coaching that connects your steering to your cascade rank.** Everything else is someone else's lane.

**The build priority: SE v2 (the differentiator) → taste profile v2 (the behavioral reframe) → taste→cascade bridge (the coaching nobody else has) → documentation (for launch). Then MCP mode (reach) → LLM wiring (conversation). Table the rest.**

---

_Built by DEVIN2, 2026-07-07. Fresh R&D after landscape scan of 30+ tools. Companion to PLAN.md + LAUNCH.md. Supersedes PLAN_TASTE_SE_RESEARCH.md (which was bug-fix scoped; this is the broader reframe)._
