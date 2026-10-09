import { USER_CONTENT } from '../constants'
import { isObject } from './fields'
import type { SheetLoader } from './load-content'
import { spriteFromPng } from './sprite-from-png'
import type { Sprite, Validation } from './types'
import { validateSprite } from './validate-sprite'

/** The file access the PNG cache needs; the adapter backs it with `$.fs`. */
export interface SheetFiles {
  /** Size and modification time, or undefined when the file doesn't exist */
  stat(path: string): Promise<{ size: number; mtimeMs: number } | undefined>
  readBytes(path: string): Promise<Uint8Array>
  readText(path: string): Promise<string | undefined>
  writeText(path: string, text: string): Promise<void>
}

/** What a cache file records about the PNG it was made from. */
interface Source {
  size: number
  mtimeMs: number
  frames: number
}

/**
 * Loads PNG sheets through a cache in `cacheFolder`, one `<modster-id>.sprite.json`
 * each (decision 0016 point 7). The cache is used only when the PNG's size,
 * mtime and frame count match and its sprite still validates. A cache that
 * can't be read or written is ignored: the PNG is decoded instead.
 */
export function cachedSheetLoader(files: SheetFiles, cacheFolder: string): SheetLoader {
  return async ({ path, file, modsterId, frames }) => {
    const stat = await files.stat(path)
    if (!stat) return undefined
    const source: Source = { size: stat.size, mtimeMs: stat.mtimeMs, frames }
    const cachePath = `${cacheFolder}/${modsterId}.sprite.json`

    const cached = await readCache(files, cachePath, source, file)
    if (cached) return { ok: true, value: cached, issues: [] }

    const result = spriteFromPng(await files.readBytes(path), frames, file)
    if (result.ok) await writeCache(files, cachePath, source, result.value)
    return result
  }
}

async function readCache(files: SheetFiles, cachePath: string, source: Source, file: string): Promise<Sprite | undefined> {
  try {
    const text = await files.readText(cachePath)
    if (text === undefined) return undefined
    const entry: unknown = JSON.parse(text)
    if (!isObject(entry) || entry.v !== USER_CONTENT.spriteCacheVersion || !sameSource(entry.source, source)) return undefined
    const sprite: Validation<Sprite> = validateSprite(entry.sprite, { file })
    return sprite.ok ? sprite.value : undefined
  } catch {
    return undefined
  }
}

async function writeCache(files: SheetFiles, cachePath: string, source: Source, sprite: Sprite): Promise<void> {
  try {
    await files.writeText(cachePath, JSON.stringify({ v: USER_CONTENT.spriteCacheVersion, source, sprite }))
  } catch {
    // The sprite still loads; the next session decodes the PNG again
  }
}

function sameSource(value: unknown, source: Source): boolean {
  return isObject(value) && value.size === source.size && value.mtimeMs === source.mtimeMs && value.frames === source.frames
}
