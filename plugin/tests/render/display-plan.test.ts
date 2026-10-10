import { describe, expect, test } from 'claude-code/testing'
import { displayPlan, readDisplaySettings, type BandEncounter, type DisplaySettings } from '../../hooks/render'

const encounter = (overrides: Partial<BandEncounter> = {}): BandEncounter => ({
  phase: 'waiting',
  name: 'Sproutling',
  tier: 'common',
  attemptsLeft: 3,
  spriteWidth: 12,
  spriteHeight: 12,
  ...overrides,
})
const settings = (overrides: Partial<DisplaySettings> = {}): DisplaySettings => ({ ...readDisplaySettings({}), ...overrides })

describe('displayPlan', () => {
  test('the band draws as today when on, and in one row when off', () => {
    expect(displayPlan(settings(), { turnRunning: true }).band).toBe('full')
    expect(displayPlan(settings({ showInBand: false }), { turnRunning: true }).band).toBe('one-row')
  })

  test('between encounters, the spinner and status line are left alone', () => {
    expect(displayPlan(settings(), { turnRunning: true })).toEqual({ band: 'full', spinner: undefined, status: undefined })
  })

  test('the spinner names the Modster while a turn runs, then shows the result', () => {
    const plan = (e: Partial<BandEncounter>, turnRunning = true) => displayPlan(settings(), { encounter: encounter(e), turnRunning }).spinner
    expect(plan({ phase: 'appearing' })).toBe('A wild Sproutling appeared!')
    expect(plan({ phase: 'waiting' })).toBe('A wild Sproutling appeared!')
    expect(plan({ phase: 'throwing' })).toBe('A wild Sproutling appeared!')
    expect(plan({ phase: 'result', outcome: 'caught' })).toBe('Caught Sproutling!')
    // No turn, no spinner to rewrite
    expect(plan({ phase: 'waiting' }, false)).toBeUndefined()
  })

  test('the status line follows the encounter through every phase, turn or not', () => {
    const plan = (e: Partial<BandEncounter>) => displayPlan(settings(), { encounter: encounter(e), turnRunning: false }).status
    expect(plan({ phase: 'appearing' })).toBe('A wild Sproutling (common) appeared!')
    expect(plan({ phase: 'waiting', attemptsLeft: 2 })).toBe('Sproutling (common) · 2 left · 1: Throw in the band or pane')
    expect(plan({ phase: 'throwing' })).toBe('Sproutling (common) · wobble…')
    expect(plan({ phase: 'result', outcome: 'fled', fledBecause: 'idle' })).toBe('Sproutling wandered off.')
  })

  test('with the pane off, the status line points to the band only', () => {
    expect(displayPlan(settings({ encounterPane: 'off' }), { encounter: encounter(), turnRunning: true }).status).toBe(
      'Sproutling (common) · 3 left · 1: Throw in the band',
    )
  })

  test('the spinner and status line can each be turned off', () => {
    const plan = displayPlan(settings({ showInSpinner: false, showInStatusLine: false }), { encounter: encounter(), turnRunning: true })
    expect([plan.spinner, plan.status]).toEqual([undefined, undefined])
  })
})
