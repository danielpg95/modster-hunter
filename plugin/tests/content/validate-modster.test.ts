import { describe, expect, test } from 'claude-code/testing'
import { MODSTER_TYPES } from '../../hooks/constants'
import { validateModster } from '../../hooks/content'
import { issuesAt } from '../fixtures/issues-at'
import { validModster } from '../fixtures/valid-modster'

const where = { file: 'modsters/sproutling/modster.json', folder: 'sproutling' }

type Modster = Record<string, unknown>
const sprite = (modster: Modster): Record<string, unknown> => modster.sprite as Record<string, unknown>
const dex = (modster: Modster): Record<string, unknown> => modster.dex as Record<string, unknown>

// [behavior, change to a valid Modster, field that must get an error]
const INVALID: [string, (modster: Modster) => void, string][] = [
  ['a missing schemaVersion is an error', (m) => delete m.schemaVersion, 'schemaVersion'],
  ['a schemaVersion other than 1 is an error', (m) => (m.schemaVersion = '1'), 'schemaVersion'],
  ['a missing id is an error', (m) => delete m.id, 'id'],
  ['an id with an underscore is an error', (m) => (m.id = 'sprout_ling'), 'id'],
  ['an id that differs from the folder is an error', (m) => (m.id = 'mossbeast'), 'id'],
  ['a missing name is an error', (m) => delete m.name, 'name'],
  ['an empty name is an error', (m) => (m.name = ''), 'name'],
  ['a name over 24 characters is an error', (m) => (m.name = 'n'.repeat(25)), 'name'],
  ['a description over 120 characters is an error', (m) => (m.description = 'd'.repeat(121)), 'description'],
  ['an unknown rarity is an error', (m) => (m.rarity = 'epic'), 'rarity'],
  ['a rarity with capitals is an error', (m) => (m.rarity = 'Rare'), 'rarity'],
  ['maxAttempts of 0 is an error', (m) => (m.maxAttempts = 0), 'maxAttempts'],
  ['maxAttempts over 10 is an error', (m) => (m.maxAttempts = 11), 'maxAttempts'],
  ['fractional maxAttempts is an error', (m) => (m.maxAttempts = 3.5), 'maxAttempts'],
  ['catchRate below 0.01 is an error', (m) => (m.catchRate = 0), 'catchRate'],
  ['catchRate above 1 is an error', (m) => (m.catchRate = 1.01), 'catchRate'],
  ['negative shinyChance is an error', (m) => (m.shinyChance = -0.1), 'shinyChance'],
  ['shinyChance above 1 is an error', (m) => (m.shinyChance = 2), 'shinyChance'],
  ['a missing sprite is an error', (m) => delete m.sprite, 'sprite'],
  ['a sprite that is not an object is an error', (m) => (m.sprite = 'sprite.sprite.json'), 'sprite'],
  ['a sprite without a file is an error', (m) => delete sprite(m).file, 'sprite.file'],
  ['a sprite file that is a PNG is an error', (m) => (sprite(m).file = 'sprite.png'), 'sprite.file'],
  ['a sprite file in another folder is an error', (m) => (sprite(m).file = 'other/sprite.sprite.json'), 'sprite.file'],
  ['fps of 0 is an error', (m) => (sprite(m).fps = 0), 'sprite.fps'],
  ['fps over 12 is an error', (m) => (sprite(m).fps = 13), 'sprite.fps'],
  ['an unknown top-level field is an error', (m) => (m.weight = 60), 'weight'],
  ['an unknown sprite field is an error', (m) => (sprite(m).loop = true), 'sprite.loop'],
  ['frames with a .sprite.json is an error', (m) => (sprite(m).frames = 4), 'sprite.frames'],
  ['a dex that is not an object is an error', (m) => (m.dex = 'grass'), 'dex'],
  ['an unknown dex field is an error', (m) => (dex(m).habitat = 'forest'), 'dex.habitat'],
  ['dex number 0 is an error', (m) => (dex(m).number = 0), 'dex.number'],
  ['dex number over 999 is an error', (m) => (dex(m).number = 1000), 'dex.number'],
  ['a fractional dex number is an error', (m) => (dex(m).number = 1.5), 'dex.number'],
  ['a dex type outside the list is an error', (m) => (dex(m).types = ['plant']), 'dex.types[0]'],
  ['a dex type with capitals is an error', (m) => (dex(m).types = ['Grass']), 'dex.types[0]'],
  ['an unknown second type is an error', (m) => (dex(m).types = ['grass', 'wood']), 'dex.types[1]'],
  ['a repeated type is an error', (m) => (dex(m).types = ['grass', 'grass']), 'dex.types[1]'],
  ['no types is an error', (m) => (dex(m).types = []), 'dex.types'],
  ['three types is an error (decision 0022)', (m) => (dex(m).types = ['grass', 'ghost', 'fire']), 'dex.types'],
  ['types that is not a list is an error', (m) => (dex(m).types = 'grass'), 'dex.types'],
  ['the old dex.type is an error that names types', (m) => (dex(m).type = 'grass'), 'dex.type'],
  ['an empty dex category is an error', (m) => (dex(m).category = ''), 'dex.category'],
  ['a dex category over 24 characters is an error', (m) => (dex(m).category = 'c'.repeat(25)), 'dex.category'],
  ['a dex height below 0.01 m is an error', (m) => (dex(m).heightM = 0), 'dex.heightM'],
  ['a dex height over 100 m is an error', (m) => (dex(m).heightM = 101), 'dex.heightM'],
  ['a dex weight below 0.01 kg is an error', (m) => (dex(m).weightKg = 0.001), 'dex.weightKg'],
  ['a dex weight over 10,000 kg is an error', (m) => (dex(m).weightKg = 10_001), 'dex.weightKg'],
  ['an empty dex entry is an error', (m) => (dex(m).entry = ''), 'dex.entry'],
  ['a dex entry over 240 characters is an error', (m) => (dex(m).entry = 'e'.repeat(241)), 'dex.entry'],
]

describe('validateModster', () => {
  test('the CONTENT_FORMAT example is valid with no issues', () => {
    const result = validateModster(validModster(), where)
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  test('only the required fields are enough', () => {
    const modster = { schemaVersion: 1, id: 'sproutling', name: 'S', sprite: { file: 'sprite.sprite.json' } }
    expect(validateModster(modster, where).ok).toBe(true)
  })

  test('every rarity tier is accepted', () => {
    for (const rarity of ['common', 'uncommon', 'rare', 'legendary']) {
      const modster = validModster()
      modster.rarity = rarity
      expect(validateModster(modster, where).ok).toBe(true)
    }
  })

  test('the bounds themselves are valid', () => {
    const modster = validModster()
    Object.assign(modster, { name: 'n'.repeat(24), maxAttempts: 10, catchRate: 0.01, shinyChance: 0 })
    sprite(modster).fps = 12
    expect(validateModster(modster, where).issues).toEqual([])
    Object.assign(modster, { maxAttempts: 1, catchRate: 1, shinyChance: 1 })
    sprite(modster).fps = 1
    expect(validateModster(modster, where).issues).toEqual([])
  })

  test('every dex field is optional, and every type is accepted (decision 0017)', () => {
    const modster = validModster()
    modster.dex = {}
    expect(validateModster(modster, where).issues).toEqual([])
    for (const type of Object.keys(MODSTER_TYPES)) {
      modster.dex = { types: [type] }
      expect(validateModster(modster, where).issues).toEqual([])
    }
  })

  test('two different types are valid, the first one primary (decision 0022)', () => {
    const modster = validModster()
    dex(modster).types = ['grass', 'ghost']
    expect(validateModster(modster, where).issues).toEqual([])
  })

  test('the old dex.type says to use types', () => {
    const modster = validModster()
    dex(modster).type = 'grass'
    const found = issuesAt(validateModster(modster, where), 'dex.type')
    expect(found.map((issue) => issue.problem)).toEqual(['is now "types", a list of one or two: "types": ["grass"] (decision 0022)'])
  })

  test('the dex bounds themselves are valid', () => {
    const modster = validModster()
    modster.dex = { number: 1, category: 'c', heightM: 0.01, weightKg: 0.01, entry: 'e' }
    expect(validateModster(modster, where).issues).toEqual([])
    modster.dex = { number: 999, category: 'c'.repeat(24), heightM: 100, weightKg: 10_000, entry: 'e'.repeat(240) }
    expect(validateModster(modster, where).issues).toEqual([])
  })

  test('a dex number in user content is an error; the rest of the dex is fine there', () => {
    const modster = validModster()
    const result = validateModster(modster, { ...where, userContent: true })
    expect(result.ok).toBe(false)
    expect(issuesAt(result, 'dex.number').length).toBe(1)
    delete dex(modster).number
    expect(validateModster(modster, { ...where, userContent: true }).issues).toEqual([])
  })

  for (const [behavior, change, field] of INVALID) {
    test(behavior, () => {
      const modster = validModster()
      change(modster)
      const result = validateModster(modster, where)
      expect(result.ok).toBe(false)
      const found = issuesAt(result, field)
      expect(found.length).toBe(1)
      expect(found[0]?.severity).toBe('error')
    })
  }

  test('user content may name a PNG sheet with its frame count (decision 0016)', () => {
    const modster = validModster()
    delete modster.dex
    modster.sprite = { file: 'sprite.png', frames: 4, fps: 6 }
    const result = validateModster(modster, { ...where, userContent: true })
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  // [behavior, the sprite object in user content, field that must get an error]
  const INVALID_USER_SPRITES: [string, Record<string, unknown>, string][] = [
    ['a PNG sheet without frames is an error', { file: 'sprite.png' }, 'sprite.frames'],
    ['a PNG sheet with 0 frames is an error', { file: 'sprite.png', frames: 0 }, 'sprite.frames'],
    ['a PNG sheet with 9 frames is an error', { file: 'sprite.png', frames: 9 }, 'sprite.frames'],
    ['a PNG sheet with fractional frames is an error', { file: 'sprite.png', frames: 2.5 }, 'sprite.frames'],
    ['frames with a .sprite.json in user content is an error', { file: 'sprite.sprite.json', frames: 2 }, 'sprite.frames'],
    ['a GIF in user content is an error', { file: 'sprite.gif', frames: 2 }, 'sprite.file'],
    ['a PNG in another folder is an error', { file: 'art/sprite.png', frames: 2 }, 'sprite.file'],
  ]
  for (const [behavior, spriteValue, field] of INVALID_USER_SPRITES) {
    test(behavior, () => {
      const modster = validModster()
      modster.sprite = spriteValue
      const result = validateModster(modster, { ...where, userContent: true })
      expect(result.ok).toBe(false)
      expect(issuesAt(result, field).length).toBe(1)
    })
  }

  test('input that is not an object is one error, never a throw', () => {
    for (const input of [null, 'sproutling', 7, []]) {
      const result = validateModster(input, where)
      expect(result.ok).toBe(false)
      expect(result.issues.length).toBe(1)
    }
  })

  test('odd values in every field are reported, never thrown', () => {
    for (const value of [{}, [], 'x', -1, Number.POSITIVE_INFINITY, false]) {
      const modster: Modster = { schemaVersion: value, id: value, name: value, description: value, rarity: value }
      Object.assign(modster, { maxAttempts: value, catchRate: value, shinyChance: value, sprite: { file: value, fps: value } })
      modster.dex = { number: value, types: value, category: value, heightM: value, weightKg: value, entry: value }
      expect(validateModster(modster, where).ok).toBe(false)
    }
  })
})
