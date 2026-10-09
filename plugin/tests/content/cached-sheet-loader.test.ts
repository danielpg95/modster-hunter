import { describe, expect, test } from 'claude-code/testing'
import { cachedSheetLoader, type SheetFiles } from '../../hooks/content'
import { encodePng } from '../fixtures/encode-png'

const PNG_PATH = '/home/u/content/modsters/blobby/sprite.png'
const CACHE = '/home/u/cache/sprites'
const CACHE_FILE = `${CACHE}/blobby.sprite.json`
const sheet = { path: PNG_PATH, file: 'modsters/blobby/sprite.png', modsterId: 'blobby', frames: 2 }

const samples = Array.from({ length: 16 * 8 }, (_, i) => (i % 3 === 0 ? 1 : 0))
const PNG = encodePng({ width: 16, height: 8, colorType: 3, bitDepth: 2, samples, palette: [0, 0, 0, 9, 9, 9], transparency: [0] })

/** SheetFiles over a map; counts PNG reads so tests can tell a cache hit from a decode. */
function memoryFiles(options: { failWrites?: boolean } = {}) {
  const texts: Record<string, string> = {}
  const stats: Record<string, { size: number; mtimeMs: number }> = { [PNG_PATH]: { size: PNG.length, mtimeMs: 100 } }
  const counts = { pngReads: 0 }
  const files: SheetFiles = {
    stat: async (path) => stats[path],
    readBytes: async () => {
      counts.pngReads++
      return PNG
    },
    readText: async (path) => texts[path],
    writeText: async (path, text) => {
      if (options.failWrites) throw new Error('EACCES')
      texts[path] = text
    },
  }
  return { files, texts, stats, counts }
}

describe('cachedSheetLoader', () => {
  test('the first load decodes the PNG and writes the cache', async () => {
    const { files, texts, counts } = memoryFiles()
    const result = await cachedSheetLoader(files, CACHE)(sheet)
    expect(result?.ok).toBe(true)
    expect(counts.pngReads).toBe(1)
    expect(JSON.parse(texts[CACHE_FILE] ?? '{}')).toMatchObject({ v: 1, source: { size: PNG.length, mtimeMs: 100, frames: 2 } })
  })

  test('a later load with the same PNG uses the cache and gives the same sprite', async () => {
    const { files, counts } = memoryFiles()
    const first = await cachedSheetLoader(files, CACHE)(sheet)
    const second = await cachedSheetLoader(files, CACHE)(sheet)
    expect(counts.pngReads).toBe(1)
    expect(second).toEqual(first)
  })

  test('a changed PNG (mtime or size) or frame count decodes again', async () => {
    const { files, stats, counts } = memoryFiles()
    const load = cachedSheetLoader(files, CACHE)
    await load(sheet)
    stats[PNG_PATH] = { size: PNG.length, mtimeMs: 200 }
    await load(sheet)
    stats[PNG_PATH] = { size: PNG.length + 1, mtimeMs: 200 }
    await load(sheet)
    await load({ ...sheet, frames: 1 })
    expect(counts.pngReads).toBe(4)
  })

  test('a corrupt or invalid cache file is ignored and replaced', async () => {
    for (const bad of ['{ not json', JSON.stringify({ v: 1, source: { size: PNG.length, mtimeMs: 100, frames: 2 }, sprite: { width: 3 } })]) {
      const { files, texts, counts } = memoryFiles()
      texts[CACHE_FILE] = bad
      const result = await cachedSheetLoader(files, CACHE)(sheet)
      expect(result?.ok).toBe(true)
      expect(counts.pngReads).toBe(1)
      expect(texts[CACHE_FILE]).not.toBe(bad)
    }
  })

  test('a cache that cannot be written never stops the sprite from loading', async () => {
    const { files } = memoryFiles({ failWrites: true })
    expect((await cachedSheetLoader(files, CACHE)(sheet))?.ok).toBe(true)
  })

  test('a missing PNG gives undefined, so the loader reports it missing', async () => {
    const { files } = memoryFiles()
    expect(await cachedSheetLoader(files, CACHE)({ ...sheet, path: '/nowhere.png' })).toBeUndefined()
  })

  test('a PNG that fails to decode is not cached', async () => {
    const { files, texts } = memoryFiles()
    const result = await cachedSheetLoader(files, CACHE)({ ...sheet, frames: 3 })
    expect(result?.ok).toBe(false)
    expect(texts[CACHE_FILE]).toBeUndefined()
  })
})
