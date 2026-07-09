/**
 * llm/stub.mjs — LLM interface stub (default, no API calls).
 *
 * The architecture supports adding a real LLM (Claude API, Ollama, etc.).
 * For now, this returns null so the REPL uses skill pattern-matching only.
 * The REPL pattern-matches input to skills directly — the LLM is only needed
 * for true natural-language conversation (wrapping the skills).
 *
 * When a real LLM is added:
 *   - llm/claude.mjs  — Claude API adapter (operator brings their own key)
 *   - llm/local.mjs   — Ollama adapter (stays on-device) [future]
 *   - The operator picks via settings.json: { "llm": "stub" | "claude" | "local" }
 *
 * The REPL imports from here. If llm is set to "claude" in settings, this
 * module delegates to llm/claude.mjs. Otherwise it returns null (stub mode).
 */

/** Stub: returns null (signals "no LLM, use skill pattern-matching"). */
export async function llmRespond(input, ctx) {
  const settings = ctx?.settings;
  if (settings?.llm === "claude") {
    const { llmRespond: claudeRespond } = await import("./claude.mjs");
    return await claudeRespond(input, ctx);
  }
  // if (settings?.llm === 'local') {
  //   const { llmRespond: localRespond } = await import('./local.mjs')
  //   return await localRespond(input, ctx)
  // }
  return null; // stub mode — no LLM, use pattern-matching
}

/** Check if a real LLM is configured. */
export function hasLLM(settings) {
  if (!settings || !settings.llm || settings.llm === "stub") return false;
  if (settings.llm === "claude") {
    const apiKey = settings.llmApiKey || process.env.ANTHROPIC_API_KEY;
    return !!apiKey;
  }
  return false;
}
