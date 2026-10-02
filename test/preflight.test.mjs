import test from "node:test";
import assert from "node:assert/strict";
import { plausibilityCheck } from "../src/preflight.mjs";

const telemetry = {
  sessions_count: 1,
  turns_total: 10,
  tokens_total: 380_100,
  tokens_input_fresh: 100,
  tokens_output: 20_000,
  tokens_cache_read: 350_000,
  tokens_cache_creation: 10_000,
  active_minutes_est: 10,
};

const window = {
  start: "2026-09-25T00:00:00.000Z",
  end: "2026-10-02T00:00:00.000Z",
};

test("high cache reuse is not a plausibility failure", () => {
  const issues = plausibilityCheck(telemetry, window);
  const staleCompositionCodes = new Set([
    "cache_without_creation",
    "extreme_cache_ratio",
    "low_cache_write_ratio",
    "implausible_input_share",
    "implausible_cadence",
  ]);
  assert.equal(
    issues.some((entry) => staleCompositionCodes.has(entry.code)),
    false,
  );
});

test("server-parity totals tolerance remains 0.5 percent", () => {
  const justOutsideTolerance = {
    ...telemetry,
    tokens_total: Math.round(telemetry.tokens_total * 1.006),
  };
  const issues = plausibilityCheck(justOutsideTolerance, window);
  assert.equal(
    issues.some((entry) => entry.code === "totals_inconsistent"),
    true,
  );
});
