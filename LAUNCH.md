---
type: launch-runbook
title: signa — launch runbook (owner actions to ship)
description: The remaining steps to launch signa. The agent is built and tested locally. This file tracks the owner-side actions (GitHub repo, npm publish, announcement) and the dev-side follow-ups (LLM wiring, MCP mode, session recording). Pick up here when ready to ship.
tags: [signa, launch, runbook, owner-actions, ship]
timestamp: 2026-07-06T04:30:00Z
---

# signa — launch runbook

> The agent is built and working locally. This file is the pick-up point for launch.
> Built: 2026-07-06. Status: ready for GitHub + npm.

---

## Phase 1 — ship what's built (owner, ~30 min)

### 1. Create the GitHub repo

- [ ] Create `SunrisesIllNeverSee/signa` (private or public — owner call)
- [ ] Push the local repo:
  ```bash
  cd ~/Desktop/SigRank-repos/signa
  git remote add origin git@github.com:SunrisesIllNeverSee/signa.git
  git push -u origin main
  ```

### 2. npm publish (optional — can run from clone for now)

- [ ] Check `signa` name on npm. If taken, use `@sigrank/signa` (scoped)
- [ ] `npm publish` from inside the repo dir (not from $HOME — grabs wrong package.json)
- [ ] Verify: `npx signa --help` works from a clean machine

### 3. Announcement (owner call on timing)

- [ ] Blog post / tweet / HN? The hook: "your AI coding agent starts blind. signa reads your session logs, learns your taste, and tells you how to improve your token cascade."
- [ ] Cross-link from signalaf.com (maybe a /signa page or a link in the nav)

---

## Phase 2 — dev follow-ups (when ready, not blocking launch)

### LLM integration (the big one)

The architecture supports it; the stubs are wired. Pick one or both:

- [ ] **Claude API adapter** (`src/llm/claude.mjs`) — wire the actual API call. The operator sets `ANTHROPIC_API_KEY` + `settings.llm = "claude"`. Privacy tradeoff: token data leaves the device. Better conversation quality.
- [ ] **Ollama adapter** (`src/llm/local.mjs`) — wire the localhost:11434 call. Operator installs Ollama + a model. Max privacy, stays on-device. Lower quality than Claude.
- [ ] **Settings switch** — `settings.json` gains `llm: "stub" | "claude" | "local"`. The REPL checks `hasLLM()` and routes to the LLM if configured, else falls back to skill pattern-matching.

When the LLM is wired, it wraps the existing skills — it doesn't replace them. The LLM picks which skill to call and formats the output conversationally. The skills stay as the deterministic core.

### MCP server mode

- [ ] Expose the 11 skills as MCP tools so they're callable from Claude Code / Cursor / Windsurf
- [ ] This makes signa work inside the IDE, not just the terminal
- [ ] The skills are already pure functions — wrapping them as MCP tools is mostly schema work

### Session recording + replay

- [ ] Record sessions as structured artifacts (token flow, tool patterns, correction loops over time)
- [ ] Replay visualization — "speedrun replays for AI coding"
- [ ] This is the Strava angle from the brainstorm

### Event infrastructure

- [ ] Daily challenges, hackathons, head-to-head cascade duels
- [ ] Server-side: event model, challenge specs, live leaderboard
- [ ] This is the competitive platform angle from the brainstorm

### Multi-platform adapters

- [ ] Cursor, Codex, Gemini log readers (patterns are in sigrank-mcp/adapters.mjs)
- [ ] The logreader.mjs is Claude Code–specific; the adapter contract is the same

---

## Phase 3 — post-launch (needs users)

- [ ] **Taste Labs partnership conversation** — if subjective quality verification is needed for SE, talk to Taste Labs about their Verify API. The brainstorm positioned them as a "side dish" — take what we need, no dependency.
- [ ] **SE as a leaderboard metric** — currently SE is display-only (in the taste profile). If it becomes a ranked metric, the server needs to accept + score it. Open decision T6 from the brainstorm.
- [ ] **Taste profile sharing** — opt-in sharing of Layer 1 metadata to the leaderboard. Open decision T2.
- [ ] **Operator portability** — the taste profile is a local file. If operators want to carry it between machines or share with a team, add an export/import flow.

---

## What's already done (don't redo)

- ✅ Package structure + package.json (zero npm deps, pure Node.js stdlib)
- ✅ Rich log reader — all 3 signal layers (metadata, structural, content)
- ✅ Cascade math (Υ/SNR/Leverage/Velocity/10xDEV) — copied from sigrank-mcp
- ✅ Steering Efficiency computation — the spec was the "you problem"; SE = (1.0×accepted + 0.5×corrected + 0.0×rejected) / total turns
- ✅ Taste extraction — Layer 1 + Layer 2 + Layer 3 best-effort
- ✅ Taste profile generation + save/load (~/.signa/taste-profile.json)
- ✅ All 11 skills: scan, diagnose, simulate, suggest, track, taste, goal, cost, anomaly, self-improve, compare, watch
- ✅ Interactive REPL with natural-language pattern matching
- ✅ One-shot CLI commands (signa scan, signa diagnose, etc.)
- ✅ Watch daemon (auto-scan on .jsonl change)
- ✅ Local JSON store (history + profile + settings)
- ✅ LLM stub (wired, returns null — REPL uses skills directly)
- ✅ LLM adapter files created (claude.mjs, local.mjs — stubbed, ready to wire)
- ✅ Smoke tested against real data (500 sessions, Υ 283, SE 0.99)
- ✅ README + PLAN.md + this launch file
- ✅ Git initialized, 17 files committed

---

## The brainstorm package (reference, untouched)

`~/Desktop/SigRank/Devins_Plans/_planning/brainstorm-package/` — 5 files, 3,299 lines:

- `README.md` — orientation
- `NEW_AGENT_BRAINSTORM.md` — the agent design space (5 interaction models, 10 decisions, 5 candidate directions)
- `TASTE_LEARNING_BRAINSTORM.md` — taste learning + competitive research + events (the main brainstorm, ~1,980 lines)
- `SIGNALAF_TASTE_AUDIT.md` — signalaf.com audited against the Taste Skill framework
- `SEED_CANDIDATES.md` — seed operator data for the leaderboard

The brainstorm stays untouched. This launch file + PLAN.md are the build-side companions.

---

## Open decisions from the brainstorm (still open, owner's call)

These are the 15 decisions from the brainstorm that weren't settled by the build. The build made default choices where needed; the owner can override.

1. **T1: Which layers does the agent read?** — Build default: all 3 (metadata + structural + content). Owner can restrict.
2. **T2: Does the taste profile leave the machine?** — Build default: never. Owner can add opt-in sharing later.
3. **T3: Profile format?** — Build default: JSON. Could add Markdown export.
4. **T4: How does the profile get loaded by agents?** — Open. File injection, MCP, CLAUDE.md, env var. Not built yet.
5. **T5: How often is the profile updated?** — Build default: on every `scan`. Could add scheduled/cron.
6. **T6: Is SE a leaderboard metric?** — Build default: display-only. Owner can promote to ranked.
7. **T7: Cross-agent support?** — Build default: Claude Code only. Adapters for others are follow-up.
8. **T8: Does the taste profile feed into `suggest` automatically?** — Not yet. The suggest skill uses cascade metrics; could add taste-aware suggestions.
9. **Command Code: competitor or complement?** — Open. Positioning call.
10. **Taste Labs: customer, partner, or independent?** — Open. The SE spec uses behavioral verification (no Taste Labs dependency). If subjective quality is needed, that's a partnership conversation.
11. **Is events a product direction or a feature?** — Open. Phase 3.
12. **Session recording as a standalone feature?** — Open. Phase 2.
13. **The Strava analogy — right framing?** — Open. Marketing call.
14. **Challenge spec format?** — Open. Phase 3.
15. **Does the agent need to be an event participant?** — Open. Phase 3.

---

_Last updated: 2026-07-06. Built by DEVIN session. Pick up here to launch._
