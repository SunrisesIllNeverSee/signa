# signa

**Interactive token-cascade agent.** Reads your AI coding session logs locally, computes the yield cascade (Υ, SNR, Leverage, Velocity), builds a taste profile from your correction patterns, and coaches you on token efficiency.

Everything stays local. Nothing leaves your machine.

→ **[signalaf.com](https://signalaf.com)**

---

## What this is

`signa` is the interactive agent from the [SigRank brainstorm](https://signalaf.com). It reads the same session logs that `sigrank-mcp`'s `tokenpull` reads — but instead of just extracting four token pillars, it reads **all three signal layers**:

- **Layer 1 (metadata):** tool distribution, file edit counts, edit sizes, reject/error rates
- **Layer 2 (structural):** correction loops, convergence patterns, session shape
- **Layer 3 (content):** user feedback directives ("get rid of median", "make numbers larger") — distilled into preferences, not retained

From these layers it computes:
- The **cascade** (Υ, SNR, Leverage, Velocity, 10xDEV) — the efficiency metrics
- **Steering Efficiency (SE)** — how well you steer your agent (accepted vs corrected vs rejected turns)
- A **taste profile** — your design preferences, code style, workflow habits

Then it coaches you: diagnose weak pillars, simulate changes, suggest improvements, track trends, set goals, analyze costs, detect anomalies, and run the full self-improvement cycle.

---

## Install

```bash
# Clone + run (no npm install needed — zero dependencies, pure Node.js)
git clone https://github.com/SunrisesIllNeverSee/signa.git
cd signa

# Or link globally
npm link
signa --help
```

Requires Node.js ≥ 18. Zero npm dependencies — pure Node.js stdlib.

---

## Quick start

```bash
# 1. Start the interactive REPL (auto-scans on first run)
signa

# 2. Or run one-shot commands
signa scan                 # Read logs, compute everything, save
signa diagnose             # "How am I doing?"
signa simulate input -50%  # "What if I cut my input in half?"
signa suggest              # "What should I do differently?"
signa taste                # "What's my taste profile?"
signa goal transmitter     # "How do I hit TRANSMITTER?"
signa cost                 # "How much did I spend?"
signa compare transmitter  # "How do I compare to TRANSMITTER avg?"
signa self-improve         # Full cycle: diagnose → suggest → actions
signa watch                # Background daemon (auto-scan on log changes)
```

---

## The REPL

```bash
$ signa

signa — interactive token-cascade agent. Type "help" for commands.

signa> how am I doing today?
═══ DIAGNOSE ═══
Class: POWER  ·  Υ 283.17  ·  SNR 0.522  ·  Leverage 259.3×  ·  Velocity 1.092
...

signa> what should I do differently?
═══ SUGGEST ═══
1. Increase output by 19.43M (→ 42.79M)
   impact: Υ 283.17 → 518.64 (83.2% gain)
...

signa> simulate input -50%
═══ SIMULATE ═══
Base:    Υ 283.17  ·  POWER
Projected: Υ 1,132.66  ·  ARCHITECT+
Delta:   ↑ 849.49 (300.0%)
Class change: POWER → ARCHITECT+
...

signa> how do I hit transmitter?
═══ GOAL ═══
Target: TRANSMITTER (Υ ≥ 5,000)
Gap: 4,716.83
Paths to close the gap:
  2. Cut fresh input to 5.09M (-76.2%) → Υ 4,999.93
...

signa> quit
```

---

## Skills

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `scan` | "scan", "refresh" | Read logs, compute cascade + SE + taste profile, save to history |
| `diagnose` | "how am I doing", "audit" | Pillar-level audit: which pillar is weak, why |
| `simulate` | "simulate", "what if" | Project Υ/class delta from a hypothetical pillar change |
| `suggest` | "suggest", "what should I do" | Ranked recommendations with simulated impact |
| `track` | "track", "am I improving" | Metrics over time from local history |
| `taste` | "taste", "profile" | Show your taste profile (preferences, correction patterns) |
| `goal` | "goal", "how do I hit" | Path to a target class (TRANSMITTER, ARCHITECT, etc.) |
| `cost` | "cost", "how much" | Token-to-cost analysis (Claude pricing) |
| `anomaly` | "anomaly", "did anything drop" | Detect metric drops, pinpoint when |
| `self-improve` | "self-improve", "coach" | Full cycle: diagnose → suggest → simulate → next actions |
| `compare` | "compare", "vs" | Head-to-head vs class average |
| `watch` | "watch", "daemon" | Background daemon: auto-scan on .jsonl changes |

---

## Steering Efficiency (SE)

SE measures how well you steer your agent. Every turn is classified:

- **Accepted (1.0):** The agent's output was used as-is
- **Corrected (0.5):** You re-edited the same file the agent edited (within 2 turns)
- **Rejected (0.0):** A tool use was explicitly rejected

```
SE = (1.0 × accepted + 0.5 × corrected + 0.0 × rejected) / total turns
```

Range: [0, 1]. Higher = you steer well (fewer corrections = lower input = higher Υ).

---

## The taste profile

Saved at `~/.signa/taste-profile.json`. Generated from your last 30 days of logs. Contains:

- **Design preferences** — distilled from your feedback directives ("prefers large numbers", "dislikes median display", "wants interactive elements")
- **Code preferences** — edit style ("prefers small targeted edits", "net adder", "convention-aware")
- **Workflow preferences** — tool distribution ("investigate-first", "trial-and-error", "prefers autonomy")
- **Correction patterns** — top iterated files with loop depth + convergence
- **Metrics** — SE, acceptance rate, correction rate, design iteration index, agent alignment score

The profile is **operator-owned**: you can read it, edit it, share it, or delete it. It never leaves your machine by default.

---

## Privacy

Everything stays local. The agent reads all three signal layers from your logs, builds the taste profile, computes metrics — all on-device. Nothing is transmitted.

**LLM integration (future):** The architecture supports adding a conversational LLM layer. When added, the operator chooses:
- **Claude API** — better quality, but token data leaves the device
- **Local LLM (Ollama)** — stays on-device, max privacy

For v1, the LLM is stubbed — the REPL pattern-matches input to skills directly, no LLM needed.

---

## File layout

```
~/.signa/
  taste-profile.json   — your taste profile (regenerated on each scan)
  history.json         — cascade metrics over time (append-only, capped at 1000)
  settings.json        — codename, platform, log root path
```

---

## Architecture

```
signa/
  src/
    index.mjs           — entry: CLI dispatch + REPL boot
    repl.mjs            — interactive chat loop (readline, pattern-matches to skills)
    logreader.mjs       — rich session-log reader (all 3 signal layers)
    cascade.mjs         — Υ/SNR/Leverage/Velocity/10xDEV (pure math)
    store.mjs           — local JSON persistence (~/.signa/)
    watch.mjs           — daemon: auto-scan on .jsonl change
    taste/
      extractor.mjs     — extract taste signal from logs (3 layers)
      profile.mjs       — build + save + load taste profile
      se.mjs            — Steering Efficiency computation
    skills/
      index.mjs         — all 11 skills (diagnose, simulate, suggest, etc.)
    llm/
      stub.mjs          — LLM interface (stub: returns null, REPL uses skills directly)
      claude.mjs        — Claude API adapter (stubbed, wired for later)
      local.mjs         — Ollama adapter (stubbed, wired for later)
```

---

## Brainstorm

This agent was built from the [SigRank brainstorm package](https://signalaf.com). The brainstorm stays untouched — this is the build that came out of it. See `PLAN.md` for the build plan.

---

## License

CC-BY-NC-4.0
