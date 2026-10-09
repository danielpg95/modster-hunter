import type { On } from 'claude-code'

/**
 * Answers the mod's `$.fs` calls from `{ 'biomes/x/biome.json': text }`,
 * paths relative to the plugin's `content/` folder, so `session.start` loads
 * this content instead of the real folder. Also swallows `$.ui.log`.
 */
export function stubContentFs(on: On, files: Readonly<Record<string, string>>): void {
  // The loader writes a summary to the debug log; nothing to check there
  on('ui.log', () => ({ value: undefined }))
  const relative = (path: string): string | undefined => path.split('/content/')[1] ?? (path.endsWith('/content') ? '' : undefined)
  const isFolder = (rel: string): boolean => Object.keys(files).some((file) => rel === '' || file.startsWith(`${rel}/`))

  on('fs.exists', ($, e) => {
    const rel = relative(e.path)
    return { value: rel !== undefined && (rel in files || isFolder(rel)) }
  })
  on('fs.list', ($, e) => {
    const rel = relative(e.path) ?? ''
    const prefix = rel === '' ? '' : `${rel}/`
    const names = new Set(
      Object.keys(files).filter((file) => file.startsWith(prefix)).map((file) => file.slice(prefix.length).split('/')[0] ?? ''),
    )
    return {
      value: [...names].map((name) => ({
        name,
        kind: `${prefix}${name}` in files ? ('file' as const) : ('dir' as const),
        size: 0,
        mtimeMs: 0,
        isLink: false,
      })),
    }
  })
  on('fs.read', ($, e) => {
    const text = files[relative(e.path) ?? '']
    return text === undefined ? { deny: `no such file: ${e.path}` } : { value: text }
  })
}
