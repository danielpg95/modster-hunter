import { mock } from 'claude-code/testing'
import type { On } from 'claude-code'

/** The home folder the stub reports; user content lives under it */
export const STUB_HOME = '/home/tester'
const USER_ROOT = `${STUB_HOME}/.claude/modster-hunter/`

/**
 * Answers the mod's `$.fs` calls from `{ 'biomes/x/biome.json': text }`,
 * paths relative to the plugin's `content/` folder, so `session.start` loads
 * this content instead of the real folder. `user` holds files relative to
 * `~/.claude/modster-hunter/` (its `content/` and `cache/`); writes land
 * there too. Also sets HOME, swallows `$.ui.log`, and collects toasts.
 */
export function stubContentFs(on: On, files: Readonly<Record<string, string>>, user: Record<string, string> = {}): { toasts: string[] } {
  // The loader writes a summary to the debug log; nothing to check there
  on('ui.log', () => ({ value: undefined }))
  mock.env(on, { HOME: STUB_HOME })

  // Each path maps to [the file map it lives in, its path inside that map]
  const locate = (path: string): [Readonly<Record<string, string>>, string] | undefined => {
    if (path.startsWith(USER_ROOT)) return [user, path.slice(USER_ROOT.length)]
    if (path.startsWith(STUB_HOME)) return undefined
    const rel = path.split('/content/')[1] ?? (path.endsWith('/content') ? '' : undefined)
    return rel === undefined ? undefined : [files, rel]
  }
  const isFolder = (map: Readonly<Record<string, string>>, rel: string): boolean =>
    Object.keys(map).some((file) => rel === '' || file.startsWith(`${rel}/`))

  on('fs.exists', ($, e) => {
    const found = locate(e.path)
    return { value: found !== undefined && (found[1] in found[0] || isFolder(...found)) }
  })
  on('fs.list', ($, e) => {
    const [map, rel] = locate(e.path) ?? [{}, '']
    const prefix = rel === '' ? '' : `${rel}/`
    const names = new Set(
      Object.keys(map).filter((file) => file.startsWith(prefix)).map((file) => file.slice(prefix.length).split('/')[0] ?? ''),
    )
    return {
      value: [...names].map((name) => ({
        name,
        kind: `${prefix}${name}` in map ? ('file' as const) : ('dir' as const),
        size: 0,
        mtimeMs: 0,
        isLink: false,
      })),
    }
  })
  on('fs.read', ($, e) => {
    const found = locate(e.path)
    const text = found?.[0][found[1]]
    if (text === undefined) return { deny: `no such file: ${e.path}` }
    // A PNG is kept as base64 text; a bytes read hands it back as is
    return e.as === 'bytes' ? { value: { base64: text } } : { value: text }
  })
  on('fs.stat', ($, e) => {
    const found = locate(e.path)
    const text = found?.[0][found[1]]
    if (text === undefined) return { deny: `no such file: ${e.path}` }
    return { value: { kind: 'file' as const, size: text.length, mtimeMs: 1, isLink: false } }
  })
  on('fs.write', ($, e) => {
    if (!e.path.startsWith(USER_ROOT)) return { deny: `not a stubbed path: ${e.path}` }
    user[e.path.slice(USER_ROOT.length)] = e.text
    return { value: undefined }
  })
  const toasts: string[] = []
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  return { toasts }
}
