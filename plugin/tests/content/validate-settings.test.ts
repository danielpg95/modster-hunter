import { describe, expect, test } from 'claude-code/testing'
import { validateSettings } from '../../hooks/content'
import { issuesAt } from '../fixtures/issues-at'

const where = { file: 'settings.json' }

// [behavior, settings value, field that must get an error]
const INVALID: [string, unknown, string][] = [
  ['a missing schemaVersion is an error', { disabledBiomes: [] }, 'schemaVersion'],
  ['a schemaVersion other than 1 is an error', { schemaVersion: 2 }, 'schemaVersion'],
  ['an unknown field is an error', { schemaVersion: 1, includeBuiltins: false }, 'includeBuiltins'],
  ['disabledBiomes that is not a list is an error', { schemaVersion: 1, disabledBiomes: 'volcano' }, 'disabledBiomes'],
  ['a disabled id that is not an id is an error', { schemaVersion: 1, disabledModsters: ['ok', 'Moss Beast'] }, 'disabledModsters[1]'],
]

describe('validateSettings', () => {
  test('the CONTENT_FORMAT example is valid with no issues', () => {
    const settings = { schemaVersion: 1, disabledBiomes: ['volcano'], disabledModsters: ['mossbeast'] }
    const result = validateSettings(settings, where)
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  test('only schemaVersion is enough', () => {
    expect(validateSettings({ schemaVersion: 1 }, where).ok).toBe(true)
  })

  for (const [behavior, input, field] of INVALID) {
    test(behavior, () => {
      const result = validateSettings(input, where)
      expect(result.ok).toBe(false)
      expect(issuesAt(result, field).length).toBe(1)
    })
  }

  test('input that is not an object is one error, never a throw', () => {
    for (const input of [null, 'x', 3, []]) {
      const result = validateSettings(input, where)
      expect(result.ok).toBe(false)
      expect(result.issues.length).toBe(1)
    }
  })
})
