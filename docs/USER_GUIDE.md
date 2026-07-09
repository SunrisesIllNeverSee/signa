# signa — User Guide

> signa is the interactive agent that reads your AI coding session logs,
> computes your token cascade, and coaches you on what your tokens were worth.

## What is signa?

Every other tool tells you how many tokens you burned. signa tells you what
those tokens were worth.

signa reads your Claude Code session logs locally (the `.jsonl` files in
`~/.claude/projects/`), computes the full token cascade architecture, builds a
behavioral taste profile from your correction patterns, and coaches you on
steering efficiency and cascade improvement.

**Everything stays local. Nothing leaves your machine.**

## Install

```bash
git clone https://github.com/SunrisesIllNeverSee/signa.git
cd signa
npm link
signa --help
```

Requires Node.js >= 18. Zero npm dependencies — pure Node.js stdlib.

## Quick start

```bash
signa                    # Start interactive REPL
signa scan               # Read logs, compute everything, save
signa diagnose           # "How am I doing?"
signa taste              # "What's my taste profile?"
signa suggest            # "What should I do differently?"
signa simulate input -50%  # "What if I cut my input in half?"
signa goal transmitter   # "How do I hit TRANSMITTER?"
signa cost               # "How much did I spend?"
signa self-improve       # Full cycle: diagnose → suggest → actions
```

## The cascade — what signa measures

The cascade is the architecture of your token flow. It's not how many tokens
you burned — it's how well you compounded them.

### The four pillars

| Pillar           | What it is                         | What it means                       |
| ---------------- | ---------------------------------- | ----------------------------------- |
| **Input**        | Fresh tokens you send to the agent | Your instructions, prompts, context |
| **Output**       | Tokens the agent generates back    | Code, analysis, explanations        |
| **Cache Create** | Tokens written to the cache        | Context you're saving for reuse     |
| **Cache Read**   | Tokens read from the cache         | Context you're reusing (cheap)      |

### The cascade metrics

| Metric       | Formula                       | What it measures                          |
| ------------ | ----------------------------- | ----------------------------------------- |
| **Υ Yield**  | (cacheRead × output) / input² | How well you compound tokens into output  |
| **SNR**      | output / (input + output)     | Signal-to-noise ratio of your token flow  |
| **Leverage** | cacheRead / input             | How much you reuse vs re-instruct         |
| **Velocity** | output / input                | How much output you get per unit of input |

### The class system

| Class       | Υ Range        | What it means                                |
| ----------- | -------------- | -------------------------------------------- |
| BASE        | 0 - 100        | Starting point — raw token usage             |
| POWER       | 100 - 1,000    | Good compounding — cache leverage working    |
| ARCHITECT   | 1,000 - 5,000  | Excellent — high leverage + high velocity    |
| ARCHITECT+  | 5,000 - 15,000 | Exceptional — multi-dimensional efficiency   |
| TRANSMITTER | 15,000+        | Elite — the cascade is compounding optimally |

## Steering Efficiency (SE) and ASI

### SE v1 (legacy)

SE measures how often you accept the agent's output vs correct it vs reject it:

- **Accepted (1.0):** The agent's output was used as-is
- **Corrected (0.5):** You re-edited the same file the agent edited
- **Rejected (0.0):** A tool use was explicitly rejected

```
SE = (1.0 × accepted + 0.5 × corrected + 0.0 × rejected) / total turns
```

### ASI v2 (Appropriate Steering Index)

SE v1 rewards acceptance — but Anthropic's research shows the best operators
interrupt MORE, not less. Accepting everything isn't good steering.

ASI v2 measures whether your interventions were the RIGHT ones:

| Dimension             | What it measures                               | Confidence |
| --------------------- | ---------------------------------------------- | ---------- |
| Acceptance rate       | % of turns accepted                            | High       |
| Correction rate       | % of turns corrected                           | High       |
| Rejection rate        | % of turns rejected                            | High       |
| Correction precision  | Of corrections, how many were likely needed    | Medium     |
| Intervention timing   | How quickly you intervene                      | High       |
| Reliance slope        | How acceptance changes over sessions           | High       |
| Over-correction index | Corrections on files likely already correct    | Low        |
| Under-steering index  | Acceptances that led to downstream corrections | Medium     |

**What's a good ASI?** Higher is better, but the goal isn't 1.0 — it's
appropriate intervention. The best operators accept when they should, correct
when they should, and reject when they should. ASI measures the quality of
your interventions, not just their frequency.

## The taste profile

The taste profile is your behavioral signature — how you work, not what you
work on. It's saved at `~/.signa/taste-profile.json` and is:

- **Local-only** — never submitted, never leaves your machine
- **Operator-owned** — you can read it, edit it, share it, or delete it
- **Agent-readable** — any agent on your machine can read it at session start

### Five dimensions

1. **Steering signature** — your ASI dimensions (how you steer)
2. **Iteration fingerprint** — which files you iterate on, loop depth,
   convergence patterns (where you focus)
3. **Workflow rhythm** — tool distribution, investigate-to-edit ratio, session
   shape (how you work)
4. **Cascade personality** — pillar distribution, leverage tendency, velocity
   pattern (your token flow style)
5. **Correction taxonomy** — design vs logic vs config corrections (what you
   correct, by category)

### Deep taste (opt-in)

By default, signa does NOT read the content of your messages or code. The taste
profile is built from behavioral signals (metadata + patterns), not content.

If you want content-based preference extraction ("you prefer large numbers,
no median display, gold accent"), enable deep taste:

```bash
signa scan --deep-taste
```

This reads your user feedback messages and extracts preference directives.
It's filtered for noise (truncated sentences, typos, stream-of-consciousness
are removed). The raw content is not retained — only the distilled preferences.

**Privacy note:** Deep taste reads your message content. It still stays local
and is never submitted. But it's the most privacy-sensitive part of signa.
That's why it's opt-in.

## The taste → cascade bridge

This is the coaching no other tool can give. signa connects your behavioral
taste profile to your cascade performance:

- "Your workflow is Bash-heavy (50.3%) — each Bash command displaces cached
  context. Your cache read is 94.8% but your velocity is only 1.09."
- "Your 25 correction loops on UI components cost ~50K input tokens. Feed your
  design preferences at session start to reduce these."
- "Your output is only 0.4% of total tokens — Υ = (cacheRead × output) /
  input². Low output directly suppresses your yield."

No other tool can make these statements because no other tool has both the
behavioral taste profile AND the cascade formula.

## signa vs sigrank-mcp

|                              | signa                                                 | sigrank-mcp                                        |
| ---------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| **Who uses it**              | You, the operator                                     | Your AI agent (Claude Code, Cursor)                |
| **What it reads**            | All 3 signal layers (metadata + structural + content) | 4 token pillars only                               |
| **What it does**             | Coaches you, builds taste profile, computes ASI       | Extracts pillars, submits to leaderboard           |
| **What leaves your machine** | Nothing                                               | 4 integers (input, output, cacheCreate, cacheRead) |
| **Privacy**                  | Everything stays local                                | Only token counts leave                            |

They're separate tools for separate jobs:

- **signa** = the coach (you use it, it reads everything, stays local)
- **sigrank-mcp** = the instrument (your agent uses it, 4 integers leave)

## Privacy

Everything stays local. signa reads your session logs, computes the cascade,
builds the taste profile, and coaches you — all on your machine. Nothing is
transmitted unless you explicitly use `signa submit` (which sends only the 4
token pillars to the leaderboard, same as sigrank-mcp).

**Deep taste** (opt-in) reads your message content but still stays local. The
raw content is not retained — only distilled preferences.

## File layout

```
~/.signa/
  taste-profile.json   — your taste profile (behavioral signature)
  history.json         — cascade metrics over time (append-only, capped at 1000)
  settings.json        — codename, platform, log root path
```

## Skills

| Skill          | Trigger                        | What it does                                   |
| -------------- | ------------------------------ | ---------------------------------------------- |
| `scan`         | "scan", "refresh"              | Read logs, compute cascade + ASI + taste, save |
| `diagnose`     | "how am I doing", "audit"      | Pillar-level audit + ASI breakdown             |
| `simulate`     | "simulate", "what if"          | Project Υ/class delta from a pillar change     |
| `suggest`      | "suggest", "what should I do"  | Ranked recommendations with impact             |
| `track`        | "track", "am I improving"      | Metrics over time from local history           |
| `taste`        | "taste", "profile"             | Show your taste profile (5 dimensions)         |
| `goal`         | "goal", "how do I hit"         | Path to a target class                         |
| `cost`         | "cost", "how much"             | Token-to-cost analysis (Claude pricing)        |
| `anomaly`      | "anomaly", "did anything drop" | Detect metric drops, pinpoint when             |
| `self-improve` | "self-improve", "coach"        | Full cycle: diagnose → suggest → actions       |
| `compare`      | "compare", "vs"                | Head-to-head vs class average                  |
| `watch`        | "watch", "daemon"              | Background daemon: auto-scan on log changes    |

## License

CC-BY-NC-4.0
