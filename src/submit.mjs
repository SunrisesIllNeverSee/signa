/**
 * submit.mjs — build + ed25519-sign a Schema 1.0 snapshot payload and POST it
 * to the VERIFIED ingest endpoint. Port of sigrank-mcp submit.mjs, adapted
 * for signa's module structure.
 *
 * Runs preflight (anti-gaming pre-check) before submitting so the operator
 * knows if the server would reject or downgrade the submission.
 */

import { snapshotHash, signPayload } from './sign.mjs'
import { preflight } from './preflight.mjs'
import { buildAttestation } from './attest.mjs'

const WINDOW_TYPE = { '7d': '7d', '30d': '30d', '90d': '90d', all: 'all_time' }
const WINDOW_SPAN_DAYS = { '7d': 7, '30d': 30, '90d': 90, all_time: 3650 }
const PLATFORM_ENUM = new Set(['claude', 'chatgpt', 'gemini', 'pi', 'codex', 'multi', 'other'])
const RULESET_VERSION = 'sigrank-token-1'
const DAY_MS = 86_400_000

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))
const round = (n, dp) => {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

export function toPlatformPrimary(platform) {
  return PLATFORM_ENUM.has(platform) ? platform : 'other'
}

/**
 * buildPayload — Schema 1.0/1.1 payload from aggregated pillars + enrolled identity.
 * Pure (given opts.now); agent.snapshot_hash is computed last.
 * If opts.attestationFiles is provided, includes a v1.1 source_attestation block.
 */
export function buildPayload(windowKey, pillars, messages, identity, platform, opts = {}) {
  const windowType = WINDOW_TYPE[windowKey] || windowKey
  const spanDays = WINDOW_SPAN_DAYS[windowType] || 30
  const nowMs = opts.now ?? Date.now()

  const input = Math.max(0, Math.round(pillars?.input || 0))
  const output = Math.max(0, Math.round(pillars?.output || 0))
  const cacheCreate = Math.max(0, Math.round(pillars?.cacheCreate || 0))
  const cacheRead = Math.max(0, Math.round(pillars?.cacheRead || 0))
  const tokensTotal = input + output + cacheCreate + cacheRead

  const msgs = Math.max(0, Math.round(messages || 0))
  const turnsTotal = Math.max(output > 0 ? 1 : 0, msgs)
  const sessionsCount = tokensTotal > 0 ? clamp(Math.round(msgs / 8) || 1, 1, Math.max(1, turnsTotal)) : 0
  const spanMinutes = spanDays * 1440
  const minActive = Math.ceil(output / 19000) + 1
  const activeMinutes = clamp(Math.max(msgs, minActive), 1, Math.max(1, spanMinutes - 1))

  const compressionRatio = input + output > 0 ? clamp(output / (input + output), 0, 1) : 0
  const sessionDepth = sessionsCount > 0 ? turnsTotal / sessionsCount : 0

  const payload = {
    schema_version: '1.0',
    codename: identity.codename,
    device_id: identity.device_id,
    submitted_at: new Date(nowMs).toISOString(),
    window: {
      type: windowType,
      start: new Date(nowMs - spanDays * DAY_MS).toISOString(),
      end: new Date(nowMs).toISOString(),
    },
    platform: { primary: toPlatformPrimary(platform), models: [] },
    core_metrics: {
      compression_ratio: round(compressionRatio, 4),
      prompt_complexity: round(clamp(sessionDepth, 0, 100), 2),
      cross_thread_score: clamp(Math.round(cacheRead / Math.max(cacheCreate, 1)), 0, 100000),
      session_depth_avg: round(Math.max(0, sessionDepth), 2),
      token_throughput: null,
    },
    background_metrics: {
      message_volume: msgs,
      account_age_days: Math.max(1, Math.round(opts.accountAgeDays ?? 365)),
      total_messages_lifetime: Math.max(msgs, Math.round(opts.totalMessages ?? msgs)),
    },
    raw_telemetry: {
      sessions_count: sessionsCount,
      turns_total: turnsTotal,
      tokens_total: tokensTotal,
      tokens_input_fresh: input,
      tokens_output: output,
      tokens_cache_read: cacheRead,
      tokens_cache_creation: cacheCreate,
      active_minutes_est: activeMinutes,
    },
    tier: 'free',
    agent: {
      version: identity.agent_version,
      ruleset_version: RULESET_VERSION,
      snapshot_hash: '',
      public_key: identity.public_key,
    },
  }

  // v1.1: source attestation — the anti-gaming signal only the on-device
  // agent can produce. Hashes the log files so the server can detect
  // tampering across submissions (content_hash changed but timestamps didn't).
  if (opts.attestationFiles && opts.attestationFiles.length > 0) {
    const attestation = buildAttestation(opts.attestationFiles)
    if (attestation.length > 0) {
      payload.schema_version = '1.1'
      payload.source_attestation = attestation
    }
  }

  payload.agent.snapshot_hash = snapshotHash(payload)
  return payload
}

/**
 * submitSignedWindow — preflight + build + sign + POST one window.
 * Returns a structured result; never throws on a network error.
 * opts: { apiBase, fetchImpl, platform, now, skipPreflight, strictPreflight, dryRun }
 */
export async function submitSignedWindow(windowKey, pillars, messages, identity, opts = {}) {
  if (!identity?.codename || !identity?.operator_id) {
    return { status: 'not_enrolled', reason: 'not_enrolled', detail: 'Run `signa enroll` to bind this device first.' }
  }
  if (!identity?.private_key_pkcs8_b64) {
    return { status: 'error', reason: 'no_key', detail: 'No local signing key — re-run `signa enroll`.' }
  }

  const apiBase = opts.apiBase || process.env.SIGRANK_API_BASE || 'https://signalaf.com'
  const fetchImpl = opts.fetchImpl || ((url, init = {}) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15_000)
    return fetch(url, { ...init, signal: init.signal || ctrl.signal }).finally(() => clearTimeout(timer))
  })

  const payload = buildPayload(windowKey, pillars, messages, identity, opts.platform || 'claude', opts)

  // Preflight: run the same anti-gaming checks the server will run, locally.
  const pre = preflight(payload)
  if (!pre.pass && !opts.skipPreflight) {
    if (pre.wouldReject) {
      return {
        status: 'preflight_rejected',
        window: WINDOW_TYPE[windowKey] || windowKey,
        preflight: pre,
        detail: `Submission would be REJECTED by the server: ${pre.summary}. Fix the issue or re-run with skipPreflight.`,
      }
    }
    if (opts.strictPreflight) {
      return {
        status: 'preflight_flagged',
        window: WINDOW_TYPE[windowKey] || windowKey,
        preflight: pre,
        detail: `Submission would be DOWNGRADED (not ranked): ${pre.summary}. Fix the issue or re-run with skipPreflight.`,
      }
    }
  }

  const signature = signPayload(payload, identity.private_key_pkcs8_b64)

  if (opts.dryRun) {
    return {
      status: 'dry_run',
      window: WINDOW_TYPE[windowKey] || windowKey,
      would_post: `${apiBase}/api/v1/snapshots`,
      payload,
      signature,
      preflight: pre,
      detail: 'Nothing sent. Re-run without dryRun to publish.',
    }
  }

  let res
  let ack
  try {
    res = await fetchImpl(`${apiBase}/api/v1/snapshots`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-agent-signature': signature,
      },
      body: JSON.stringify(payload),
    })
    try {
      ack = await res.json()
    } catch {
      ack = {}
    }
  } catch (e) {
    return { status: 'error', reason: 'network', detail: e.message, window: WINDOW_TYPE[windowKey] || windowKey }
  }

  return {
    status: res.ok ? ack.status || 'received' : 'error',
    httpStatus: res.status,
    window: WINDOW_TYPE[windowKey] || windowKey,
    verification_tier: ack.verification_tier ?? null,
    persisted: ack.persisted ?? null,
    ranked: !!(res.ok && ack.verification_tier === 'verified' && ack.persisted === true),
    snapshot_hash: payload.agent.snapshot_hash,
    reason: res.ok ? null : ack.reason || ack.status || `http_${res.status}`,
    detail: ack.detail ?? null,
    preflight: pre,
  }
}
