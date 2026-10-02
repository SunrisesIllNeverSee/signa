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

test("input-share floor applies to single-platform telemetry", () => {
  const issues = plausibilityCheck(telemetry, window, "claude");
  const issue = issues.find((entry) => entry.code === "implausible_input_share");
  assert.ok(issue);
  assert.match(issue.detail, /0\.03%/);
});

test("multi-platform aggregates are exempt from input-share floor", () => {
  const issues = plausibilityCheck(telemetry, window, "multi");
  assert.equal(
    issues.some((entry) => entry.code === "implausible_input_share"),
    false,
  );
});
