/**
 * llm/stub.mjs — LLM interface stub.
 *
 * The architecture supports adding a real LLM (Claude API, Ollama, etc.) later.
 * For now, this returns canned responses so the REPL works without an LLM.
 * The REPL pattern-matches input to skills directly — the LLM is only needed
 * for true natural-language conversation (wrapping the skills).
 *
 * When a real LLM is added:
 *   - llm/claude.mjs  — Claude API adapter (data leaves device)
 *   - llm/local.mjs   — Ollama adapter (stays on-device)
 *   - The operator picks via settings.json: { llm: "stub" | "claude" | "local" }
 */

/** Stub: returns null (signals "no LLM, use skill pattern-matching"). */
export async function llmRespond(input, ctx) {
  return null
}

/** Check if a real LLM is configured. */
export function hasLLM(settings) {
  return settings.llm && settings.llm !== 'stub'
}
