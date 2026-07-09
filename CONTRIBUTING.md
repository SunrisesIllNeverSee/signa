# Contributing to signa

Thanks for your interest! signa is the interactive token-cascade coach for the SigRank ecosystem.

## Quick start

```bash
git clone https://github.com/SunrisesIllNeverSee/signa.git
cd signa
npm install
signa --help          # CLI overview
signa                 # interactive REPL
signa --mcp           # MCP server mode
```

## Before you commit

```bash
node src/index.mjs --help    # verify CLI loads
signa scan                   # verify log reading + cascade computation
```

## Invariants — do not break

- **Local-only by default.** Nothing leaves the machine unless the user explicitly enables LLM mode.
- **Token-only.** No message content is ever read, logged, or transmitted.
- **Layer 3 (content) is opt-in.** Never enable deep taste profiling by default.
- **Operator-owned profile.** The taste profile is user-controlled — readable, editable, deletable.

## Adding a skill

1. Add the skill to `src/skills/index.mjs` following the existing pattern.
2. Add trigger keywords for the REPL pattern-matcher.
3. If the skill exposes an MCP tool, add it to `src/mcp-server.mjs` and update the tool table in README.md.

## Pull requests

Fork → branch → verify CLI loads → open PR against `main`. Reference any related issues.
