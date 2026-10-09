import { describe, expect, test } from 'claude-code/testing'
import { checkBiomeReferences, validateBiome, type Biome } from '../../hooks/content'
import { validBiome } from '../fixtures/valid-biome'

const file = 'biomes/whispering-forest/biome.json'

function biome(): Biome {
  const result = validateBiome(validBiome(), { file, folder: 'whispering-forest' })
  if (!result.ok) throw new Error('fixture biome must be valid')
  return result.value
}

describe('checkBiomeReferences', () => {
  test('a biome whose Modsters all exist is unchanged', () => {
    const result = checkBiomeReferences(biome(), new Set(['sproutling', 'mossbeast', 'pinewraith']), file)
    expect(result.ok).toBe(true)
    expect(result.ok && result.value.modsters.map((entry) => entry.id)).toEqual(['sproutling', 'mossbeast', 'pinewraith'])
    expect(result.issues).toEqual([])
  })

  test('a missing Modster drops only that entry, with an error', () => {
    const result = checkBiomeReferences(biome(), new Set(['sproutling', 'pinewraith']), file)
    expect(result.ok).toBe(true)
    expect(result.ok && result.value.modsters.map((entry) => entry.id)).toEqual(['sproutling', 'pinewraith'])
    expect(result.issues).toEqual([
      { severity: 'error', file, field: 'modsters[1].id', problem: 'names a Modster that doesn\'t exist: "mossbeast"' },
    ])
  })

  test('a biome with no existing Modsters is dropped', () => {
    const result = checkBiomeReferences(biome(), new Set(['someone-else']), file)
    expect(result.ok).toBe(false)
    expect(result.issues.map((issue) => issue.field)).toEqual(['modsters[0].id', 'modsters[1].id', 'modsters[2].id', 'modsters'])
  })

  test('the original biome is not changed', () => {
    const original = biome()
    checkBiomeReferences(original, new Set(['sproutling']), file)
    expect(original.modsters.length).toBe(3)
  })
})
