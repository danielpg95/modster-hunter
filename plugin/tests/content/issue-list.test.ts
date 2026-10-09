import { describe, expect, test } from 'claude-code/testing'
import { formatIssue } from '../../hooks/content'

describe('formatIssue', () => {
  test('an error reads file, field and problem', () => {
    const line = formatIssue({ severity: 'error', file: 'biomes/f/biome.json', field: 'modsters[1].weight', problem: 'must be …' })
    expect(line).toBe('biomes/f/biome.json: modsters[1].weight must be …')
  })

  test('a whole-file problem has no field', () => {
    const line = formatIssue({ severity: 'error', file: 'biomes/f/biome.json', field: '', problem: 'must be a JSON object' })
    expect(line).toBe('biomes/f/biome.json must be a JSON object')
  })

  test('a warning is marked', () => {
    const line = formatIssue({ severity: 'warning', file: 'x.sprite.json', field: 'palette[0]', problem: 'should be fully transparent (alpha 00)' })
    expect(line).toBe('x.sprite.json: palette[0] should be fully transparent (alpha 00) (warning)')
  })
})
