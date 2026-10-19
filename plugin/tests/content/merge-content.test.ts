import { describe, expect, test } from 'claude-code/testing'
import { formatIssue, mergeContent, type ContentRegistry, type LoadedCatcher, type Modster, type Sprite } from '../../hooks/content'
import { validSprite } from '../fixtures/valid-sprite'

const SETTINGS = '~/.claude/modster-hunter/content/settings.json'

/** A registry with the given biomes (id → Modster ids) and Modsters (id → name), already loaded. */
function registry(biomes: Record<string, string[]>, modsters: Record<string, string>, label = ''): ContentRegistry {
  return {
    biomes: new Map(
      Object.entries(biomes).map(([id, entries]) => [
        id,
        {
          biome: { schemaVersion: 1, id, name: id, modsters: entries.map((entry) => ({ id: entry })) },
          file: `${label}biomes/${id}/biome.json`,
        },
      ]),
    ),
    modsters: new Map(
      Object.entries(modsters).map(([id, name]) => {
        const modster: Modster = { schemaVersion: 1, id, name, rarity: 'common', sprite: { file: 'sprite.sprite.json' } }
        return [id, { modster, sprite: validSprite() as unknown as Sprite }]
      }),
    ),
    catchers: new Map(),
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

  test('a user Modster replacing a built-in keeps its dex number; its own dex fields win (decision 0017)', () => {
    const built = builtIn()
    const sproutling = built.modsters.get('sproutling')
    if (!sproutling) throw new Error('fixture')
    sproutling.modster.dex = { number: 1, types: ['grass'], entry: 'Built-in.' }
    const user = registry({}, { sproutling: 'Sprout II', blobby: 'Blobby' }, '~/')
    const userSprout = user.modsters.get('sproutling')
    if (!userSprout) throw new Error('fixture')
    userSprout.modster.dex = { types: ['fairy'] }
    const content = mergeContent({ builtIn: built, user, settingsFile: SETTINGS })
    expect(content.modsters.get('sproutling')?.modster.dex).toEqual({ number: 1, types: ['fairy'] })
    expect(content.modsters.get('blobby')?.modster.dex).toBe(undefined)
    // The user's own object isn't changed
    expect(userSprout.modster.dex).toEqual({ types: ['fairy'] })
    expect(names(content)).toEqual(['Sprout II', 'Mossbeast', 'Crablet', 'Blobby'])
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
    // forest is disabled; shore's only Modster is disabled, which drops its entry quietly (0032 point 6)
    expect(content.biomes.size).toBe(0)
    expect(content.issues.map(formatIssue)).toEqual(['biomes/shore/biome.json: modsters has no Modsters left that exist'])
  })

  test('a biome entry naming a disabled Modster is dropped without an issue (decision 0032)', () => {
    const settings = { schemaVersion: 1 as const, disabledModsters: ['mossbeast'] }
    const content = mergeContent({ builtIn: builtIn(), user: registry({}, {}), settings, settingsFile: SETTINGS })
    expect(content.biomes.get('forest')?.biome.modsters.map((entry) => entry.id)).toEqual(['sproutling'])
    expect(content.issues).toEqual([])
  })

  test('disabled items are kept aside in off, without the Modsters that are off', () => {
    const settings = { schemaVersion: 1 as const, disabledBiomes: ['forest'], disabledModsters: ['mossbeast'] }
    const content = mergeContent({ builtIn: builtIn(), user: registry({}, {}), settings, settingsFile: SETTINGS })
    expect([...content.off.biomes.keys()]).toEqual(['forest'])
    expect([...content.off.modsters.keys()]).toEqual(['mossbeast'])
    expect(content.off.biomes.get('forest')?.biome.modsters.map((entry) => entry.id)).toEqual(['sproutling'])
    expect(content.modsters.has('mossbeast')).toBe(false)
  })

  test('userIds names what loaded from the user folder, overrides included, on or off', () => {
    const user = registry({ meadow: ['blobby'] }, { sproutling: 'Sprout II', blobby: 'Blobby' }, '~/')
    const settings = { schemaVersion: 1 as const, disabledModsters: ['blobby'] }
    const content = mergeContent({ builtIn: builtIn(), user, settings, settingsFile: SETTINGS })
    expect([...content.userIds.modsters].sort()).toEqual(['blobby', 'sproutling'])
    expect([...content.userIds.biomes]).toEqual(['meadow'])
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

  test('catchers merge by id, the user one winning, and are never turned off (decision 0035)', () => {
    const catcher = (id: string, name: string): [string, LoadedCatcher] => [
      id,
      { catcher: { schemaVersion: 1, id, name, style: 'contain', sprite: { file: 'sprite.sprite.json' } }, sprite: validSprite() as unknown as Sprite },
    ]
    const settings = { schemaVersion: 1 as const, disabledModsters: ['jar'] }
    const content = mergeContent({
      builtIn: { ...builtIn(), catchers: new Map([catcher('jar', 'Glass jar'), catcher('net', 'Net')]) },
      user: { ...registry({}, {}), catchers: new Map([catcher('jar', 'My jar'), catcher('bubble', 'Bubble')]) },
      settings,
      settingsFile: SETTINGS,
    })
    expect([...content.catchers.values()].map((loaded) => loaded.catcher.name)).toEqual(['My jar', 'Net', 'Bubble'])
    expect([...content.userIds.catchers]).toEqual(['jar', 'bubble'])
  })
})
