import { describe, expect, test } from 'claude-code/testing'
import { toggleDisabled, validateSettings, type ToggleChange } from '../../hooks/content'

const FILE = '~/.claude/modster-hunter/content/settings.json'

/** The planned file, parsed; fails the test when nothing may be written. */
function planned(current: string | undefined, change: ToggleChange): unknown {
  const plan = toggleDisabled(current, change, FILE)
  if (!plan.ok) throw new Error(plan.problem)
  return JSON.parse(plan.text)
}

describe('toggleDisabled', () => {
  test('with no settings file, turning a Modster off creates one', () => {
    expect(planned(undefined, { kind: 'modster', id: 'mossbeast', off: true })).toEqual({ schemaVersion: 1, disabledModsters: ['mossbeast'] })
  })

  test('turning a biome off adds it after the ones already off, keeping the Modsters list', () => {
    const current = JSON.stringify({ schemaVersion: 1, disabledBiomes: ['volcano'], disabledModsters: ['mossbeast'] })
    expect(planned(current, { kind: 'biome', id: 'shore', off: true })).toEqual({
      schemaVersion: 1,
      disabledBiomes: ['volcano', 'shore'],
      disabledModsters: ['mossbeast'],
    })
  })

  test('turning an id off twice lists it once', () => {
    const current = JSON.stringify({ schemaVersion: 1, disabledModsters: ['mossbeast'] })
    expect(planned(current, { kind: 'modster', id: 'mossbeast', off: true })).toEqual({ schemaVersion: 1, disabledModsters: ['mossbeast'] })
  })

  test('turning the last id back on removes the empty list', () => {
    const current = JSON.stringify({ schemaVersion: 1, disabledBiomes: ['volcano'], disabledModsters: ['mossbeast'] })
    expect(planned(current, { kind: 'modster', id: 'mossbeast', off: false })).toEqual({ schemaVersion: 1, disabledBiomes: ['volcano'] })
  })

  test('turning on an id that is not off changes nothing', () => {
    expect(planned(undefined, { kind: 'biome', id: 'volcano', off: false })).toEqual({ schemaVersion: 1 })
  })

  test('the written text is valid settings, keys in the documented order, ending in a newline', () => {
    const current = JSON.stringify({ disabledModsters: ['mossbeast'], schemaVersion: 1 })
    const plan = toggleDisabled(current, { kind: 'biome', id: 'shore', off: true }, FILE)
    if (!plan.ok) throw new Error(plan.problem)
    expect(plan.text.endsWith('}\n')).toBe(true)
    expect(Object.keys(JSON.parse(plan.text) as object)).toEqual(['schemaVersion', 'disabledBiomes', 'disabledModsters'])
    expect(validateSettings(JSON.parse(plan.text), { file: FILE }).ok).toBe(true)
  })

  test('a settings file that is not valid JSON is never overwritten', () => {
    const plan = toggleDisabled('{ not json', { kind: 'modster', id: 'mossbeast', off: true }, FILE)
    expect(plan).toEqual({ ok: false, problem: `fix ${FILE} first (see /modsters → 4: Settings)` })
  })

  test('a settings file that fails validation is never overwritten', () => {
    const current = JSON.stringify({ schemaVersion: 1, disabledModsters: 'mossbeast' })
    expect(toggleDisabled(current, { kind: 'biome', id: 'shore', off: true }, FILE).ok).toBe(false)
  })

  test('an id the settings would reject is refused, not written', () => {
    expect(toggleDisabled(undefined, { kind: 'modster', id: 'Moss Beast', off: true }, FILE).ok).toBe(false)
  })
})
