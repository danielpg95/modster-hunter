import { describe, expect, test } from 'claude-code/testing'
import { chooseBiome } from '../../hooks/game'
import { scriptedRandom } from '../fixtures/scripted-random'

const ids = ['cave', 'forest', 'shore']

describe('chooseBiome (0058)', () => {
  test('random picks as 0006 says', () => {
    expect(chooseBiome('random', ids, scriptedRandom(0.5))).toEqual({ id: 'forest', isFallback: false })
  })

  test('a fixed biome that loads is played, without drawing a number', () => {
    const random = scriptedRandom()
    expect(chooseBiome('shore', ids, random)).toEqual({ id: 'shore', isFallback: false })
    expect(random.remaining()).toBe(0)
  })

  test('a fixed biome that is off, removed or unknown falls back to a random one', () => {
    expect(chooseBiome('marsh', ids, scriptedRandom(0))).toEqual({ id: 'cave', isFallback: true })
  })

  test('with no biomes there is nothing to play', () => {
    expect(chooseBiome('random', [], scriptedRandom())).toEqual({ id: undefined, isFallback: false })
    expect(chooseBiome('cave', [], scriptedRandom())).toEqual({ id: undefined, isFallback: true })
  })
})
