/**
 * keystore.mjs — local ed25519 device identity for signa.
 *
 * Persists a per-device keypair at ~/.signa/identity.json (dir 0700, file 0600).
 * The PRIVATE key never leaves this machine; only the raw 32-byte public key
 * (as "ed25519:<base64>") is sent to the server at enroll time.
 *
 * Port of sigrank-mcp keystore.mjs, adapted for signa's ~/.signa/ home.
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync, unlinkSync } from 'node:fs'
import { generateKeyPairSync, randomUUID } from 'node:crypto'

const SIGNA_HOME = process.env.SIGNA_HOME || join(homedir(), '.signa')
const DIR = SIGNA_HOME
const PATH = join(DIR, 'identity.json')

const SPKI_PREFIX_LEN = 12

function agentVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
    return `signa/${pkg.version}`
  } catch {
    return 'signa'
  }
}

export function keystorePath() {
  return PATH
}

export function loadIdentity() {
  if (!existsSync(PATH)) return null
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8'))
  } catch {
    return null
  }
}

export function persistIdentity(identity) {
  mkdirSync(DIR, { recursive: true })
  try { chmodSync(DIR, 0o700) } catch { /* best-effort */ }
  writeFileSync(PATH, `${JSON.stringify(identity, null, 2)}\n`, { mode: 0o600 })
  try { chmodSync(PATH, 0o600) } catch { /* best-effort */ }
  return identity
}

export function generateIdentity({ device_id } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const spki = publicKey.export({ type: 'spki', format: 'der' })
  const rawPub = Buffer.from(spki).subarray(SPKI_PREFIX_LEN)
  const pkcs8 = privateKey.export({ type: 'pkcs8', format: 'der' })
  return {
    device_id: device_id || randomUUID(),
    codename: null,
    operator_id: null,
    public_key: `ed25519:${rawPub.toString('base64')}`,
    private_key_pkcs8_b64: Buffer.from(pkcs8).toString('base64'),
    agent_version: agentVersion(),
    enrolled_at: null,
  }
}

export function bindingForFreshIdentity(existing, fresh) {
  if (!existing) return { codename: null, operator_id: null, enrolled_at: null }
  if (existing.device_id && fresh.device_id === existing.device_id) {
    return {
      codename: existing.codename ?? null,
      operator_id: existing.operator_id ?? null,
      enrolled_at: existing.enrolled_at ?? null,
    }
  }
  return { codename: null, operator_id: null, enrolled_at: null }
}

export function ensureIdentity() {
  const existing = loadIdentity()
  if (existing?.private_key_pkcs8_b64 && existing?.public_key && existing?.device_id) {
    return existing
  }
  const fresh = generateIdentity({ device_id: existing?.device_id })
  const binding = bindingForFreshIdentity(existing, fresh)
  fresh.codename = binding.codename
  fresh.operator_id = binding.operator_id
  fresh.enrolled_at = binding.enrolled_at
  return persistIdentity(fresh)
}

export function recordEnrollment({ codename, operator_id }) {
  const id = ensureIdentity()
  id.codename = codename ?? null
  id.operator_id = operator_id ?? null
  id.enrolled_at = new Date().toISOString()
  return persistIdentity(id)
}

export function clearIdentity() {
  try { if (existsSync(PATH)) unlinkSync(PATH) } catch { /* best-effort */ }
}
