/**
 * attest.mjs — source file integrity attestation for signa.
 *
 * This is the real anti-gaming signal only the on-device agent can produce.
 * The agent hashes the log files it read (path_hash + content_hash + mtime +
 * size + lines + first/last timestamps) and includes them in the v1.1 payload
 * as `source_attestation`. The server stores these and cross-checks them
 * across submissions — if a file's content_hash changes but its timestamps
 * don't, that's tampering (the file was edited without the session moving).
 *
 * This is stronger than Benford/contamination because it catches fabrication
 * at the source: a fabricator who edits their JSONL files between submissions
 * is caught by the inconsistency. And it can only be produced by the agent
 * that actually read the files — you can't fake it from a paste calculator.
 *
 * Schema (from lib/payload/schema.ts:sourceAttestationSchema):
 *   path_hash:    string  — sha256 of the file path (privacy: path not sent)
 *   content_hash: string  — sha256 of the file content
 *   mtime:        number  — file modification time (epoch ms)
 *   size:         number  — file size in bytes
 *   lines:        number  — line count
 *   first_ts:     string? — ISO timestamp of the first session in the file
 *   last_ts:      string? — ISO timestamp of the last session in the file
 */

import { createHash } from "node:crypto";
import { statSync, readFileSync } from "node:fs";

/**
 * Build a source_attestation entry for a single log file.
 * Returns null if the file can't be read (skip silently).
 */
export function attestFile(filePath, sessions) {
  try {
    const stat = statSync(filePath);
    const content = readFileSync(filePath, "utf-8");

    const pathHash = createHash("sha256").update(filePath).digest("hex");
    const contentHash = createHash("sha256").update(content).digest("hex");
    const lines = content.split("\n").filter((l) => l.length > 0).length;

    // Extract first/last timestamps from the sessions that came from this file
    let firstTs = null;
    let lastTs = null;
    if (sessions && sessions.length > 0) {
      const ts = sessions
        .map((s) => s.timestamp)
        .filter(Boolean)
        .sort();
      if (ts.length > 0) {
        firstTs = ts[0];
        lastTs = ts[ts.length - 1];
      }
    }

    return {
      path_hash: pathHash,
      content_hash: contentHash,
      mtime: stat.mtimeMs,
      size: stat.size,
      lines,
      first_ts: firstTs,
      last_ts: lastTs,
    };
  } catch {
    return null;
  }
}

/**
 * Build the source_attestation array for a set of log files.
 * Each file gets one entry. Files that can't be read are skipped.
 *
 * @param {Array<{path: string, sessions?: Array}>} files — files to attest
 * @returns {Array} — source_attestation entries (empty if no files)
 */
export function buildAttestation(files) {
  const entries = [];
  for (const f of files) {
    const entry = attestFile(f.path, f.sessions);
    if (entry) entries.push(entry);
  }
  return entries;
}
