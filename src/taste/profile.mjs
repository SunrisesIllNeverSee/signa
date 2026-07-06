/**
 * taste/profile.mjs — build, save, load the taste profile.
 *
 * The profile is a local JSON file at ~/.signa/taste-profile.json.
 * It captures the operator's preferences, correction patterns, and steering
 * metrics — distilled from session logs. Never submitted. Operator-owned.
 */

import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extractTaste } from './extractor.mjs'

const SIGNA_HOME = process.env.SIGNA_HOME || join(homedir(), '.signa')
const PROFILE_PATH = join(SIGNA_HOME, 'taste-profile.json')

/** Build a taste profile from aggregated session data. */
export function buildProfile(agg, operator = 'local') {
  const taste = extractTaste(agg, operator)
  return {
    version: '1.0',
    operator,
    generatedAt: new Date().toISOString(),
    sessionsAnalyzed: taste.raw.sessionsAnalyzed,
    totalToolUses: taste.raw.totalToolUses,
    totalEdits: taste.raw.totalEdits,
    totalRejections: taste.raw.totalRejections,
    correctionLoops: taste.raw.correctionLoops,
    acceptanceRate: taste.metrics.acceptanceRate,
    steeringEfficiency: taste.metrics.steeringEfficiency,
    preferences: taste.preferences,
    correctionPatterns: taste.correctionPatterns,
    metrics: taste.metrics,
  }
}

/** Save the taste profile to disk. */
export async function saveProfile(profile) {
  await mkdir(SIGNA_HOME, { recursive: true })
  await writeFile(PROFILE_PATH, JSON.stringify(profile, null, 2) + '\n', 'utf-8')
  return PROFILE_PATH
}

/** Load the taste profile from disk. Returns null if not found. */
export async function loadProfile() {
  if (!existsSync(PROFILE_PATH)) return null
  const text = await readFile(PROFILE_PATH, 'utf-8')
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Generate the taste profile from sessions and save it. */
export async function generateAndSave(agg, operator = 'local') {
  const profile = buildProfile(agg, operator)
  await saveProfile(profile)
  return profile
}

export { PROFILE_PATH, SIGNA_HOME }
