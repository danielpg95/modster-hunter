import { describe, expect, test } from 'claude-code/testing'
import { formatIssue, loadAllContent, type SheetLoader } from '../../hooks/content'
import { memoryReader } from '../fixtures/memory-reader'
import { validModster } from '../fixtures/valid-modster'
import { validSprite } from '../fixtures/valid-sprite'

const BUILT_IN = '/plugin/content'
const USER = '/home/u/.claude/modster-hunter/content'
const LABEL = '~/.claude/modster-hunter/content/'

/** One biome listing one Modster, written under `root`. */
function biomeWith(root: string, biomeId: string, modsterId: string, name = modsterId): Record<string, string> {
  return {
    [`${root}/biomes/${biomeId}/biome.json`]: JSON.stringify({ schemaVersion: 1, id: biomeId, name: biomeId, modsters: [{ id: modsterId, weight: 1 }] }),
    [`${root}/modsters/${modsterId}/modster.json`]: JSON.stringify({ ...validModster(), id: modsterId, name }),
    [`${root}/modsters/${modsterId}/sprite.sprite.json`]: JSON.stringify(validSprite()),
  }
}

const noSheets: SheetLoader = async () => undefined
const user = { root: USER, label: LABEL, sheets: noSheets }

describe('loadAllContent', () => {
  test('built-in and user content load together', async () => {
    const files = { ...biomeWith(BUILT_IN, 'forest', 'sproutling'), ...biomeWith(USER, 'meadow', 'blobby') }
    const content = await loadAllContent({ reader: memoryReader(files), builtInRoot: BUILT_IN, includeBuiltins: true, user })
    expect([...content.biomes.keys()]).toEqual(['forest', 'meadow'])
    expect(content.issues).toEqual([])
  })

  test('a user Modster replaces the built-in one with its id', async () => {
    const files = { ...biomeWith(BUILT_IN, 'forest', 'sproutling'), ...biomeWith(USER, 'meadow', 'sproutling', 'My Sprout') }
    const content = await loadAllContent({ reader: memoryReader(files), builtInRoot: BUILT_IN, includeBuiltins: true, user })
    expect(content.modsters.get('sproutling')?.modster.name).toBe('My Sprout')
  })

  test('includeBuiltins off loads only the user folder', async () => {
    const files = { ...biomeWith(BUILT_IN, 'forest', 'sproutling'), ...biomeWith(USER, 'meadow', 'blobby') }
    const content = await loadAllContent({ reader: memoryReader(files), builtInRoot: BUILT_IN, includeBuiltins: false, user })
    expect([...content.biomes.keys()]).toEqual(['meadow'])
    expect([...content.modsters.keys()]).toEqual(['blobby'])
  })

  test('includeBuiltins off with no user content leaves zero biomes and no issues', async () => {
    const files = biomeWith(BUILT_IN, 'forest', 'sproutling')
    const content = await loadAllContent({ reader: memoryReader(files), builtInRoot: BUILT_IN, includeBuiltins: false, user })
    expect([content.biomes.size, content.issues.length]).toEqual([0, 0])
  })

  test('settings.json disables biomes and Modsters', async () => {
    const files = {
      ...biomeWith(BUILT_IN, 'forest', 'sproutling'),
      ...biomeWith(BUILT_IN, 'shore', 'crablet'),
      [`${USER}/settings.json`]: JSON.stringify({ schemaVersion: 1, disabledBiomes: ['shore'], disabledModsters: ['crablet'] }),
    }
    const content = await loadAllContent({ reader: memoryReader(files), builtInRoot: BUILT_IN, includeBuiltins: true, user })
    expect([...content.biomes.keys()]).toEqual(['forest'])
    expect([...content.modsters.keys()]).toEqual(['sproutling'])
    expect(content.issues).toEqual([])
  })

  test('an invalid settings.json is listed and disables nothing', async () => {
    const files = { ...biomeWith(BUILT_IN, 'forest', 'sproutling'), [`${USER}/settings.json`]: '{ "schemaVersion": 1, ' }
    const content = await loadAllContent({ reader: memoryReader(files), builtInRoot: BUILT_IN, includeBuiltins: true, user })
    expect(content.biomes.size).toBe(1)
    expect(content.issues[0]?.file).toBe(`${LABEL}settings.json`)
    expect(content.issues[0]?.problem.startsWith('is not valid JSON')).toBe(true)
  })

  test('user issues name the user folder', async () => {
    const files = { ...biomeWith(USER, 'meadow', 'blobby'), [`${USER}/modsters/blobby/modster.json`]: '[]' }
    const content = await loadAllContent({ reader: memoryReader(files), builtInRoot: BUILT_IN, includeBuiltins: true, user })
    expect(content.issues.map(formatIssue)[0]).toBe(`${LABEL}modsters/blobby/modster.json must be a JSON object`)
  })

  test('without a home folder, built-ins still load', async () => {
    const files = biomeWith(BUILT_IN, 'forest', 'sproutling')
    const content = await loadAllContent({ reader: memoryReader(files), builtInRoot: BUILT_IN, includeBuiltins: true })
    expect([...content.biomes.keys()]).toEqual(['forest'])
  })
})
