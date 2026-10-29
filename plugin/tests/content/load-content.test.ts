import { describe, expect, test } from 'claude-code/testing'
import { formatIssue, loadContent, type SheetLoader, type Sprite } from '../../hooks/content'
import { memoryReader } from '../fixtures/memory-reader'
import { desktopPng } from '../fixtures/desktop-png'
import { encodeFrame } from '../fixtures/encode-frame'
import { validBiome } from '../fixtures/valid-biome'
import { validCatcher } from '../fixtures/valid-catcher'
import { validUserModster } from '../fixtures/valid-user-modster'
import { validSprite } from '../fixtures/valid-sprite'

const ROOT = '/plugin/content'

/** The files of a content folder with one biome and the three Modsters it lists, all valid. */
function forest(): Record<string, string | Error> {
  const files: Record<string, string | Error> = {}
  const biome = validBiome()
  delete biome.background
  files[`${ROOT}/biomes/whispering-forest/biome.json`] = JSON.stringify(biome)
  for (const id of ['sproutling', 'mossbeast', 'pinewraith']) {
    files[`${ROOT}/modsters/${id}/modster.json`] = JSON.stringify({ ...validUserModster(), id, name: id })
    files[`${ROOT}/modsters/${id}/sprite.sprite.json`] = JSON.stringify(validSprite())
  }
  return files
}

/** The forest, with sproutling's sprite a 2-frame PNG sheet */
function pngForest(): Record<string, string | Error> {
  const files = forest()
  files[`${ROOT}/modsters/sproutling/modster.json`] = JSON.stringify({ ...validUserModster(), sprite: { file: 'sprite.png', frames: 2 } })
  return files
}
const sprite = validSprite() as unknown as Sprite

const lines = (issues: Parameters<typeof formatIssue>[0][]): string[] => issues.map(formatIssue)

describe('loadContent', () => {
  test('a valid folder loads every biome and Modster with no issues', async () => {
    const content = await loadContent(memoryReader(forest()), ROOT)
    expect([...content.biomes.keys()]).toEqual(['whispering-forest'])
    expect([...content.modsters.keys()]).toEqual(['mossbeast', 'pinewraith', 'sproutling'])
    expect(content.modsters.get('sproutling')?.sprite?.width).toBe(8)
    expect(content.issues).toEqual([])
  })

  test('an empty or missing content folder loads nothing, without issues', async () => {
    const content = await loadContent(memoryReader({}), ROOT)
    expect([content.biomes.size, content.modsters.size, content.issues.length]).toEqual([0, 0, 0])
  })

  test('a Modster with an invalid file is skipped and listed; the rest load', async () => {
    const files = forest()
    files[`${ROOT}/modsters/mossbeast/modster.json`] = JSON.stringify({ ...validUserModster(), id: 'mossbeast', name: '' })
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

  test('a background may have up to 4 frames (decision 0026)', async () => {
    const files = forest()
    files[`${ROOT}/biomes/whispering-forest/biome.json`] = JSON.stringify(validBiome())
    files[`${ROOT}/biomes/whispering-forest/background.sprite.json`] = JSON.stringify(validSprite()) // 2 frames
    const content = await loadContent(memoryReader(files), ROOT)
    expect(content.biomes.get('whispering-forest')?.background?.frames.length).toBe(2)
    expect(content.issues).toEqual([])
  })

  test('a bad background is listed and the biome loads without it', async () => {
    const files = forest()
    files[`${ROOT}/biomes/whispering-forest/biome.json`] = JSON.stringify(validBiome())
    const frame = (validSprite().frames as string[])[0]
    files[`${ROOT}/biomes/whispering-forest/background.sprite.json`] = JSON.stringify({ ...validSprite(), frames: Array(5).fill(frame) })
    const content = await loadContent(memoryReader(files), ROOT)
    const loaded = content.biomes.get('whispering-forest')
    expect(loaded?.background).toBeUndefined()
    expect(loaded?.biome.background).toBeUndefined()
    expect(lines(content.issues)).toEqual([
      'biomes/whispering-forest/background.sprite.json: frames must have 1–4 frames (it has 5)',
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
    expect(asked).toEqual([{ path: `${ROOT}/modsters/sproutling/sprite.png`, file: '~/c/modsters/sproutling/sprite.png', cacheKey: 'sproutling', frames: 2 }])
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

  /** The forest plus one catcher, `firefly-jar`, with `validSprite` as its art. */
  function withCatcher(change: (catcher: Record<string, unknown>) => void = () => {}): Record<string, string | Error> {
    const catcher = validCatcher()
    change(catcher)
    return {
      ...forest(),
      [`${ROOT}/catchers/firefly-jar/catcher.json`]: JSON.stringify(catcher),
      [`${ROOT}/catchers/firefly-jar/sprite.sprite.json`]: JSON.stringify(validSprite()),
    }
  }

  test('a valid catcher loads with its sprite, next to the biomes and Modsters (decision 0035)', async () => {
    const content = await loadContent(memoryReader(withCatcher()), ROOT)
    expect([...content.catchers.keys()]).toEqual(['firefly-jar'])
    expect(content.catchers.get('firefly-jar')?.sprite?.frames.length).toBe(2)
    expect(content.modsters.size).toBe(3)
    expect(content.issues).toEqual([])
  })

  test('an invalid catcher is skipped and listed; the rest load', async () => {
    const content = await loadContent(memoryReader(withCatcher((catcher) => (catcher.style = 'bubble'))), ROOT)
    expect(content.catchers.size).toBe(0)
    expect(content.biomes.size).toBe(1)
    expect(lines(content.issues)).toEqual([
      'catchers/firefly-jar/catcher.json: style must be one of contain, cover, custom (it is "bubble")',
    ])
  })

  test('a catcher whose beats name a frame its sprite lacks is skipped with the reason', async () => {
    const content = await loadContent(memoryReader(withCatcher((catcher) => (catcher.beats = { rock: { frames: [0, 5] } }))), ROOT)
    expect(content.catchers.size).toBe(0)
    expect(lines(content.issues)).toEqual(['catchers/firefly-jar/catcher.json: beats.rock.frames[1] is frame 5, but the sprite has 2 (0–1)'])
  })

  test('a catcher whose sprite is missing is skipped too', async () => {
    const files = withCatcher()
    delete files[`${ROOT}/catchers/firefly-jar/sprite.sprite.json`]
    const content = await loadContent(memoryReader(files), ROOT)
    expect(content.catchers.size).toBe(0)
    expect(lines(content.issues)).toEqual([
      'catchers/firefly-jar/sprite.sprite.json is missing',
      "catchers/firefly-jar/catcher.json: sprite.file points to a sprite that didn't load: catchers/firefly-jar/sprite.sprite.json",
    ])
  })

  test("a catcher's sprite may have up to 16 frames, more than a Modster's 8", async () => {
    const pixels = new Array(64).fill(1)
    const art = (count: number) => JSON.stringify({ ...validSprite(), shinyPalette: undefined, frames: Array.from({ length: count }, () => encodeFrame(pixels)) })
    const files = withCatcher()
    files[`${ROOT}/catchers/firefly-jar/sprite.sprite.json`] = art(16)
    expect((await loadContent(memoryReader(files), ROOT)).catchers.size).toBe(1)
    files[`${ROOT}/catchers/firefly-jar/sprite.sprite.json`] = art(17)
    const content = await loadContent(memoryReader(files), ROOT)
    expect(content.catchers.size).toBe(0)
    expect(lines(content.issues)[0]).toBe('catchers/firefly-jar/sprite.sprite.json: frames must have 1–16 frames (it has 17)')
  })

  test('a user catcher naming a PNG asks the sheet loader with its own cache key and 16 frames', async () => {
    const asked: unknown[] = []
    const sheets: SheetLoader = async (sheet) => {
      asked.push(sheet)
      return { ok: true, value: sprite, issues: [] }
    }
    const files = withCatcher((catcher) => (catcher.sprite = { file: 'sprite.png', frames: 2 }))
    const content = await loadContent(memoryReader(files), ROOT, { label: '~/c/', sheets })
    expect(content.catchers.has('firefly-jar')).toBe(true)
    expect(asked).toEqual([
      { path: `${ROOT}/catchers/firefly-jar/sprite.png`, file: '~/c/catchers/firefly-jar/sprite.png', cacheKey: 'firefly-jar.catcher', frames: 2, maxFrames: 16 },
    ])
  })

  describe('desktop art (decision 0045)', () => {
    /** The forest with sproutling's `desktopSprite` and the files given */
    function withDesktop(png?: Uint8Array | Error, frames = 2): Record<string, string | Uint8Array | Error> {
      const files: Record<string, string | Uint8Array | Error> = forest()
      files[`${ROOT}/modsters/sproutling/modster.json`] = JSON.stringify({ ...validUserModster(), desktopSprite: { file: 'desktop.png', frames } })
      if (png) files[`${ROOT}/modsters/sproutling/desktop.png`] = png
      return files
    }

    test('a Modster with a valid desktop sheet loads it beside its terminal sprite', async () => {
      const content = await loadContent(memoryReader(withDesktop(desktopPng(24, 20, 2))), ROOT)
      expect(content.issues).toEqual([])
      const loaded = content.modsters.get('sproutling')
      expect([loaded?.sprite?.width, loaded?.desktop?.width, loaded?.desktop?.height, loaded?.desktop?.frames]).toEqual([8, 24, 20, 2])
    })

    test('a missing, unreadable or invalid desktop sheet is listed, and the Modster loads with its terminal sprite (point 8)', async () => {
      const cases: [Uint8Array | Error | undefined, string][] = [
        [undefined, 'points to modsters/sproutling/desktop.png, which is missing'],
        [new Error('file is over 4 MiB'), 'points to modsters/sproutling/desktop.png, which could not be read: file is over 4 MiB'],
        [desktopPng(130, 8, 2), 'points to 130×8 frames; at most 128×128'],
      ]
      for (const [png, problem] of cases) {
        const content = await loadContent(memoryReader(withDesktop(png)), ROOT)
        expect(lines(content.issues)).toEqual([`modsters/sproutling/modster.json: desktopSprite.file ${problem}`])
        expect(content.modsters.get('sproutling')?.sprite?.width).toBe(8)
        expect(content.modsters.get('sproutling')?.desktop).toBe(undefined)
      }
    })

    test('a Modster with desktop art only loads with no terminal sprite; if its sheet fails it is skipped (0045 points 2 and 8)', async () => {
      const files = withDesktop(desktopPng(24, 20, 2))
      const { sprite: _terminal, ...modster } = validUserModster()
      files[`${ROOT}/modsters/sproutling/modster.json`] = JSON.stringify({ ...modster, desktopSprite: { file: 'desktop.png', frames: 2 } })
      const loaded = await loadContent(memoryReader(files), ROOT)
      expect(loaded.issues).toEqual([])
      expect([loaded.modsters.get('sproutling')?.sprite, loaded.modsters.get('sproutling')?.desktop?.width]).toEqual([undefined, 24])

      delete files[`${ROOT}/modsters/sproutling/desktop.png`]
      const skipped = await loadContent(memoryReader(files), ROOT)
      expect(skipped.modsters.has('sproutling')).toBe(false)
      expect(lines(skipped.issues)[0]).toBe('modsters/sproutling/modster.json: desktopSprite.file points to modsters/sproutling/desktop.png, which is missing')
    })

    test('a catcher with desktop art only loads with no terminal sprite', async () => {
      const files: Record<string, string | Uint8Array | Error> = withCatcher((catcher) => {
        delete catcher.sprite
        catcher.desktopSprite = { file: 'desktop.png', frames: 2 }
      })
      files[`${ROOT}/catchers/firefly-jar/desktop.png`] = desktopPng(24, 24, 2)
      const content = await loadContent(memoryReader(files), ROOT)
      expect(content.issues).toEqual([])
      expect([content.catchers.get('firefly-jar')?.sprite, content.catchers.get('firefly-jar')?.desktop?.frames]).toEqual([undefined, 2])
    })

    test('a biome loads its desktopBackground; a bad one is listed and the biome loads without it', async () => {
      const files: Record<string, string | Uint8Array | Error> = forest()
      const biome: Record<string, unknown> = { ...validBiome(), desktopBackground: { file: 'desktop.png', frames: 1 } }
      delete biome.background
      files[`${ROOT}/biomes/whispering-forest/biome.json`] = JSON.stringify(biome)
      files[`${ROOT}/biomes/whispering-forest/desktop.png`] = desktopPng(64, 40, 1)
      const loaded = await loadContent(memoryReader(files), ROOT)
      expect(loaded.issues).toEqual([])
      expect(loaded.biomes.get('whispering-forest')?.desktopBackground?.height).toBe(40)

      files[`${ROOT}/biomes/whispering-forest/desktop.png`] = desktopPng(64, 49, 1)
      const tooTall = await loadContent(memoryReader(files), ROOT)
      expect(lines(tooTall.issues)).toEqual(['biomes/whispering-forest/biome.json: desktopBackground.file points to 64×49 frames; at most 192×48'])
      expect(tooTall.biomes.get('whispering-forest')?.desktopBackground).toBe(undefined)
    })

    test('a biome loads its desktopParticles; a sheet over 16×16 is listed and left out (0046)', async () => {
      const files: Record<string, string | Uint8Array | Error> = forest()
      const biome: Record<string, unknown> = { ...validBiome(), desktopParticles: { file: 'particles.png', frames: 2 } }
      delete biome.background
      files[`${ROOT}/biomes/whispering-forest/biome.json`] = JSON.stringify(biome)
      files[`${ROOT}/biomes/whispering-forest/particles.png`] = desktopPng(8, 6, 2)
      expect((await loadContent(memoryReader(files), ROOT)).biomes.get('whispering-forest')?.desktopParticles?.width).toBe(8)
      files[`${ROOT}/biomes/whispering-forest/particles.png`] = desktopPng(20, 6, 2)
      const big = await loadContent(memoryReader(files), ROOT)
      expect(lines(big.issues)).toEqual(['biomes/whispering-forest/biome.json: desktopParticles.file points to 20×6 frames; at most 16×16'])
      expect(big.biomes.get('whispering-forest')?.desktopParticles).toBe(undefined)
    })

    test("a catcher loads its desktop sheet; one that doesn't fit the catcher is listed and the catcher keeps its terminal sprite", async () => {
      const files: Record<string, string | Uint8Array | Error> = withCatcher((catcher) => (catcher.desktopSprite = { file: 'desktop.png', frames: 2, glowColor: '#ff0000' }))
      files[`${ROOT}/catchers/firefly-jar/desktop.png`] = desktopPng(24, 24, 2)
      expect((await loadContent(memoryReader(files), ROOT)).catchers.get('firefly-jar')?.desktop?.colors).toEqual(['#ff0000'])

      files[`${ROOT}/catchers/firefly-jar/desktop.png`] = desktopPng(24, 24, 2, (x, y) => (x === 0 && y === 0 ? [0, 0, 255, 255] : undefined))
      const content = await loadContent(memoryReader(files), ROOT)
      expect(lines(content.issues)).toEqual(["catchers/firefly-jar/catcher.json: desktopSprite.glowColor is #ff0000, which isn't a colour in the desktop sheet"])
      expect(content.catchers.get('firefly-jar')?.sprite?.frames.length).toBe(2)
      expect(content.catchers.get('firefly-jar')?.desktop).toBe(undefined)
    })
  })

  test('catchersOnly loads the catchers and nothing else', async () => {
    const content = await loadContent(memoryReader(withCatcher()), ROOT, { catchersOnly: true })
    expect([content.biomes.size, content.modsters.size, content.catchers.size, content.issues.length]).toEqual([0, 0, 1, 0])
  })
})
