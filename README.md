# signa

**Interactive token-cascade agent.** Reads your AI coding session logs locally, computes the yield cascade (Υ, SNR, Leverage, Velocity), builds a behavioral taste profile, measures your Appropriate Steering Index (ASI), and coaches you on token efficiency.

Everything stays local. Nothing leaves your machine.

→ **[signalaf.com](https://signalaf.com)**

---

## The SigRank ecosystem

signa is one of three pieces:

| Repo | What it is | Install |
|------|-----------|---------|
| **[sigrank-mcp](https://github.com/SunrisesIllNeverSee/sigrank-mcp)** | The instrument — extracts 4 token pillars, computes the cascade, submits to the leaderboard. MCP server + TUI dashboard. | `npx sigrank` |
| **[sigrank-app](https://github.com/SunrisesIllNeverSee/sigrank-app)** | The leaderboard — signalaf.com. Privacy-preserving operator profiles, class tiers, board rankings. | [signalaf.com](https://signalaf.com) |
| **[signa](https://github.com/SunrisesIllNeverSee/signa)** (this repo) | The coach — reads all 3 signal layers from your logs, builds a taste profile, measures ASI, coaches you on what your tokens were worth. | `git clone` + `npm link` |

**sigrank-mcp** is the calorie counter. **signa** is the metabolic panel.

---

## What this is

`signa` reads the same session logs that `sigrank-mcp`'s `tokenpull` reads — but instead of just extracting four token pillars, it reads **all three signal layers**:

- **Layer 1 (metadata):** tool distribution, file edit counts, edit sizes, reject/error rates
- **Layer 2 (structural):** correction loops, convergence patterns, session shape
- **Layer 3 (content):** user feedback directives — distilled into preferences, not retained (opt-in)

From these layers it computes:
- The **cascade** (Υ, SNR, Leverage, Velocity, class) — the efficiency metrics
- **Appropriate Steering Index (ASI)** — 8 dimensions measuring whether your interventions were the RIGHT ones, not just how often you accepted
- A **behavioral taste profile** — 5 dimensions: steering signature, iteration fingerprint, workflow rhythm, cascade personality, correction taxonomy

Then it coaches you: diagnose weak pillars, simulate changes, suggest improvements, track trends, set goals, analyze costs, detect anomalies, and run the full self-improvement cycle.

---

## Install

```bash
git clone https://github.com/SunrisesIllNeverSee/signa.git
cd signa
npm install        # installs @modelcontextprotocol/sdk for MCP server mode
npm link           # optional: makes `signa` available globally
signa --help
```

Requires Node.js ≥ 18.

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
signa asi                  # "How well do I steer?"
signa bridge               # "Connect my behavior to my cascade"
signa goal transmitter     # "How do I hit TRANSMITTER?"
signa cost                 # "How much did I spend?"
signa compare transmitter  # "How do I compare to TRANSMITTER avg?"
signa self-improve         # Full cycle: diagnose → suggest → actions
signa watch                # Background daemon (auto-scan on log changes)

# 3. Or expose signa as MCP tools for your AI agent
signa --mcp                # starts stdio MCP server (12 tools)
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

signa> quit
```

### LLM mode (optional)

The REPL works without an LLM — it pattern-matches input to skills directly. For conversational responses, enable the Claude API adapter:

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Or in ~/.signa/settings.json:
{ "llm": "claude" }
```

When enabled, signa sends only computed **metrics** (class, yield, pillars, ASI dimensions, taste dimensions) to Claude for conversational formatting. No session logs, no code, no message content. Default mode (stub) sends nothing — zero API calls, zero data leaves.

---

## MCP server mode

`signa --mcp` starts a stdio MCP server that exposes 12 tools. Your AI agent (Claude Code, Cursor, Windsurf) can call them through MCP. You bring your own LLM; signa provides the skills.

```json
// In .mcp.json:
{
  "mcpServers": {
    "signa": {
      "command": "signa",
      "args": ["--mcp"]
    }
  }
}
```

| MCP tool | What it does |
|----------|-------------|
| `signa_scan` | Read logs, compute cascade + ASI + taste |
| `signa_diagnose` | Pillar-level audit + issue detection |
| `signa_simulate` | Project Υ/class delta from a pillar change |
| `signa_suggest` | Ranked recommendations with impact |
| `signa_taste` | 5-dimension behavioral taste profile |
| `signa_asi` | 8-dimension Appropriate Steering Index |
| `signa_bridge` | Taste → cascade coaching insights |
| `signa_cost` | Token-to-cost analysis + cache savings |
| `signa_goal` | Path to a target class |
| `signa_compare` | Head-to-head vs class benchmark |
| `signa_track` | Metrics over time from history |
| `signa_anomaly` | Detect metric drops |

Context is cached for 60 seconds to avoid re-reading logs on every tool call. All data stays local.

---

## Skills

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `scan` | "scan", "refresh" | Read logs, compute cascade + ASI + taste profile, save to history |
| `diagnose` | "how am I doing", "audit" | Pillar-level audit: which pillar is weak, why |
| `simulate` | "simulate", "what if" | Project Υ/class delta from a hypothetical pillar change |
| `suggest` | "suggest", "what should I do" | Ranked recommendations with simulated impact |
| `track` | "track", "am I improving" | Metrics over time from local history |
| `taste` | "taste", "profile" | Show your behavioral taste profile (5 dimensions) |
| `asi` | "asi", "steering" | Show your Appropriate Steering Index (8 dimensions) |
| `bridge` | "bridge", "connect" | Taste → cascade coaching insights |
| `goal` | "goal", "how do I hit" | Path to a target class (TRANSMITTER, ARCHITECT, etc.) |
| `cost` | "cost", "how much" | Token-to-cost analysis (Claude pricing) |
| `anomaly` | "anomaly", "did anything drop" | Detect metric drops, pinpoint when |
| `self-improve` | "self-improve", "coach" | Full cycle: diagnose → suggest → simulate → next actions |
| `compare` | "compare", "vs" | Head-to-head vs class average |
| `watch` | "watch", "daemon" | Background daemon: auto-scan on .jsonl changes |

---

## Appropriate Steering Index (ASI)

ASI measures whether your interventions were the RIGHT ones, not just how often you accepted. Based on Anthropic's autonomy research.

**8 dimensions:**

1. **Acceptance rate** — fraction of turns used as-is
2. **Correction rate** — fraction of turns you re-edited
3. **Rejection rate** — fraction of turns explicitly rejected
4. **Correction precision** — how targeted your corrections were (single-file vs scattered)
5. **Intervention timing** — how long you let the agent work before intervening
6. **Reliance slope** — trend of your acceptance rate over the session (stable/improving/declining)
7. **Over-correction index** — fraction of corrections that were potentially unnecessary
8. **Under-steering index** — fraction of turns where you should have intervened but didn't

Each dimension reports a confidence level (high/medium/low) based on sample size.

**Why ASI, not just SE?** SE v1 (the legacy metric) measured acceptance rate — a high SE just means you said "yes" a lot. ASI measures whether your "yes" was the right call. An SE of 0.99 can correspond to an ASI of 0.686 — revealing that 49% of corrections were potentially unnecessary.

---

## The taste profile

Saved at `~/.signa/taste-profile.json`. Generated from your last 30 days of logs. **Behavioral, not content-based** — 5 dimensions:

1. **Steering signature** — your ASI dimensions + SE legacy
2. **Iteration fingerprint** — which files you iterate on, loop depth, convergence patterns
3. **Workflow rhythm** — tool distribution, investigate-to-edit ratio, workflow style
4. **Cascade personality** — pillar distribution tendencies (cache-hoarder, input-minimizer, output-light, high-leverage)
5. **Correction taxonomy** — what you correct (design vs logic vs config), categorized by file type

**Layer 3 (content-based) is opt-in.** Use `signa taste --deep` or pass `{ deepTaste: true }` to the MCP tool. Raw content is not retained — only distilled preferences.

The profile is **operator-owned**: you can read it, edit it, share it, or delete it. It never leaves your machine by default.

---

## The taste → cascade bridge

The bridge connects your behavioral taste profile to your cascade performance, generating coaching insights unique to SigRank. No other tool can do this — it requires both the taste profile AND the cascade formula.

Example insights:
- **"Bash-heavy workflow"** (high severity) — you run a lot of Bash commands, which tend to reset context. Impact: lower cache reads → lower leverage → lower Υ. Recommendation: batch your commands.
- **"Diverging file loops"** (high severity) — you're iterating on files without converging. Impact: high input, low output per turn. Recommendation: stop the loop and give explicit taste guidance.
- **"Output-light personality"** (high severity) — your output-to-input ratio is low. Impact: low velocity → low Υ. Recommendation: ask the agent for complete implementations, not pieces.

---

## Privacy

Everything stays local. The agent reads all three signal layers from your logs, builds the taste profile, computes metrics — all on-device. Nothing is transmitted.

**MCP server mode:** All computation happens locally. The MCP server only exposes computed results to your AI agent via stdio. No data is sent to any server.

**LLM mode (optional):** When enabled, signa sends only computed **metrics** (class, yield, pillars, ASI dimensions, taste dimensions) to Claude for conversational formatting. No session logs, no code, no message content. Default mode (stub) sends nothing.

---

## File layout

```
~/.signa/
  taste-profile.json   — your taste profile (regenerated on each scan)
  history.json         — cascade metrics over time (append-only, capped at 1000)
  settings.json        — codename, platform, log root path, llm config
```

---

## Architecture

```
signa/
  src/
    index.mjs           — entry: CLI dispatch + REPL boot + --mcp flag
    repl.mjs            — interactive chat loop (readline, pattern-matches to skills)
    mcp-server.mjs      — MCP server: 12 tools, stdio transport, 60s context cache
    logreader.mjs       — rich session-log reader (all 3 signal layers)
    cascade.mjs         — Υ/SNR/Leverage/Velocity/class + simulate + cost (pure math)
    store.mjs           — local JSON persistence (~/.signa/)
    watch.mjs           — daemon: auto-scan on .jsonl change
    taste/
      extractor.mjs     — extract taste signal from logs (3 layers, Layer 3 opt-in)
      profile.mjs       — build + save + load taste profile
      se.mjs            — Steering Efficiency (SE v1) + Appropriate Steering Index (ASI v2)
      bridge.mjs        — taste → cascade coaching insights
    skills/
      index.mjs         — all 13 skills (diagnose, simulate, suggest, taste, asi, etc.)
    llm/
      stub.mjs          — LLM interface (delegates to claude.mjs when configured)
      claude.mjs        — Claude API adapter (operator brings own key, metrics-only)
```

---

## Brainstorm

This agent was built from the [SigRank brainstorm package](https://signalaf.com). The brainstorm stays untouched — this is the build that came out of it. See `PLAN.md` for the build plan.

---

## License

CC-BY-NC-4.0
