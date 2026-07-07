# signa — Marketing Copy

> Internal document. The positioning, hooks, and copy for marketing signa.
> Built by DEVIN2, 2026-07-07.

## The one-liner

**Every other tool tells you how many tokens you burned. signa tells you what
those tokens were worth.**

## The positioning

signa is not an analytics tool. Not a dashboard. Not a token optimizer. Not a
prompt coach. Not a session replay tool.

**signa is the agent that reads your token cascade and talks back about it.**

The cascade is the architecture of your token flow — not how much you burned,
but how well you compounded. Υ Yield, SNR, Leverage, Velocity. The class system
(BASE → TRANSMITTER). Nobody else computes these. signa is the interface to
data that only SigRank has.

## The three-tier analogy

| Tier | Tool | What it tells you | Analogy |
|------|------|-------------------|---------|
| Tier 1 | StraVIBE | "You burned 48.2M tokens" | Calorie counter |
| Tier 2 | Code Insights, taste-ai | "Your tool distribution is Bash-heavy" | Nutrition diary |
| Tier 3 | signa | "Your leverage is 259×, velocity 1.09, you're POWER class, and your steering is costing you 19.43M in missing output" | Metabolic panel |

## The hooks

### For developers

> "Your AI coding agent starts blind. It doesn't know your aesthetic, your
> conventions, or the patterns you keep correcting. signa reads your session
> logs, learns your taste, and tells you how to improve your token cascade."

### For competitive operators

> "You're burning tokens. But are you compounding them? signa measures your
> Υ Yield — the architecture of your token flow — and coaches you toward
> TRANSMITTER class. Climb the leaderboard by getting better, not by burning
> more."

### For privacy-conscious operators

> "Everything stays local. signa reads your session logs on your machine,
> builds your taste profile, and coaches you. Nothing leaves unless you submit
> to the leaderboard — and even then, only 4 integers. Your code, your
> conversation, your taste — all stay on your machine."

## The differentiation

### vs StraVIBE (the closest competitor in form)

StraVIBE and signa look similar: token leaderboard, npm install, "only token
counts leave your machine." But they're opposite games:

- **StraVIBE** ranks on token volume — who burned the most. More tokens = higher rank.
- **signa** ranks on Υ Yield — who compounded the best. Better ratio = higher rank.

StraVIBE is a calorie counter. signa is a metabolic panel.

### vs Code Insights / MS AI Engineer Coach (session analysis)

These tools analyze your sessions and detect anti-patterns. signa does too —
but signa also computes the cascade. No other tool can say "your Bash-heavy
workflow is burning cache reads, which is suppressing your Υ."

### vs taste-ai / Command Code (taste profiling)

These tools profile your CODE style (naming, architecture, imports). signa
profiles your OPERATOR behavior (steering, iteration, workflow rhythm, cascade
personality). And signa connects your behavior to your cascade rank.

### vs TokenPilot / token-diet (token optimization)

These tools trim your context and filter your output. signa doesn't optimize
tokens — it coaches you on which tokens matter. "Your output is only 0.4% of
total — Υ = (cacheRead × output) / input². Low output suppresses your yield."

## The ecosystem

```
sigrank-mcp (instrument)  →  signalaf.com (leaderboard)  ←  signa (coach)
       ↑                              ↑                         ↑
  your agent uses it          where you compete           you use it
  4 integers leave            Υ Yield ranking             everything stays local
```

- **sigrank-mcp** = what you give your agent. It extracts 4 token pillars and
  submits to the board. Privacy: only the integers leave.
- **signa** = what you use yourself. It reads your logs, computes the cascade,
  builds your taste profile, and coaches you. Privacy: everything stays local.
- **signalaf.com** = where you compete. The leaderboard ranks operators by Υ
  Yield, not token volume.

## The proof

Smoke-tested against 500 real Claude Code sessions:

| Metric | Value |
|--------|-------|
| Sessions analyzed | 500 |
| Total tool uses | 14,163 |
| Total edits | 1,836 |
| Class | POWER |
| Υ Yield | 283.17 |
| SE (v1) | 0.99 |
| ASI (v2) | 0.686 |
| Cache leverage | 259.3× |
| Cache savings | $13,314.73 |
| Total cost (30d) | $3,049.28 |

**The coaching insight from the smoke test:** "Your SE is 0.99 but your Υ is
283. You steer well but you're not compounding. Increase output by 19.43M →
Υ 518 (83% gain). Push the agent to produce more, not to accept more."

This is the kind of insight no other tool can give — it requires both the
behavioral data (SE, taste profile) and the cascade formula (Υ).

## The audience

**Primary:** AI coding operators who use Claude Code (or Cursor, Codex, Gemini
when adapters ship) and want to get better at compounding tokens, not just
burning them.

**Secondary:** Team leads who want to understand their team's AI coding
efficiency. (Future: team taste profiles, team cascade benchmarks.)

**Tertiary:** The competitive community — operators who want to climb the
leaderboard by improving their cascade, not by running more sessions.

## What NOT to say

- Don't call signa a "dashboard" — it's a coach that talks back
- Don't call signa an "analytics tool" — it's an agent
- Don't compare signa to Strava — StraVIBE is Strava; signa is the coach
- Don't lead with "session analysis" — that's Tier 2, table stakes
- Don't lead with "taste profiling" — that's part of it, but the cascade is
  the moat
- Don't say "token optimization" — signa coaches on which tokens matter, not
  how to trim them

## What TO say

- Lead with "what your tokens were worth"
- Lead with the cascade (Υ, class system)
- Lead with ASI (nobody else measures steering)
- Lead with the taste → cascade bridge (nobody else connects behavior to rank)
- Lead with "everything stays local"
- Lead with the ecosystem (coach + instrument + leaderboard)
