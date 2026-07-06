---
type: build-plan
title: signa — interactive token-cascade agent (build plan, 2026-07-06)
description: Build plan for the new interactive SigRank agent. Reads session logs locally (all 3 signal layers), computes the cascade + Steering Efficiency, builds a taste profile, and exposes diagnose/simulate/suggest/track/taste/goal/cost/anomaly/self-improve skills through an interactive REPL + watch daemon. LLM integration is stubbed now, architected to add later. Brainstorm package stays untouched.
tags: [sigrank, agent, signa, build-plan, taste-learning, steering-efficiency, interactive, repl]
timestamp: 2026-07-06T04:00:00Z
---

# signa — build plan

> **Companion to:** `~/Desktop/SigRank/Devins_Plans/_planning/brainstorm-package/`
> (the brainstorm — stays untouched). This is the build plan that came out of it.

---

## The decision (owner, 2026-07-06)

- **Interactive agent**, not just MCP tools. You talk to it; it talks back.
- **Full capabilities** — do not limit. Build all the skills from the brainstorm.
- **Eventually add its own LLM** — architecture supports it, stub for now.
- **Node.js/TypeScript** — reuse `sigrank-mcp`'s cascade math + log-reading patterns.
- **Local-only** — nothing leaves the machine. Privacy = what leaves, not what's read.

This is **Direction D (hybrid)** from the brainstorm: interactive REPL + watch daemon + (later) LLM. The REPL is the conversational surface for v1; the LLM slot is wired but stubbed so we add Claude API / Ollama later without rework.

---

## Architecture

```
signa/
  package.json              — bin: `signa`
  src/
    index.mjs               — entry: CLI dispatch + REPL boot
    repl.mjs                — interactive chat loop (readline, no LLM needed for v1)
    logreader.mjs           — rich session-log reader (ALL 3 layers, not just usage)
    cascade.mjs             — Υ/SNR/Leverage/Velocity/10xDEV (copied from sigrank-mcp, pure math)
    store.mjs               — local JSON persistence (~/.signa/)
    watch.mjs               — daemon: auto-scan on .jsonl change, post notifications
    taste/
      extractor.mjs         — extract taste signal from logs (Layer 1 metadata + Layer 2 structural + Layer 3 content)
      profile.mjs           — build + save + load taste profile
      se.mjs                — Steering Efficiency computation
    skills/
      diagnose.mjs          — pillar-level audit ("where am I leaking?")
      simulate.mjs          — what-if projection (already proven in sigrank-mcp)
      suggest.mjs           — ranked recommendations w/ simulated impact
      track.mjs             — metrics over time (local JSON history)
      taste.mjs             — show/edit taste profile
      goal.mjs              — "I want TRANSMITTER" → what ratios you need
      cost.mjs              — token-to-cost analysis (Claude pricing table)
      anomaly.mjs           — detect metric drops, pinpoint when
      selfimprove.mjs       — full cycle: diagnose → suggest → simulate → next actions
      compare.mjs           — head-to-head vs another operator or class avg
    llm/
      stub.mjs              — LLM interface (stub: returns canned responses)
      claude.mjs            — Claude API adapter (stubbed, wired for later)
      local.mjs             — Ollama/local LLM adapter (stubbed, wired for later)
```

---

## Steering Efficiency (SE) — the spec

The brainstorm proposed SE = accepted output / total output. Here's the precise definition for the log reader:

### What counts as a "turn"

A turn = one assistant message + the user response that follows it (until the next assistant message). Each turn produces output (the assistant's tool calls + text). The question is whether that output was **accepted**, **corrected**, or **rejected**.

### The three outcomes per turn

| Outcome | Log signature | SE weight |
|---------|--------------|-----------|
| **Accepted** | Assistant turn is followed by a new user message that is NOT a rejection and does NOT immediately re-edit the same file the assistant just edited | 1.0 |
| **Corrected** | Assistant turn is followed by a user-initiated edit to the same file the assistant edited in this turn (within the next 2 turns) | 0.5 |
| **Rejected** | A `tool_result` with `is_error: true` AND content matching the rejection pattern ("user doesn't want to proceed", "user rejected", etc.) | 0.0 |

### SE formula

```
SE = (sum of outcome weights) / (total turns)
```

Range: [0, 1]. Higher = operator steers well (agent output mostly accepted as-is).

### Correction loop signal

A **correction loop** = 3+ consecutive edits to the same file across turns. Each loop's depth (number of edits) and convergence (are deltas shrinking?) feeds the taste profile. Loops do NOT directly lower SE (the per-turn weighting already captures the correction), but they're tagged in the profile as "high-iteration files."

---

## Taste profile format (v1)

JSON, saved at `~/.signa/taste-profile.json`. Generated from the last 30 days of logs by default.

```json
{
  "version": "1.0",
  "operator": "<codename or 'local'>",
  "generatedAt": "<ISO>",
  "sessionsAnalyzed": 48,
  "totalToolUses": 911,
  "totalEdits": 198,
  "totalRejections": 5,
  "correctionLoops": 58,
  "acceptanceRate": 0.93,
  "steeringEfficiency": 0.93,
  "preferences": {
    "design": [...],
    "code": [...],
    "workflow": [...]
  },
  "correctionPatterns": [
    { "file": "app.py", "editCount": 92, "correctionLoops": 38, "category": "design" }
  ],
  "metrics": {
    "steeringEfficiency": 0.93,
    "correctionRate": 0.07,
    "designIterationIndex": 0.65,
    "agentAlignmentScore": 0.91
  }
}
```

Layer 3 (content) extraction is best-effort: we read user feedback messages and edit diffs to extract preference directives ("get rid of median", "make numbers larger"). These are distilled into the `preferences` arrays — the profile captures the essence without retaining the raw code/conversation.

---

## Skills (all built, full capacity)

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `diagnose` | "how am I doing", "diagnose", "audit" | Pillar-level audit: which pillar is weak, why, compare to class avg |
| `simulate` | "simulate", "what if" | Project Υ/class/rank delta from a hypothetical pillar change |
| `suggest` | "suggest", "recommend", "improve" | Ranked recommendations, each with simulated impact |
| `track` | "track", "history", "trend" | Metrics over time from local history |
| `taste` | "taste", "profile", "preferences" | Show/edit the taste profile |
| `goal` | "goal", "target", "transmitter" | "To hit class X, you need Υ ≥ Y. Path: ..." |
| `cost` | "cost", "spend", "dollars" | Token-to-cost analysis from Claude pricing |
| `anomaly` | "anomaly", "drop", "weird" | Detect metric drops, pinpoint when it happened |
| `selfimprove` | "self-improve", "coach", "next" | Full cycle: diagnose → suggest → simulate → actions |
| `compare` | "compare", "vs", "versus" | Head-to-head vs another operator or class avg |
| `watch` | "watch", "daemon", "monitor" | Start the background daemon |
| `help` | "help", "?" | List skills + usage |

The REPL pattern-matches input to a skill, calls it, and prints the result. No LLM needed for v1 — the skills produce structured output. When the LLM is added later, it wraps the same skills (the LLM picks which skill to call and formats the output conversationally).

---

## v1 build scope (tonight)

- [x] Package structure + package.json
- [x] Rich log reader (all 3 layers)
- [x] Cascade math (copied from sigrank-mcp)
- [x] Taste extraction (Layer 1 + Layer 2 + Layer 3 best-effort)
- [x] SE computation
- [x] Taste profile generation + save/load
- [x] All 11 skills
- [x] Interactive REPL
- [x] Watch daemon
- [x] Local JSON store (history + profile + settings)
- [x] LLM stub (wired, returns canned responses — add Claude API later)

## Later (not tonight)

- Claude API adapter (real LLM conversational layer)
- Ollama/local LLM adapter (privacy-maximal)
- MCP server mode (expose skills as MCP tools for IDE integration)
- Server publishing (sign + submit snapshots — the existing sigrank-mcp already does this)
- Session recording + replay visualization
- Event/challenge infrastructure
- Multi-platform adapters (Cursor, Codex, Gemini — patterns are in sigrank-mcp)

---

## Privacy

Everything stays local. The agent reads all 3 signal layers from your logs, builds the taste profile, computes metrics — all on-device. Nothing is transmitted. The LLM stub is local-only (canned responses). When the real LLM is added, the operator chooses: Claude API (data leaves) or local LLM (stays on-device). The architecture makes this a config switch, not a rework.

---

## Naming

`signa` — short, brandable, ties to SignaRate. npm availability TBD; if taken, `@sigrank/signa` as a scoped package. The brainstorm listed this as a candidate. Not married to it.
