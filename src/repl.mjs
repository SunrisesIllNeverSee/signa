/**
 * repl.mjs — interactive REPL for signa.
 *
 * Pattern-matches input to a skill, calls it, prints the result.
 * No LLM needed for v1 — the skills produce structured output.
 * When the LLM is added, it wraps the same skills (picks which to call,
 * formats the output conversationally).
 */

import readline from "node:readline";
import {
  skillDiagnose,
  skillSimulate,
  skillSuggest,
  skillTrack,
  skillTaste,
  skillGoal,
  skillCost,
  skillAnomaly,
  skillSelfImprove,
  skillCompare,
  skillPreflight,
  skillSubmit,
  skillEnroll,
  skillASI,
  skillBridge,
} from "./skills/index.mjs";
import { llmRespond, hasLLM } from "./llm/stub.mjs";

const HELP = `
signa — interactive token-cascade agent

Commands:
  scan              Read your logs, compute cascade + taste profile, save to history
  diagnose          "How am I doing?" — pillar-level audit
  simulate <args>   "What if I changed X?" — project Υ delta
  suggest           "What should I do?" — ranked recommendations
  track             "Am I improving?" — metrics over time
  taste             "What's my taste profile?" — show preferences + patterns
  asi               "How well do I steer?" — Appropriate Steering Index (8 dimensions)
  bridge            "Connect my behavior to my cascade" — coaching insights
  goal <class>      "How do I hit TRANSMITTER?" — path to a target class
  cost              "How much did I spend?" — token-to-cost analysis
  anomaly           "Did anything drop?" — detect metric drops
  self-improve      Full cycle: diagnose → suggest → next actions
  compare <class>   "How do I compare to TRANSMITTER avg?" — head-to-head
  watch             Start the background daemon (auto-scan on log changes)
  preflight         "Will my submission pass?" — anti-gaming pre-check
  submit [window]   Build + sign + POST to the board (--dry-run to preview)
  enroll            Provision or display your device identity
  help              Show this message
  quit              Exit

Examples:
  signa> how am I doing today?
  signa> simulate cacheRead +50000
  signa> simulate input -30%
  signa> what should I do differently?
  signa> how do I hit transmitter?

Everything stays local. Nothing leaves your machine.
`;

/** Pattern-match input to a skill. */
function matchSkill(input) {
  const lower = input.toLowerCase().trim();
  if (!lower) return null;
  // Direct commands
  if (lower === "scan" || lower === "rescan" || lower === "refresh")
    return { skill: "scan" };
  if (lower === "diagnose" || lower === "audit" || lower === "diag")
    return { skill: "diagnose" };
  if (lower.startsWith("simulate") || lower.startsWith("what if"))
    return {
      skill: "simulate",
      args: lower.replace(/^simulate\s*/, "").replace(/^what if\s*/, ""),
    };
  if (
    lower === "suggest" ||
    lower === "recommend" ||
    lower === "improve" ||
    lower === "what should i do"
  )
    return { skill: "suggest" };
  if (
    lower === "track" ||
    lower === "history" ||
    lower === "trend" ||
    lower === "am i improving"
  )
    return { skill: "track" };
  if (
    lower === "taste" ||
    lower === "profile" ||
    lower === "preferences" ||
    lower === "what's my taste"
  )
    return { skill: "taste" };
  if (
    lower === "asi" ||
    lower === "steering" ||
    lower === "how well do i steer" ||
    lower === "appropriate steering"
  )
    return { skill: "asi" };
  if (
    lower === "bridge" ||
    lower === "connect" ||
    lower === "coaching" ||
    lower === "connect my behavior"
  )
    return { skill: "bridge" };
  if (
    lower.startsWith("goal") ||
    lower.startsWith("target") ||
    lower.startsWith("how do i hit")
  )
    return {
      skill: "goal",
      args: lower.replace(/^(goal|target|how do i hit)\s*/, ""),
    };
  if (
    lower === "cost" ||
    lower === "spend" ||
    lower === "dollars" ||
    lower === "how much did i spend"
  )
    return { skill: "cost" };
  if (
    lower === "anomaly" ||
    lower === "drop" ||
    lower === "weird" ||
    lower === "did anything drop"
  )
    return { skill: "anomaly" };
  if (
    lower === "self-improve" ||
    lower === "coach" ||
    lower === "next" ||
    lower === "self improve"
  )
    return { skill: "self-improve" };
  if (
    lower.startsWith("compare") ||
    lower.startsWith("vs") ||
    lower.startsWith("versus")
  )
    return {
      skill: "compare",
      args: lower.replace(/^(compare|vs|versus)\s*/, ""),
    };
  if (lower === "watch" || lower === "daemon" || lower === "monitor")
    return { skill: "watch" };
  if (lower === "preflight" || lower === "validate" || lower === "will it pass")
    return { skill: "preflight", args: "" };
  if (lower.startsWith("submit") || lower.startsWith("publish"))
    return { skill: "submit", args: lower.replace(/^(submit|publish)\s*/, "") };
  if (lower === "enroll" || lower.startsWith("enroll "))
    return { skill: "enroll", args: lower.replace(/^enroll\s*/, "") };
  if (lower === "help" || lower === "?" || lower === "commands")
    return { skill: "help" };
  if (lower === "quit" || lower === "exit" || lower === "q")
    return { skill: "quit" };
  // Natural language heuristics
  if (/how am i|how's it going|status|how do/.test(lower))
    return { skill: "diagnose" };
  if (/what should|recommend|suggest|improve|better/.test(lower))
    return { skill: "suggest" };
  if (/taste|preference|style|my profile/.test(lower))
    return { skill: "taste" };
  if (/cost|spend|dollar|money|price/.test(lower)) return { skill: "cost" };
  if (/trend|history|over time|improving|declining/.test(lower))
    return { skill: "track" };
  return null; // unknown
}

/** Run the REPL. ctx is the shared context (cascade, se, profile, etc). */
export async function startRepl(ctx, scanFn) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "signa> ",
  });

  console.log(
    '\nsigna — interactive token-cascade agent. Type "help" for commands.\n',
  );
  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    const match = matchSkill(input);
    if (!match) {
      // Try LLM if configured
      if (hasLLM(ctx.settings)) {
        const llmResult = await llmRespond(input, ctx);
        if (llmResult) {
          console.log("\n" + llmResult + "\n");
          rl.prompt();
          return;
        }
      }
      console.log(`\nI didn't understand that. Type "help" for commands.\n`);
      rl.prompt();
      return;
    }

    try {
      switch (match.skill) {
        case "scan":
          console.log("\nScanning logs...");
          await scanFn();
          console.log('Done. Ask me "how am I doing?"\n');
          break;
        case "diagnose":
          console.log("\n" + (await skillDiagnose(ctx)) + "\n");
          break;
        case "simulate":
          console.log("\n" + (await skillSimulate(ctx, match.args)) + "\n");
          break;
        case "suggest":
          console.log("\n" + (await skillSuggest(ctx)) + "\n");
          break;
        case "track":
          console.log("\n" + (await skillTrack(ctx)) + "\n");
          break;
        case "taste":
          console.log("\n" + (await skillTaste(ctx)) + "\n");
          break;
        case "asi":
          console.log("\n" + (await skillASI(ctx)) + "\n");
          break;
        case "bridge":
          console.log("\n" + (await skillBridge(ctx)) + "\n");
          break;
        case "goal":
          console.log("\n" + (await skillGoal(ctx, match.args)) + "\n");
          break;
        case "cost":
          console.log("\n" + (await skillCost(ctx)) + "\n");
          break;
        case "anomaly":
          console.log("\n" + (await skillAnomaly(ctx)) + "\n");
          break;
        case "self-improve":
          console.log("\n" + (await skillSelfImprove(ctx)) + "\n");
          break;
        case "compare":
          console.log("\n" + (await skillCompare(ctx, match.args)) + "\n");
          break;
        case "watch":
          console.log("\nStarting watch daemon...");
          const { startWatch } = await import("./watch.mjs");
          const { join } = await import("node:path");
          const { homedir } = await import("node:os");
          const root =
            ctx.settings.root || join(homedir(), ".claude", "projects");
          startWatch(root, async () => {
            console.log("\n[watch] change detected, scanning...");
            await scanFn();
            console.log("[watch] done. Updated context loaded.\n");
          });
          console.log("");
          break;
        case "preflight":
          console.log("\n" + (await skillPreflight(ctx, match.args)) + "\n");
          break;
        case "submit":
          console.log("\n" + (await skillSubmit(ctx, match.args)) + "\n");
          break;
        case "enroll":
          console.log("\n" + (await skillEnroll(ctx, match.args)) + "\n");
          break;
        case "help":
          console.log(HELP);
          break;
        case "quit":
          rl.close();
          return;
      }
    } catch (err) {
      console.error(`\nError: ${err.message}\n`);
    }
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Goodbye.");
    process.exit(0);
  });
}
