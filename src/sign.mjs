/**
 * sign.mjs — canonical JSON + ed25519 signing for signa.
 *
 * BYTE-COMPATIBLE PORT of sigrank-mcp sign.mjs (which is itself a port of
 * sigrank-app lib/ingest/signature.ts). The server VERIFIES the signature
 * over ITS recomputation of these exact canonical bytes, so a single
 * divergent byte hard-rejects (422) every verified submission.
 *
 * Canonical JSON = recursively sorted keys, compact separators, UTF-8,
 * with agent.signature + agent.snapshot_hash stripped before serialization.
 * snapshot_hash = "sha256:" + hex(sha256(canonical_bytes)).
 * signature = base64 of the 64-byte ed25519 signature over canonical_bytes.
 */

import { createHash, createPrivateKey, createPublicKey, sign as edSign, verify as edVerify } from 'node:crypto'

const DERIVED_AGENT_FIELDS = ['signature', 'snapshot_hash']

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep)
  if (v && typeof v === 'object') {
    const out = {}
    for (const k of Object.keys(v).sort()) out[k] = sortDeep(v[k])
    return out
  }
  return v
}

export function canonicalJson(payload) {
  const clone = JSON.parse(JSON.stringify(payload))
  const agent = clone.agent
  if (agent && typeof agent === 'object') {
    for (const f of DERIVED_AGENT_FIELDS) delete agent[f]
  }
  return JSON.stringify(sortDeep(clone))
}

export function canonicalBytes(payload) {
  return Buffer.from(canonicalJson(payload), 'utf-8')
}

export function snapshotHash(payload) {
  return `sha256:${createHash('sha256').update(canonicalBytes(payload)).digest('hex')}`
}

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function publicKeyFrom(pk) {
  try {
    const body = pk.startsWith('ed25519:') ? pk.slice('ed25519:'.length) : pk
    const raw = Buffer.from(body, 'base64')
    if (raw.length !== 32) return null
    return createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, raw]), format: 'der', type: 'spki' })
  } catch {
    return null
  }
}

export function signPayload(payload, privateKeyPkcs8B64) {
  const key = createPrivateKey({ key: Buffer.from(privateKeyPkcs8B64, 'base64'), format: 'der', type: 'pkcs8' })
  return edSign(null, canonicalBytes(payload), key).toString('base64')
}

export function verifyPayload(payload, signatureB64, publicKey) {
  const key = publicKeyFrom(publicKey)
  if (!key) return false
  try {
    return edVerify(null, canonicalBytes(payload), key, Buffer.from(signatureB64, 'base64'))
  } catch {
    return false
  }
}
