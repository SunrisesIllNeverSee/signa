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

test("low fresh-input share is not a plausibility flag", () => {
  const issues = plausibilityCheck(telemetry, window);
  assert.equal(
    issues.some((entry) => entry.code === "implausible_input_share"),
    false,
  );
});

test("other production integrity signals remain active", () => {
  const issues = plausibilityCheck(
    {
      ...telemetry,
      tokens_total: 1_040_100,
      tokens_cache_read: 1_010_000,
    },
    window,
  );
  assert.equal(
    issues.some((entry) => entry.code === "extreme_cache_ratio"),
    true,
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
