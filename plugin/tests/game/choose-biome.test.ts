import { describe, expect, test } from 'claude-code/testing'
import { chooseBiome } from '../../hooks/game'
import { scriptedRandom } from '../fixtures/scripted-random'

const ids = ['cave', 'forest', 'shore']

describe('chooseBiome (0060)', () => {
  test('with Keep last biome off, a session starts in a random biome', () => {
    expect(chooseBiome(false, 'shore', ids, scriptedRandom(0.5))).toBe('forest')
  })

  test('with Keep last biome on, it starts in the last biome, without drawing a number', () => {
    const random = scriptedRandom()
    expect(chooseBiome(true, 'shore', ids, random)).toBe('shore')
    expect(random.remaining()).toBe(0)
  })

  test('a last biome that is off or missing, or none stored, starts in a random one', () => {
    expect(chooseBiome(true, 'marsh', ids, scriptedRandom(0))).toBe('cave')
    expect(chooseBiome(true, undefined, ids, scriptedRandom(0.9))).toBe('shore')
  })

  test('with no biomes there is nothing to play', () => {
    expect(chooseBiome(true, 'cave', [], scriptedRandom())).toBeUndefined()
  })
})
