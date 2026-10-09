import { describe, expect, test } from 'claude-code/testing'
import { formatIssue, loadContent, type SheetLoader, type Sprite } from '../../hooks/content'
import { memoryReader } from '../fixtures/memory-reader'
import { validBiome } from '../fixtures/valid-biome'
import { validModster } from '../fixtures/valid-modster'
import { validSprite } from '../fixtures/valid-sprite'

const ROOT = '/plugin/content'

/** The files of a content folder with one biome and the three Modsters it lists, all valid. */
function forest(): Record<string, string | Error> {
  const files: Record<string, string | Error> = {}
  const biome = validBiome()
  delete biome.background
  files[`${ROOT}/biomes/whispering-forest/biome.json`] = JSON.stringify(biome)
  for (const id of ['sproutling', 'mossbeast', 'pinewraith']) {
    files[`${ROOT}/modsters/${id}/modster.json`] = JSON.stringify({ ...validModster(), id, name: id })
    files[`${ROOT}/modsters/${id}/sprite.sprite.json`] = JSON.stringify(validSprite())
  }
  return files
}

/** The forest, with sproutling's sprite a 2-frame PNG sheet */
function pngForest(): Record<string, string | Error> {
  const files = forest()
  files[`${ROOT}/modsters/sproutling/modster.json`] = JSON.stringify({ ...validModster(), sprite: { file: 'sprite.png', frames: 2 } })
  return files
}
const sprite = validSprite() as unknown as Sprite

const lines = (issues: Parameters<typeof formatIssue>[0][]): string[] => issues.map(formatIssue)

describe('loadContent', () => {
  test('a valid folder loads every biome and Modster with no issues', async () => {
    const content = await loadContent(memoryReader(forest()), ROOT)
    expect([...content.biomes.keys()]).toEqual(['whispering-forest'])
    expect([...content.modsters.keys()]).toEqual(['mossbeast', 'pinewraith', 'sproutling'])
    expect(content.modsters.get('sproutling')?.sprite.width).toBe(8)
    expect(content.issues).toEqual([])
  })

  test('an empty or missing content folder loads nothing, without issues', async () => {
    const content = await loadContent(memoryReader({}), ROOT)
    expect([content.biomes.size, content.modsters.size, content.issues.length]).toEqual([0, 0, 0])
  })

  test('a Modster with an invalid file is skipped and listed; the rest load', async () => {
    const files = forest()
    files[`${ROOT}/modsters/mossbeast/modster.json`] = JSON.stringify({ ...validModster(), id: 'mossbeast', name: '' })
    const content = await loadContent(memoryReader(files), ROOT)
    expect([...content.modsters.keys()]).toEqual(['pinewraith', 'sproutling'])
    expect(lines(content.issues)).toEqual([
      'modsters/mossbeast/modster.json: name must be 1–24 characters (it has 0)',
      'biomes/whispering-forest/biome.json: modsters[1].id names a Modster that doesn\'t exist: "mossbeast"',
    ])
    // The biome keeps its other Modsters
    expect(content.biomes.get('whispering-forest')?.biome.modsters.map((entry) => entry.id)).toEqual(['sproutling', 'pinewraith'])
  })

  test('a file that is not JSON is skipped and listed', async () => {
    const files = forest()
    files[`${ROOT}/modsters/sproutling/modster.json`] = '{ "id": "sproutling", '
    const content = await loadContent(memoryReader(files), ROOT)
    expect(content.modsters.has('sproutling')).toBe(false)
    expect(content.issues[0]?.file).toBe('modsters/sproutling/modster.json')
    expect(content.issues[0]?.problem.startsWith('is not valid JSON: ')).toBe(true)
  })

  test('valid JSON that is not an object is reported by the validator', async () => {
    const files = forest()
    files[`${ROOT}/modsters/sproutling/modster.json`] = '[]'
    const content = await loadContent(memoryReader(files), ROOT)
    expect(lines(content.issues)[0]).toBe('modsters/sproutling/modster.json must be a JSON object')
  })

  test('a folder without its JSON file is listed as missing', async () => {
    const files = forest()
    delete files[`${ROOT}/modsters/sproutling/modster.json`]
    const content = await loadContent(memoryReader(files), ROOT)
    expect(content.modsters.has('sproutling')).toBe(false)
    expect(lines(content.issues)[0]).toBe('modsters/sproutling/modster.json is missing')
  })

  test('a file the reader refuses is listed with the reason, never thrown', async () => {
    const files = forest()
    files[`${ROOT}/modsters/sproutling/sprite.sprite.json`] = new Error('file is over 4 MiB')
    const content = await loadContent(memoryReader(files), ROOT)
    expect(content.modsters.has('sproutling')).toBe(false)
    expect(lines(content.issues).slice(0, 2)).toEqual([
      'modsters/sproutling/sprite.sprite.json could not be read: file is over 4 MiB',
      'modsters/sproutling/modster.json: sprite.file points to a sprite that didn\'t load: modsters/sproutling/sprite.sprite.json',
    ])
  })

  test('a Modster whose sprite is invalid is skipped too', async () => {
    const files = forest()
    files[`${ROOT}/modsters/sproutling/sprite.sprite.json`] = JSON.stringify({ ...validSprite(), height: 9 })
    const content = await loadContent(memoryReader(files), ROOT)
    expect(content.modsters.has('sproutling')).toBe(false)
    expect(lines(content.issues)[0]).toBe('modsters/sproutling/sprite.sprite.json: height must be even (it is 9)')
  })

  test('a folder name that differs from the id is skipped', async () => {
    const files = forest()
    const text = files[`${ROOT}/modsters/sproutling/modster.json`]
    if (typeof text !== 'string') throw new Error('fixture')
    files[`${ROOT}/modsters/sprout/modster.json`] = text
    files[`${ROOT}/modsters/sprout/sprite.sprite.json`] = JSON.stringify(validSprite())
    const content = await loadContent(memoryReader(files), ROOT)
    expect(lines(content.issues)).toEqual(['modsters/sprout/modster.json: id must match its folder name "sprout" (it is "sproutling")'])
  })

  test('a biome with none of its Modsters loaded is dropped', async () => {
    const files = forest()
    for (const id of ['sproutling', 'mossbeast', 'pinewraith']) delete files[`${ROOT}/modsters/${id}/modster.json`]
    const content = await loadContent(memoryReader(files), ROOT)
    expect(content.biomes.size).toBe(0)
    expect(lines(content.issues).at(-1)).toBe('biomes/whispering-forest/biome.json: modsters has no Modsters left that exist')
  })

  test('a valid background loads with its biome', async () => {
    const files = forest()
    files[`${ROOT}/biomes/whispering-forest/biome.json`] = JSON.stringify(validBiome())
    files[`${ROOT}/biomes/whispering-forest/background.sprite.json`] = JSON.stringify({ ...validSprite(), frames: [(validSprite().frames as string[])[0]] })
    const content = await loadContent(memoryReader(files), ROOT)
    expect(content.biomes.get('whispering-forest')?.background?.frames.length).toBe(1)
    expect(content.issues).toEqual([])
  })

  test('a bad background is listed and the biome loads without it', async () => {
    const files = forest()
    files[`${ROOT}/biomes/whispering-forest/biome.json`] = JSON.stringify(validBiome())
    files[`${ROOT}/biomes/whispering-forest/background.sprite.json`] = JSON.stringify(validSprite()) // 2 frames
    const content = await loadContent(memoryReader(files), ROOT)
    const loaded = content.biomes.get('whispering-forest')
    expect(loaded?.background).toBeUndefined()
    expect(loaded?.biome.background).toBeUndefined()
    expect(lines(content.issues)).toEqual([
      'biomes/whispering-forest/background.sprite.json: frames must have exactly 1 frame for a background (it has 2)',
    ])
  })

  test('hidden folders are ignored', async () => {
    const files = forest()
    files[`${ROOT}/modsters/.cache/modster.json`] = 'not json'
    const content = await loadContent(memoryReader(files), ROOT)
    expect(content.issues).toEqual([])
  })

  test('a folder the reader cannot list is listed, and loading goes on', async () => {
    const reader = memoryReader(forest())
    const failing = {
      ...reader,
      async listFolders(path: string) {
        if (path.endsWith('/modsters')) throw new Error('permission denied')
        return reader.listFolders(path)
      },
    }
    const content = await loadContent(failing, ROOT)
    expect(lines(content.issues)[0]).toBe('modsters/ could not be listed: permission denied')
    expect(content.biomes.size).toBe(0)
  })

  test('load order does not depend on the order the disk lists folders in', async () => {
    const reader = memoryReader(forest())
    const reversed = { ...reader, listFolders: async (path: string) => (await reader.listFolders(path)).reverse() }
    const content = await loadContent(reversed, ROOT)
    expect([...content.modsters.keys()]).toEqual(['mossbeast', 'pinewraith', 'sproutling'])
  })

  test('with a sheet loader (user content, 0016), a Modster naming a PNG gets its sprite from the sheet loader', async () => {
    const asked: unknown[] = []
    const sheets: SheetLoader = async (sheet) => {
      asked.push(sheet)
      return { ok: true, value: sprite, issues: [] }
    }
    const content = await loadContent(memoryReader(pngForest()), ROOT, { label: '~/c/', sheets })
    expect(content.modsters.get('sproutling')?.sprite).toEqual(sprite)
    expect(asked).toEqual([{ path: `${ROOT}/modsters/sproutling/sprite.png`, file: '~/c/modsters/sproutling/sprite.png', modsterId: 'sproutling', frames: 2 }])
  })

  test('without a sheet loader (built-in content), a PNG sprite is an error', async () => {
    const content = await loadContent(memoryReader(pngForest()), ROOT)
    expect(content.modsters.has('sproutling')).toBe(false)
    expect(content.issues[0]?.field).toBe('sprite.file')
  })

  test('a missing, unreadable or undecodable sheet skips the Modster with the reason', async () => {
    const failure = { severity: 'error' as const, file: 'x', field: '', problem: 'is not a PNG' }
    const cases: [SheetLoader, string][] = [
      [async () => undefined, 'modsters/sproutling/sprite.png is missing'],
      [async () => Promise.reject(new Error('EACCES')), 'modsters/sproutling/sprite.png could not be read: EACCES'],
      [async () => ({ ok: false, issues: [failure] }), 'x is not a PNG'],
    ]
    for (const [sheets, first] of cases) {
      const content = await loadContent(memoryReader(pngForest()), ROOT, { sheets })
      expect(content.modsters.has('sproutling')).toBe(false)
      expect(lines(content.issues).slice(0, 2)).toEqual([
        first,
        'modsters/sproutling/modster.json: sprite.file points to a sprite that didn\'t load: modsters/sproutling/sprite.png',
      ])
    }
  })
})
