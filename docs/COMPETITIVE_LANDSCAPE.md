# signa — Competitive Landscape (Internal)

> Internal document. The full landscape scan, what each tool does, and where
> signa's lane is. Built by DEVIN2, 2026-07-07. Full research report:
> RESEARCH_REPORT_LANDSCAPE_SCAN.md.

## The three tiers

### Tier 1: Raw token counts (calorie counters)

| Tool | What it ranks | Metric | Privacy |
|------|---------------|--------|---------|
| StraVIBE | Total tokens burned | Token volume | Only token counts leave |
| straude | Total tokens burned | Token volume | Only aggregate stats uploaded |
| DevsLOG | Productivity score, streaks | LOC + time | VS Code extension |
| Gitrava | GitHub activity | LOC additions/deletions | GitHub OAuth |
| KERN | Developer behavioral intelligence | Activity classification | Terminal agent |

**The critical finding:** StraVIBE is the closest competitor in form (token
leaderboard, npm install, privacy model) but the farthest in substance.
StraVIBE ranks on volume. SigRank ranks on efficiency. Same privacy model,
opposite game.

**StraVIBE is a calorie counter. SigRank is a metabolic panel.**

### Tier 2: Behavioral/style analysis (pattern finders)

#### Session analysis (7 tools)

| Tool | What it does |
|------|-------------|
| Code Insights | CLI, parses sessions into SQLite, AI insights, weekly synthesis |
| MS AI Engineer Coach | VS Code extension, 45 anti-patterns, reads local logs |
| claude-code-devtools | Live tool-call timeline, context inspector, replay scrubber |
| Claude Code Session Analyzer | 4 view modes (Chat, API, Stats, Timeline) |
| claude-session-analyzer | Per-skill token/cost/time analysis |
| claude-code-sessions | 11 skills, web dashboard, session intelligence |
| cursor-session-tracer | MCP observability for Cursor, trace graphs |

#### Taste/preference profiling (6 tools)

| Tool | What it profiles | Approach |
|------|-----------------|----------|
| Command Code Taste | Code style (RL model) | Proprietary, opaque |
| taste-ai | Code style (naming, architecture, imports) | Git/session extraction |
| Taster | Standards from examples | Example-based learning |
| tasteID | Design sensibility (23 dimensions) | Questionnaire |
| CoderProfile | Coding style rules | Questionnaire + repo scan |
| gitstyle | Engineering style wiki | Git history extraction |

**Key distinction:** these tools profile the CODE. signa profiles the OPERATOR.

#### Token optimization (5 tools)

| Tool | What it does | Reduction |
|------|-------------|-----------|
| TokenPilot | AST-aware structural reading, MCP server | Up to 90% context |
| token-diet | Always-on token-efficiency skill | ~31% lower bill |
| token-optimizer | Filters noisy command output | 60-75% |
| Token Optimizer (alexgreensh) | 8 surfaces of token waste | Not specified |
| context-stats | Live monitoring, cache keep-warm | Monitoring |

#### Session replay (6 tools)

| Tool | What it does |
|------|-------------|
| Recall | Video-player replay, 100% local |
| vibe-replay | Animated web replays, HTML/GIF export |
| claude-replay | Embeddable HTML replays |
| claude-trace-replay | Trace viewer, token spike spotting |
| Culpa | Deterministic replay + counterfactual debugging |
| AgentReel | "Loom for AI coding," MP4 export |

#### Prompt coaching (4 tools)

| Tool | What it does |
|------|-------------|
| AI Coach | Real-time guidance, hooks into events |
| Prompt Sensei | Local-first, stage-aware, rewrites prompts |
| prompt-coach | Scores prompts for token efficiency |
| claude-code-prompt-improver | Context injection at right moment |

### Tier 3: Cascade architecture (us, only)

| Tool | What it measures | The game |
|------|-----------------|----------|
| signa + sigrank-mcp + signalaf.com | Υ Yield, SNR, Leverage, Velocity, Class, ASI | Compounding — who compounded the best |

## The academic research (not implemented in any coding tool)

- "From Accuracy to Readiness" — reliance & interaction metrics taxonomy
- Anthropic "Measuring AI agent autonomy" — best operators interrupt MORE
- CoTrace — goal-level contribution measurement
- Steerability research — multi-dimensional goal space, side-effects
- Preference learning — Bayesian inverse planning, structured preferences
- HITL patterns — correction rate benchmarks (5% = over-reviewing, 30% = model needs help)

## What's genuinely ours

1. **The cascade formula** — nobody else computes Υ/SNR/Leverage/Velocity
2. **ASI** — nobody else measures steering quality
3. **Taste → cascade bridge** — nobody else connects behavior to rank
4. **Two-tool architecture** — coach + instrument, privacy boundary = product design
5. **Leaderboard ecosystem** — coaching connected to competition via Υ

## What's me-too (table stakes)

- Session log parsing
- Tool call distribution
- Token cost breakdown
- Correction loop detection
- Taste/preference extraction
- Local-first privacy
- Interactive REPL

## What we don't compete on

- Session replay (Recall, vibe-replay own this)
- Prompt coaching (AI Coach, Prompt Sensei own this)
- Token optimization (TokenPilot, token-diet own this)
- Code-style profiling (taste-ai, Command Code own this)
- Social sharing (StraVIBE, straude own this)

## The moat

The cascade formula is the moat. It's proprietary, derived from the
relationship between the four token pillars. Nobody else has it. Everything
signa does (ASI, taste profiling, taste→cascade bridge, coaching) is built on
top of the cascade. The formula is the intellectual property; the four
integers are the input; the cascade is the output.

**signa is the interface to data that only SigRank has.**
