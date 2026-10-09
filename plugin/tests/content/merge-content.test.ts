import { describe, expect, test } from 'claude-code/testing'
import { formatIssue, mergeContent, type ContentRegistry, type Modster, type Sprite } from '../../hooks/content'
import { validSprite } from '../fixtures/valid-sprite'

const SETTINGS = '~/.claude/modster-hunter/content/settings.json'

/** A registry with the given biomes (id → Modster ids) and Modsters (id → name), already loaded. */
function registry(biomes: Record<string, string[]>, modsters: Record<string, string>, label = ''): ContentRegistry {
  return {
    biomes: new Map(
      Object.entries(biomes).map(([id, entries]) => [
        id,
        {
          biome: { schemaVersion: 1, id, name: id, modsters: entries.map((entry) => ({ id: entry, weight: 1 })) },
          file: `${label}biomes/${id}/biome.json`,
        },
      ]),
    ),
    modsters: new Map(
      Object.entries(modsters).map(([id, name]) => {
        const modster: Modster = { schemaVersion: 1, id, name, sprite: { file: 'sprite.sprite.json' } }
        return [id, { modster, sprite: validSprite() as unknown as Sprite }]
      }),
    ),
    issues: [],
  }
}

const builtIn = (): ContentRegistry =>
  registry({ forest: ['sproutling', 'mossbeast'], shore: ['crablet'] }, { sproutling: 'Sproutling', mossbeast: 'Mossbeast', crablet: 'Crablet' })
const names = (content: ContentRegistry): string[] => [...content.modsters.values()].map((loaded) => loaded.modster.name)

describe('mergeContent', () => {
  test('with an empty user folder, the built-ins load as they are', () => {
    const content = mergeContent({ builtIn: builtIn(), user: registry({}, {}), settingsFile: SETTINGS })
    expect([...content.biomes.keys()]).toEqual(['forest', 'shore'])
    expect(names(content)).toEqual(['Sproutling', 'Mossbeast', 'Crablet'])
    expect(content.issues).toEqual([])
  })

  test('user content with a built-in id replaces it whole; new ids are added', () => {
    const user = registry({ forest: ['sproutling'], meadow: ['blobby'] }, { sproutling: 'Sprout II', blobby: 'Blobby' }, '~/')
    const content = mergeContent({ builtIn: builtIn(), user, settingsFile: SETTINGS })
    expect(names(content)).toEqual(['Sprout II', 'Mossbeast', 'Crablet', 'Blobby'])
    // No field-level merge: the user's forest has only its own entry (0007 point 3)
    expect(content.biomes.get('forest')?.biome.modsters.map((entry) => entry.id)).toEqual(['sproutling'])
    expect([...content.biomes.keys()]).toEqual(['forest', 'shore', 'meadow'])
  })

  test('a user biome may list built-in Modsters', () => {
    const user = registry({ meadow: ['blobby', 'crablet'] }, { blobby: 'Blobby' })
    const content = mergeContent({ builtIn: builtIn(), user, settingsFile: SETTINGS })
    expect(content.biomes.get('meadow')?.biome.modsters.map((entry) => entry.id)).toEqual(['blobby', 'crablet'])
    expect(content.issues).toEqual([])
  })

  test('without built-ins, only user content loads, and its references to built-ins are dropped', () => {
    const user = registry({ meadow: ['blobby', 'crablet'] }, { blobby: 'Blobby' }, '~/')
    const content = mergeContent({ user, settingsFile: SETTINGS })
    expect([...content.biomes.keys()]).toEqual(['meadow'])
    expect(names(content)).toEqual(['Blobby'])
    expect(content.issues.map(formatIssue)).toEqual([
      '~/biomes/meadow/biome.json: modsters[1].id names a Modster that doesn\'t exist: "crablet"',
    ])
  })

  test('disabled biomes and Modsters are removed; biomes left empty go too', () => {
    const settings = { schemaVersion: 1 as const, disabledBiomes: ['forest'], disabledModsters: ['crablet'] }
    const content = mergeContent({ builtIn: builtIn(), user: registry({}, {}), settings, settingsFile: SETTINGS })
    expect(names(content)).toEqual(['Sproutling', 'Mossbeast'])
    // forest is disabled; shore's only Modster is disabled
    expect(content.biomes.size).toBe(0)
    expect(content.issues.map(formatIssue)).toEqual([
      'biomes/shore/biome.json: modsters[0].id names a Modster that doesn\'t exist: "crablet"',
      'biomes/shore/biome.json: modsters has no Modsters left that exist',
    ])
  })

  test('disabling an id that is not loaded is a warning', () => {
    const settings = { schemaVersion: 1 as const, disabledBiomes: ['volcano'] }
    const content = mergeContent({ builtIn: builtIn(), user: registry({}, {}), settings, settingsFile: SETTINGS })
    expect(content.biomes.size).toBe(2)
    expect(content.issues.map(formatIssue)).toEqual([`${SETTINGS}: disabledBiomes[0] names a biome that isn't loaded: "volcano" (warning)`])
  })

  test('issues from both sources are kept, built-in first', () => {
    const issue = (file: string) => ({ severity: 'error' as const, file, field: '', problem: 'is missing' })
    const content = mergeContent({
      builtIn: { ...builtIn(), issues: [issue('a.json')] },
      user: { ...registry({}, {}), issues: [issue('b.json')] },
      settingsFile: SETTINGS,
    })
    expect(content.issues.map((found) => found.file)).toEqual(['a.json', 'b.json'])
  })
})
