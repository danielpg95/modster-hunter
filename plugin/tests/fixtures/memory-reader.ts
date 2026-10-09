import type { ContentReader } from '../../hooks/content'

/**
 * A ContentReader over `{ path: text }`. A path whose value is an Error makes
 * the read reject with it, like `$.fs.read` on a file over 4 MiB.
 */
export function memoryReader(files: Readonly<Record<string, string | Error>>): ContentReader {
  return {
    async listFolders(path) {
      const prefix = `${path}/`
      const names = Object.keys(files)
        .filter((file) => file.startsWith(prefix) && file.slice(prefix.length).includes('/'))
        .map((file) => file.slice(prefix.length).split('/')[0] ?? '')
      return [...new Set(names)]
    },
    async readText(path) {
      const text = files[path]
      if (text instanceof Error) throw text
      return text
    },
  }
}
