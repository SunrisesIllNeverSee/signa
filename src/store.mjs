/**
 * store.mjs — local JSON persistence for signa.
 *
 * Everything lives under ~/.signa/ (override with SIGNA_HOME env var).
 *   history.json     — cascade metrics over time (one entry per scan)
 *   taste-profile.json — the taste profile (managed by taste/profile.mjs)
 *   settings.json    — operator codename, primary platform, model pricing overrides
 *
 * No SQLite, no external deps. Just JSON files. The history is append-only
 * (one entry per scan/compute), capped at 1000 entries to prevent unbounded growth.
 */

import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

export const SIGNA_HOME = process.env.SIGNA_HOME || join(homedir(), '.signa')
const HISTORY_PATH = join(SIGNA_HOME, 'history.json')
const SETTINGS_PATH = join(SIGNA_HOME, 'settings.json')

async function ensureHome() {
  await mkdir(SIGNA_HOME, { recursive: true })
}

/** Load settings (codename, platform, etc). Returns defaults if not found. */
export async function loadSettings() {
  if (!existsSync(SETTINGS_PATH)) {
    return { codename: 'local', platform: 'claude', root: null }
  }
  try {
    return JSON.parse(await readFile(SETTINGS_PATH, 'utf-8'))
  } catch {
    return { codename: 'local', platform: 'claude', root: null }
  }
}

/** Save settings. */
export async function saveSettings(settings) {
  await ensureHome()
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf-8')
}

/** Load history (array of {ts, cascade, se, tokens}). Returns [] if not found. */
export async function loadHistory() {
  if (!existsSync(HISTORY_PATH)) return []
  try {
    return JSON.parse(await readFile(HISTORY_PATH, 'utf-8'))
  } catch {
    return []
  }
}

/** Append a history entry. Caps at 1000 entries (drops oldest). */
export async function appendHistory(entry) {
  await ensureHome()
  const history = await loadHistory()
  history.push({ ts: new Date().toISOString(), ...entry })
  const capped = history.slice(-1000)
  await writeFile(HISTORY_PATH, JSON.stringify(capped, null, 2) + '\n', 'utf-8')
  return capped
}

/** Clear history. */
export async function clearHistory() {
  await ensureHome()
  await writeFile(HISTORY_PATH, '[]\n', 'utf-8')
}
