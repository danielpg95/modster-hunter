import { describe, expect, test } from 'claude-code/testing'
import { validateBiome } from '../../hooks/content'
import { issuesAt } from '../fixtures/issues-at'
import { validBiome } from '../fixtures/valid-biome'

const where = { file: 'biomes/whispering-forest/biome.json', folder: 'whispering-forest' }

type Biome = Record<string, unknown>
const entries = (biome: Biome): Record<string, unknown>[] => biome.modsters as Record<string, unknown>[]
const setEntry = (biome: Biome, index: number, value: unknown): void => {
  (biome.modsters as unknown[])[index] = value
}

// [behavior, change to a valid biome, field that must get an error]
const INVALID: [string, (biome: Biome) => void, string][] = [
  ['a missing schemaVersion is an error', (b) => delete b.schemaVersion, 'schemaVersion'],
  ['a schemaVersion other than 1 is an error', (b) => (b.schemaVersion = 2), 'schemaVersion'],
  ['a missing id is an error', (b) => delete b.id, 'id'],
  ['an id with capitals is an error', (b) => (b.id = 'Whispering-Forest'), 'id'],
  ['an id starting with a digit is an error', (b) => (b.id = '1forest'), 'id'],
  ['a one-character id is an error', (b) => (b.id = 'w'), 'id'],
  ['an id over 32 characters is an error', (b) => (b.id = 'w'.repeat(33)), 'id'],
  ['an id that differs from the folder is an error', (b) => (b.id = 'other-forest'), 'id'],
  ['a missing name is an error', (b) => delete b.name, 'name'],
  ['an empty name is an error', (b) => (b.name = ''), 'name'],
  ['a name over 32 characters is an error', (b) => (b.name = 'n'.repeat(33)), 'name'],
  ['a name that is not text is an error', (b) => (b.name = 42), 'name'],
  ['a description over 120 characters is an error', (b) => (b.description = 'd'.repeat(121)), 'description'],
  ['an accentColor without # is an error', (b) => (b.accentColor = '4caf50'), 'accentColor'],
  ['an accentColor with alpha is an error', (b) => (b.accentColor = '#4caf50ff'), 'accentColor'],
  ['a background that is not a .sprite.json is an error', (b) => (b.background = 'background.png'), 'background'],
  ['a background in another folder is an error', (b) => (b.background = '../x/background.sprite.json'), 'background'],
  ['encounterEverySec that is not a pair is an error', (b) => (b.encounterEverySec = [8]), 'encounterEverySec'],
  ['encounterEverySec below 3 s is an error', (b) => (b.encounterEverySec = [2, 20]), 'encounterEverySec[0]'],
  ['encounterEverySec above 600 s is an error', (b) => (b.encounterEverySec = [8, 601]), 'encounterEverySec[1]'],
  ['encounterEverySec with min above max is an error', (b) => (b.encounterEverySec = [30, 10]), 'encounterEverySec'],
  ['missing modsters is an error', (b) => delete b.modsters, 'modsters'],
  ['an empty modsters list is an error', (b) => (b.modsters = []), 'modsters'],
  [
    'more than 50 modsters is an error',
    (b) => (b.modsters = Array.from({ length: 51 }, (_, i) => ({ id: `m${i}`, weight: 1 }))),
    'modsters',
  ],
  ['an entry that is not an object is an error', (b) => setEntry(b, 1, 'mossbeast'), 'modsters[1]'],
  ['an entry without an id is an error', (b) => delete entries(b)[1]!.id, 'modsters[1].id'],
  ['an entry with a bad id is an error', (b) => (entries(b)[1]!.id = 'Moss Beast'), 'modsters[1].id'],
  ['a repeated entry id is an error', (b) => (entries(b)[2]!.id = 'sproutling'), 'modsters[2].id'],
  ['an entry without a weight is an error', (b) => delete entries(b)[0]!.weight, 'modsters[0].weight'],
  ['a weight of 0 is an error', (b) => (entries(b)[0]!.weight = 0), 'modsters[0].weight'],
  ['a weight over 10,000 is an error', (b) => (entries(b)[0]!.weight = 10_001), 'modsters[0].weight'],
  ['a fractional weight is an error', (b) => (entries(b)[0]!.weight = 2.5), 'modsters[0].weight'],
  ['a weight given as text is an error', (b) => (entries(b)[0]!.weight = '60'), 'modsters[0].weight'],
  ['maxAttempts of 0 is an error', (b) => (entries(b)[0]!.maxAttempts = 0), 'modsters[0].maxAttempts'],
  ['maxAttempts over 10 is an error', (b) => (entries(b)[0]!.maxAttempts = 11), 'modsters[0].maxAttempts'],
  ['fractional maxAttempts is an error', (b) => (entries(b)[0]!.maxAttempts = 2.5), 'modsters[0].maxAttempts'],
  ['null maxAttempts in a biome entry is an error', (b) => (entries(b)[0]!.maxAttempts = null), 'modsters[0].maxAttempts'],
  ['catchRate below 0.01 is an error', (b) => (entries(b)[0]!.catchRate = 0.001), 'modsters[0].catchRate'],
  ['catchRate above 1 is an error', (b) => (entries(b)[0]!.catchRate = 1.5), 'modsters[0].catchRate'],
  ['an unknown top-level field is an error', (b) => (b.colour = '#ffffff'), 'colour'],
  ['an unknown entry field is an error', (b) => (entries(b)[0]!.wieght = 3), 'modsters[0].wieght'],
]

describe('validateBiome', () => {
  test('the CONTENT_FORMAT example is valid with no issues', () => {
    const result = validateBiome(validBiome(), where)
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  test('only the required fields are enough', () => {
    const biome = { schemaVersion: 1, id: 'whispering-forest', name: 'W', modsters: [{ id: 'sproutling', weight: 1 }] }
    expect(validateBiome(biome, where).ok).toBe(true)
  })

  test('the bounds themselves are valid', () => {
    const biome = validBiome()
    biome.encounterEverySec = [3, 600]
    biome.name = 'n'.repeat(32)
    biome.description = 'd'.repeat(120)
    entries(biome)[0] = { id: 'sproutling', weight: 10_000, maxAttempts: 10, catchRate: 0.01 }
    entries(biome)[1] = { id: 'mossbeast', weight: 1, maxAttempts: 1, catchRate: 1 }
    expect(validateBiome(biome, where).issues).toEqual([])
  })

  test('min and max of encounterEverySec may be equal', () => {
    const biome = validBiome()
    biome.encounterEverySec = [15, 15]
    expect(validateBiome(biome, where).ok).toBe(true)
  })

  test('name length counts characters, not UTF-16 units', () => {
    const biome = validBiome()
    biome.name = '🌲'.repeat(32)
    expect(validateBiome(biome, where).ok).toBe(true)
  })

  for (const [behavior, change, field] of INVALID) {
    test(behavior, () => {
      const biome = validBiome()
      change(biome)
      const result = validateBiome(biome, where)
      expect(result.ok).toBe(false)
      const found = issuesAt(result, field)
      expect(found.length).toBe(1)
      expect(found[0]?.severity).toBe('error')
      expect(found[0]?.file).toBe(where.file)
    })
  }

  test('every problem in a file is reported, not just the first', () => {
    const biome = validBiome()
    biome.name = ''
    biome.accentColor = 'green'
    entries(biome)[0]!.weight = -1
    const fields = validateBiome(biome, where).issues.map((issue) => issue.field)
    expect(fields).toEqual(['name', 'accentColor', 'modsters[0].weight'])
  })

  test('messages say what is expected and what was found', () => {
    const biome = validBiome()
    entries(biome)[0]!.weight = 0
    const [issue] = issuesAt(validateBiome(biome, where), 'modsters[0].weight')
    expect(issue?.problem).toBe('must be a whole number from 1 to 10000 (it is 0)')
  })

  test('input that is not an object is one error, never a throw', () => {
    for (const input of [null, undefined, 'biome', 42, [], true]) {
      const result = validateBiome(input, where)
      expect(result.ok).toBe(false)
      expect(result.issues).toEqual([{ severity: 'error', file: where.file, field: '', problem: 'must be a JSON object' }])
    }
  })

  test('odd values in every field are reported, never thrown', () => {
    const odd = [null, {}, [], 'x', -1, Number.NaN, true]
    for (const value of odd) {
      const biome: Biome = { schemaVersion: value, id: value, name: value, description: value, accentColor: value }
      Object.assign(biome, { background: value, encounterEverySec: value, modsters: [value, { id: value, weight: value }] })
      expect(validateBiome(biome, where).ok).toBe(false)
    }
  })
})
