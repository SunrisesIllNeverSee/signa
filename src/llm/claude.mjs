/**
 * llm/claude.mjs — Claude API adapter (stubbed for v1).
 *
 * When wired: calls the Claude API with the operator's question + skill outputs
 * as context, and returns a conversational response.
 *
 * Privacy note: using the Claude API means token data (cascade metrics, taste
 * profile summaries) leaves the device. The operator opts in via settings.
 * For privacy-maximal mode, use llm/local.mjs (Ollama) instead.
 *
 * To activate: set ANTHROPIC_API_KEY env var + settings.llm = "claude"
 */

export async function claudeRespond(input, ctx) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return '[Claude LLM not configured — set ANTHROPIC_API_KEY to enable]'
  }
  // TODO: wire the actual API call. For now, return a placeholder.
  // The call would be:
  //   POST https://api.anthropic.com/v1/messages
  //   with the skill outputs as system context + the user's question
  return '[Claude LLM adapter is stubbed — wire the API call to enable]'
}
