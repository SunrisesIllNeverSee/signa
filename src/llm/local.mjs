/**
 * llm/local.mjs — Ollama / local LLM adapter (stubbed for v1).
 *
 * When wired: calls a local Ollama instance (http://localhost:11434) with the
 * operator's question + skill outputs as context. Everything stays on-device.
 *
 * To activate: install Ollama + a model, set settings.llm = "local"
 */

export async function localRespond(input, ctx) {
  // TODO: wire the Ollama API call. For now, return a placeholder.
  // The call would be:
  //   POST http://localhost:11434/api/chat
  //   with the skill outputs as system context + the user's question
  return "[Local LLM adapter is stubbed — install Ollama and wire the API call to enable]";
}
