/**
 * watch.mjs — daemon: auto-scan on .jsonl change, post notifications.
 *
 * Uses fs.watch recursively (Node 18+ supports recursive watch on macOS/Win).
 * On .jsonl change, debounces for 60s, then runs scan → compute → notify.
 * Notifications print to stdout (the REPL picks them up if running).
 */

import { watch } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'

const DEFAULT_ROOT = join(homedir(), '.claude', 'projects')

export function startWatch(root, callback, debounceMs = 60_000) {
  if (!existsSync(root)) {
    console.log(`[watch] root does not exist: ${root}`)
    return null
  }
  let timer = null
  let watcher
  try {
    watcher = watch(root, { recursive: true }, (eventType, filename) => {
      if (!filename || !filename.endsWith('.jsonl')) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        callback().catch(err => console.error(`[watch] error: ${err.message}`))
      }, debounceMs)
    })
  } catch (err) {
    console.error(`[watch] failed to start: ${err.message}`)
    return null
  }
  console.log(`[watch] monitoring ${root} (debounce ${debounceMs / 1000}s). Ctrl-C to stop.`)
  return watcher
}
