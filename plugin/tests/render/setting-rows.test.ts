import { describe, expect, test } from 'claude-code/testing'
import { SETTING_DEFAULTS, SETTING_SPECS, changedSettings, nextSettingValue, resetText, readSettingValues, settingButtonText, settingRow, settingText } from '../../hooks/render'

describe('setting rows (0040)', () => {
  test('lists the options in 0040 point 2\'s order', () => {
    expect(SETTING_SPECS.map((spec) => spec.label)).toEqual([
      'Auto start',
      'Show in the band',
      'Encounter pane',
      'Show in the spinner',
      'Show in the status line',
      'Idle line',
      'Idle scene',
      'Built-in content',
      'Idle timeout',
    ])
  })

  test('reads a load\'s options, falling back to the defaults for anything missing or wrong', () => {
    expect(readSettingValues({})).toEqual(SETTING_DEFAULTS)
    expect(SETTING_DEFAULTS.autoStart).toBe(true)
    const values = readSettingValues({ autoStart: false, encounterPane: 'always', encounterIdleTimeoutSec: 45, showInBand: 'no', includeBuiltins: 1 })
    expect(values).toMatchObject({ autoStart: false, encounterPane: 'always', encounterIdleTimeoutSec: 45, showInBand: true, includeBuiltins: true })
    expect(readSettingValues({ encounterPane: 'sometimes' }).encounterPane).toBe('when-opened')
  })

  test('o flips a toggle', () => {
    expect(nextSettingValue('autoStart', true)).toBe(false)
    expect(nextSettingValue('showIdleScene', false)).toBe(true)
  })

  test('o moves the encounter pane through its choices, wrapping', () => {
    expect(nextSettingValue('encounterPane', 'off')).toBe('when-opened')
    expect(nextSettingValue('encounterPane', 'when-opened')).toBe('always')
    expect(nextSettingValue('encounterPane', 'always')).toBe('off')
  })

  test('o steps the idle timeout through the presets, from a value between them too, and wraps', () => {
    expect(nextSettingValue('encounterIdleTimeoutSec', 30)).toBe(60)
    expect(nextSettingValue('encounterIdleTimeoutSec', 90)).toBe(180)
    expect(nextSettingValue('encounterIdleTimeoutSec', 45)).toBe(60)
    expect(nextSettingValue('encounterIdleTimeoutSec', 5)).toBe(30)
    expect(nextSettingValue('encounterIdleTimeoutSec', 300)).toBe(30)
    expect(nextSettingValue('encounterIdleTimeoutSec', 1000)).toBe(30)
  })

  test('values show as on/off, the choice, or seconds', () => {
    expect(settingText('autoStart', true)).toBe('on')
    expect(settingText('showInBand', false)).toBe('off')
    expect(settingText('encounterPane', 'when-opened')).toBe('when-opened')
    expect(settingText('encounterIdleTimeoutSec', 90)).toBe('90 s')
  })

  test('a row marks the selection and lines the values up', () => {
    const selected = settingRow('autoStart', SETTING_DEFAULTS, true)
    const other = settingRow('encounterIdleTimeoutSec', SETTING_DEFAULTS, false)
    expect(selected.map((segment) => ('text' in segment ? segment.text : '')).join('')).toBe('▸ Auto start              on')
    expect(other.map((segment) => ('text' in segment ? segment.text : '')).join('')).toBe('  Idle timeout            90 s')
  })
  test('on desktop a value reads as a button label, and every option says what it does (0054)', () => {
    expect([settingButtonText('autoStart', true), settingButtonText('showInBand', false)]).toEqual(['On', 'Off'])
    expect(settingButtonText('encounterPane', 'when-opened')).toBe('When opened')
    expect(settingButtonText('encounterIdleTimeoutSec', 90)).toBe('90 s')
    expect(SETTING_SPECS.every((spec) => spec.help.length > 0 && spec.help.endsWith('.'))).toBe(true)
  })
  test('a reset writes the options that differ from their defaults, in the tab\'s order (0054)', () => {
    expect(changedSettings(SETTING_DEFAULTS)).toEqual([])
    expect(changedSettings({ ...SETTING_DEFAULTS, encounterIdleTimeoutSec: 30, showInBand: false })).toEqual(['showInBand', 'encounterIdleTimeoutSec'])
    expect([resetText(1), resetText(3)]).toEqual(['reset 1 setting to its default', 'reset 3 settings to their defaults'])
  })
})
