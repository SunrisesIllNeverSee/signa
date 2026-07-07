# signa — Positioning (Internal)

> Internal document. Defines what signa is, what it's NOT, and where its lane
> is. Built by DEVIN2, 2026-07-07.

## What signa IS

signa is the interactive agent that reads your AI coding session logs, computes
the token cascade architecture, builds a behavioral taste profile, and coaches
you on what your tokens were worth.

**The cascade is the moat.** Nobody else computes Υ Yield, SNR, Leverage,
Velocity, or the class system. These are proprietary metrics derived from the
relationship between the four token pillars. signa is the interface to that
data.

## What signa is NOT

- **NOT a session replay tool.** Recall, vibe-replay, and 4 others own this.
  signa doesn't replay sessions — it coaches from them.
- **NOT a prompt coach.** AI Coach, Prompt Sensei, and 2 others own this.
  signa's coaching is at the cascade/steering level, not the prompt level.
- **NOT a token optimizer.** TokenPilot, token-diet, and 3 others own this.
  signa's token angle is "your steering is wasting tokens," not "let me trim
  your context."
- **NOT a code-style taste profiler.** taste-ai, Command Code, CoderProfile
  own this. signa profiles the OPERATOR's behavior, not the CODE's style.
- **NOT a "Strava for coding" social tool.** StraVIBE, straude own this.
  signa's social angle is the cascade leaderboard, not sharing sessions.
- **NOT a dashboard.** signa is a coach that talks back, not a passive display.

## The lane

**Behavioral coaching that connects your steering to your cascade rank.**

This lane is defined by three things only signa has:
1. The cascade formula (Υ/SNR/Leverage/Velocity/Class)
2. ASI (Appropriate Steering Index — nobody else measures steering)
3. The taste → cascade bridge (nobody else connects behavior to rank)

## The three-tier model

| Tier | What it measures | Example tools | The game |
|------|-----------------|---------------|----------|
| Tier 1 | Token volume (raw count) | StraVIBE, straude | Consumption — who burned the most |
| Tier 2 | Behavioral patterns | Code Insights, taste-ai, MS AI Engineer Coach | Analysis — understand what happened |
| Tier 3 | Cascade architecture | signa (only) | Compounding — who compounded the best |

Tier 1 and Tier 3 have the same privacy model ("only token counts leave") but
opposite games. Tier 1 sums the counts. Tier 3 computes the relationships.

Tier 2 tools don't compete with Tier 3 — they operate on behavioral patterns,
not cascade architecture. They can complement signa but can't replace it.

## The two-tool architecture

| | signa | sigrank-mcp |
|---|---|---|
| Who uses it | You (the operator) | Your AI agent |
| What it reads | All 3 layers (metadata + structural + content) | 4 token pillars only |
| What it does | Coaches, taste profiles, ASI | Extracts, signs, submits |
| What leaves | Nothing | 4 integers |
| Privacy | Everything stays local | Only token counts leave |

The privacy boundary IS the product design. signa reads everything but stays
local. sigrank-mcp extracts only 4 integers and submits. They're separate tools
for separate jobs with different privacy boundaries.

## The two surfaces

1. **Local coach** (the operator's daily driver) — reads logs, computes
   cascade + ASI + taste, coaches, submits to board. Everything local.

2. **Site agent** (the intelligence behind signalaf.com) — powers insights,
   spotlights, trends. Coaches from board data only (4 pillars per snapshot).
   Can't see logs, can't build taste profile, but CAN coach on cascade strategy.

## What to build (prioritized)

1. **SE v2 (ASI)** — DONE. The differentiator within the differentiator.
2. **Taste profile v2** — DONE. Behavioral signature, Layer 3 opt-in.
3. **Taste → cascade bridge** — DONE. The coaching nobody else can give.
4. **Documentation** — IN PROGRESS. Needed for launch.
5. **MCP server mode** — NEXT. Plug-your-own-agent, no API cost for us.
6. **LLM wiring** — AFTER MCP. Claude API adapter for REPL.

## What to table

- Standalone hosted agent (needs server-side LLM + API budget)
- Events/hackathons (needs users first)
- Session replay (not our lane)
- Multi-platform adapters (important but not urgent)
