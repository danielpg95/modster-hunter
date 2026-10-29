import type { ContentReader } from '../../hooks/content'
import { base64FromBytes } from './base64-from-bytes'

/**
 * A ContentReader over `{ path: text }`, with bytes for binary files (desktop
 * art). A path whose value is an Error makes the read reject with it, like
 * `$.fs.read` on a file over 4 MiB.
 */
export function memoryReader(files: Readonly<Record<string, string | Uint8Array | Error>>): ContentReader {
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
      return typeof text === 'string' ? text : undefined
    },
    async readBase64(path) {
      const bytes = files[path]
      if (bytes instanceof Error) throw bytes
      if (bytes === undefined) return undefined
      if (typeof bytes === 'string') throw new Error('is text in this test')
      return base64FromBytes(bytes)
    },
  }
}
