import { describe, expect, test } from 'claude-code/testing'
import { readDisplaySettings } from '../../hooks/render'

describe('readDisplaySettings', () => {
  test('with no options set, the band, spinner and status line are on and the pane opens when opened (0023)', () => {
    expect(readDisplaySettings({})).toEqual({ showInBand: true, encounterPane: 'when-opened', showInSpinner: true, showInStatusLine: true })
  })

  test('reads every place turned off, and each pane mode', () => {
    for (const encounterPane of ['off', 'when-opened', 'always']) {
      expect(readDisplaySettings({ showInBand: false, showInSpinner: false, showInStatusLine: false, encounterPane })).toEqual({
        showInBand: false,
        encounterPane,
        showInSpinner: false,
        showInStatusLine: false,
      })
    }
  })

  test('a value of the wrong type or outside the picker falls back to its default', () => {
    expect(readDisplaySettings({ showInBand: 'no', showInSpinner: 0, showInStatusLine: null, encounterPane: 'sometimes' })).toEqual(
      readDisplaySettings({}),
    )
  })
})
