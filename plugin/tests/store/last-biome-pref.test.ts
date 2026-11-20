import { describe, expect, test } from 'claude-code/testing'
import { lastBiomePref, readLastBiomeId } from '../../hooks/store'

describe('lastBiomePref (0060)', () => {
  test('reads back the id it wrote', () => {
    expect(readLastBiomeId(lastBiomePref('saltbreeze-bay'))).toBe('saltbreeze-bay')
  })

  test('nothing stored, or an unreadable value, is no last biome', () => {
    expect(readLastBiomeId(undefined)).toBeUndefined()
    expect(readLastBiomeId({ v: 2, id: 'cave' })).toBeUndefined()
    expect(readLastBiomeId({ v: 1, id: 3 })).toBeUndefined()
  })
})
