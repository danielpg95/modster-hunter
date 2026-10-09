// Lets Node import the mod's TypeScript from plugin/hooks/. Node strips the
// types (22.18+), but needs a file extension on every relative import, and the
// mod's code writes `./fields` and `./content` the way the mod runtime accepts.
// This hook retries such imports as `.ts` and `/index.ts`. Import this file
// before importing anything from plugin/.
// A default import, so Node 20 reaches the version check instead of failing on a missing export
import nodeModule from 'node:module'

const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`tools/ need Node 22.18 or later to load the mod's TypeScript (this is ${process.version}); see docs/DEVELOPMENT.md`)
  process.exit(1)
}

const NOT_FOUND = new Set(['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT'])

nodeModule.registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      const relative = specifier.startsWith('./') || specifier.startsWith('../')
      if (!relative || !NOT_FOUND.has(error?.code)) throw error
      for (const suffix of ['.ts', '/index.ts']) {
        try {
          return nextResolve(specifier + suffix, context)
        } catch {
          // try the next spelling
        }
      }
      throw error
    }
  },
})
