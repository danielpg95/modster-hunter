import { describe, expect, test } from 'claude-code/testing'
import { pickBiome } from '../../hooks/game'

const always = (value: number) => () => value

describe('pickBiome', () => {
  test('each biome gets an equal slice of the random range', () => {
    const ids = ['cave', 'forest', 'shore']
    expect([0, 0.33, 0.34, 0.66, 0.67, 0.999].map((r) => pickBiome(ids, always(r)))).toEqual([
      'cave', 'cave', 'forest', 'forest', 'shore', 'shore',
    ])
  })

  test('the order the biomes come in does not change the pick', () => {
    expect(pickBiome(['shore', 'cave', 'forest'], always(0))).toBe('cave')
  })

  test('one biome is always picked', () => {
    expect(pickBiome(['forest'], always(0.9))).toBe('forest')
  })

  test('no biomes picks nothing', () => {
    expect(pickBiome([], always(0.5))).toBeUndefined()
  })

  test('a source returning exactly 1 still picks the last biome', () => {
    expect(pickBiome(['cave', 'forest'], always(1))).toBe('forest')
  })
})
