# Signa MCP Server

> Interactive token-cascade agent — reads your AI coding session logs locally, computes the cascade + Steering Efficiency, builds a taste profile, and coaches you on token efficiency. 12 MCP tools.

Signa is a local-first agent that reads your Claude Code / Cursor session logs, computes the full SigRank token cascade (Υ Yield, SNR, Leverage, Velocity, class), measures Steering Efficiency (SE) and Appropriate Steering Index (ASI), extracts a behavioral taste profile, and provides coaching insights connecting your behavior to your cascade performance. It exposes 12 MCP tools so your AI agent can call them through MCP. You bring your own LLM; signa provides the skills.

## Install

```bash
npx @burnmydays/signaf --mcp
```

Or add to your MCP client config:

```json
{
  "mcpServers": {
    "signaf": {
      "command": "npx",
      "args": ["@burnmydays/signaf", "--mcp"]
    }
  }
}
```

**No API key required.** All tools run locally. All data stays on your machine.

## The 12 MCP Tools

| # | Tool | What it does |
|---|------|-------------|
| 1 | `signa_scan` | Read session logs locally, compute full cascade (Υ, SNR, Leverage, Velocity, class), SE, ASI, and taste profile. Returns current cascade state summary. |
| 2 | `signa_diagnose` | Diagnose your token cascade. Shows class, pillar breakdown, and flags issues (low leverage, low velocity, high input, etc.). Also shows SE and ASI. |
| 3 | `signa_simulate` | Simulate a pillar change and project the resulting Υ Yield and class. Shows delta from current state. Example: "increase output by 50000000" or "reduce input by 50%". |
| 4 | `signa_suggest` | Get ranked recommendations for improving your cascade. Each suggestion shows action, projected Υ delta, and effort level. Based on current pillar distribution and class. |
| 5 | `signa_taste` | Show your behavioral taste profile — 5 dimensions: steering signature (ASI), iteration fingerprint, workflow rhythm, cascade personality, and correction taxonomy. Everything stays local. |
| 6 | `signa_asi` | Show your Appropriate Steering Index (ASI v2) — 8 dimensions measuring whether your interventions were the RIGHT ones. Based on Anthropic autonomy research. |
| 7 | `signa_bridge` | The taste → cascade bridge: coaching insights connecting your behavioral taste profile to your cascade performance. Returns insights sorted by severity, each with observation, cascade impact, and recommendation. |
| 8 | `signa_cost` | Show your token-to-cost analysis. Computes total cost based on Claude pricing. Shows cost breakdown and cache savings. |
| 9 | `signa_goal` | Show the path to a target class. Computes what pillar changes are needed to reach BASE/POWER/ARCHITECT/ARCHITECT+/TRANSMITTER from your current state. |
| 10 | `signa_compare` | Compare your cascade against a class average or a specific operator. Shows where you stand relative to the benchmark. |
| 11 | `signa_track` | Show your cascade metrics over time from local history. Displays trend lines for Υ, SNR, Leverage, Velocity, and class changes across recorded snapshots. |
| 12 | `signa_anomaly` | Detect metric drops and anomalies in your cascade history. Pinpoints when a metric dropped and by how much, helping you identify which session caused the change. |

## Architecture

```
Your AI agent (Claude Code, Cursor, Windsurf)
        ↓ MCP stdio
signa MCP server (12 tools)
        ↓ reads locally
~/.claude/projects/ (session logs, .jsonl)
        ↓ computes locally
Token cascade + SE + ASI + taste profile
        ↓ returns to agent
Structured JSON (no data leaves your machine)
```

Signa reads the same session logs that `sigrank-mcp`'s `tokenpull` reads — but instead of just extracting four token pillars, it reads **all three signal layers**:
1. **Token cascade** — Υ Yield, SNR, Leverage, Velocity, class
2. **Steering behavior** — SE (Steering Efficiency), ASI (Appropriate Steering Index)
3. **Taste profile** — iteration fingerprint, workflow rhythm, cascade personality, correction taxonomy

The `signa_bridge` tool connects layers 2+3 to layer 1 — coaching insights that explain *why* your cascade looks the way it does based on *how* you work.

## Privacy

All computation happens **locally**. The MCP server reads session logs on the same machine. Nothing is transmitted to any server. Layer 3 (content-based taste extraction) is opt-in via `deepTaste: true` — raw content is not retained, only distilled preferences.

**sigrank-mcp** is the calorie counter. **signa** is the metabolic panel.

## Key Facts

| Field | Value |
|-------|-------|
| npm package | `@burnmydays/signaf` |
| GitHub | https://github.com/SunrisesIllNeverSee/signa |
| Website | https://signalaf.com |
| License | CC-BY-NC-4.0 |
| Transport | stdio |
| Platform | Cross-platform (Node.js >= 18) |
| Language | JavaScript (ESM) |
| Tools | 12 |
| Auth | None (all local) |
| Category | Developer Tools / AI Productivity |

## Registries

- [npm](https://www.npmjs.com/package/@burnmydays/signaf) (live, v0.1.0)
- [Smithery](https://smithery.ai) (pending submission)
- [Glama](https://glama.ai) (pending submission)
- [MCP Registry](https://registry.modelcontextprotocol.io) (pending submission)
- [Anthropic Connectors Directory](https://claude.com/docs/connectors/building/submission) (pending submission)
