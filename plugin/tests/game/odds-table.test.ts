import { describe, expect, test } from 'claude-code/testing'
import { validateBiome, type Biome, type Modster } from '../../hooks/content'
import { formatOddsTable, oddsTable } from '../../hooks/game'
import { modsterNamed } from '../fixtures/modster-named'
import { validBiome } from '../fixtures/valid-biome'

function exampleBiome(): Biome {
  const result = validateBiome(validBiome(), { file: 'biome.json', folder: 'whispering-forest' })
  if (!result.ok) throw new Error('fixture biome must be valid')
  return result.value
}

const modsters = new Map<string, Modster>([
  ['sproutling', modsterNamed('sproutling', { name: 'Sproutling' })],
  ['mossbeast', modsterNamed('mossbeast', { name: 'Mossbeast' })],
  ['pinewraith', modsterNamed('pinewraith', { name: 'Pinewraith' })],
])

describe('oddsTable', () => {
  test('the chances of appearing add up to 100%', () => {
    const total = oddsTable(exampleBiome(), modsters).reduce((sum, row) => sum + row.encounterChance, 0)
    expect(Math.abs(total - 1)).toBeLessThan(1e-9)
  })

  test('rows keep the biome order and resolve each Modster', () => {
    const rows = oddsTable(exampleBiome(), modsters)
    expect(rows.map((row) => [row.id, row.tier, row.maxAttempts])).toEqual([
      ['sproutling', 'common', 3],
      ['mossbeast', 'uncommon', 3],
      // 4 of 79 is 5.1%: uncommon by weight; the biome entry gives it 5 throws
      ['pinewraith', 'uncommon', 5],
    ])
  })

  test('catch chance is the chance of at least one throw landing', () => {
    const [sproutling] = oddsTable(exampleBiome(), modsters)
    expect(sproutling?.catchChance).toBe(1 - 0.5 ** 3)
  })

  test('a Modster that does not exist is left out, and its weight with it', () => {
    const rows = oddsTable(exampleBiome(), new Map([...modsters].filter(([id]) => id !== 'mossbeast')))
    expect(rows.map((row) => row.id)).toEqual(['sproutling', 'pinewraith'])
    expect(rows[0]?.encounterChance).toBe(60 / 64)
  })

  test('the printed table for the CONTENT_FORMAT example biome', () => {
    expect(formatOddsTable(oddsTable(exampleBiome(), modsters))).toBe(
      [
        'Modster     Weight  Appears  Tier      Throws  Per throw  Caught',
        'Sproutling  60      75.9%    common    3       50.0%      87.5%',
        'Mossbeast   15      19.0%    uncommon  3       35.0%      72.5%',
        'Pinewraith  4       5.1%     uncommon  5       35.0%      88.4%',
      ].join('\n'),
    )
  })
})
