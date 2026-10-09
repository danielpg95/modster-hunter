import type { EngineInterface, Register } from 'claude-code'
import { formatIssue, loadContent, type ContentReader, type ContentRegistry } from './content'

// Rebuilt at every session start; cheap, so it isn't kept in $.state (ARCHITECTURE.md)
let content: ContentRegistry | undefined

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    content = await loadBuiltInContent($)
    // Register last: a taken name throws and would skip the rest of this hook
    await $.command.register({ name: 'modsters', description: 'Open your Modster collection' })
    return next(e)
  })

  on('command.run', { command: 'modsters' }, async () => {
    return { text: 'Modster Hunter is loaded' }
  })
}

// Functions that take `$` live in this file: the engine follows `$` only into
// functions declared in the same file, never across an import (validate --strict).

/**
 * Loads `plugin/content/` (P2-03; user content joins in P4-01). Problems go to
 * the debug log, not the transcript; the Settings tab will list them (P4-02).
 */
async function loadBuiltInContent($: EngineInterface): Promise<ContentRegistry> {
  const started = performance.now()
  const registry = await loadContent(fsReader($), `${$.plugin.root}/content`)
  const ms = Math.round(performance.now() - started)
  for (const issue of registry.issues) $.ui.log(formatIssue(issue), { to: 'debug' })
  const summary = `${registry.biomes.size} biomes, ${registry.modsters.size} Modsters, ${registry.issues.length} issues`
  $.ui.log(`content: ${summary} in ${ms} ms`, { to: 'debug' })
  return registry
}

/** `$.fs` behind the loader's reader: a missing folder or file is absent, not an error. */
function fsReader($: EngineInterface): ContentReader {
  return {
    async listFolders(path) {
      if (!(await $.fs.exists(path))) return []
      const entries = await $.fs.list(path)
      return entries.filter((entry) => entry.kind === 'dir').map((entry) => entry.name)
    },
    async readText(path) {
      if (!(await $.fs.exists(path))) return undefined
      const text = await $.fs.read(path)
      // Without `{ as: 'bytes' }` a read is always text
      return typeof text === 'string' ? text : undefined
    },
  }
}
