import { SETTINGS } from '../constants'
import type { BandLine } from './band-view'

// The Settings tab's option rows (decision 0040): every `userConfig` field a
// player can change in the game, in a fixed order, with what `o` changes it to.

export type SettingField =
  | 'autoStart'
  | 'showInBand'
  | 'encounterPane'
  | 'showInSpinner'
  | 'showInStatusLine'
  | 'showIdleLine'
  | 'showIdleScene'
  | 'includeBuiltins'
  | 'encounterIdleTimeoutSec'

export type SettingValue = boolean | string | number

export type SettingValues = Readonly<Record<SettingField, SettingValue>>

interface SettingSpec {
  field: SettingField
  label: string
  /** One short line on what it does, shown under the row on desktop (0054); from the manifest's descriptions */
  help: string
  kind: 'toggle' | 'choice' | 'seconds'
  choices?: readonly string[]
}

/** The rows in 0040 point 2's order. */
export const SETTING_SPECS: readonly SettingSpec[] = [
  { field: 'autoStart', label: 'Auto start', help: 'Start hunting every session.', kind: 'toggle' },
  { field: 'showInBand', label: 'Show in the band', help: 'Draw the game above the prompt.', kind: 'toggle' },
  { field: 'encounterPane', label: 'Encounter pane', help: 'The bigger encounter pane: never, after /modsters pane, or every session.', kind: 'choice', choices: ['off', 'when-opened', 'always'] },
  { field: 'showInSpinner', label: 'Show in the spinner', help: 'Name the Modster in the spinner while Claude works.', kind: 'toggle' },
  { field: 'showInStatusLine', label: 'Show in the status line', help: 'Show the encounter in the status line.', kind: 'toggle' },
  { field: 'showIdleLine', label: 'Idle line', help: 'Show the biome between encounters.', kind: 'toggle' },
  { field: 'showIdleScene', label: 'Idle scene', help: 'Draw the biome as a moving scene between encounters.', kind: 'toggle' },
  { field: 'includeBuiltins', label: 'Built-in content', help: 'Load the biomes and Modsters that ship with the mod.', kind: 'toggle' },
  { field: 'encounterIdleTimeoutSec', label: 'Idle timeout', help: 'Seconds without a throw before a Modster wanders off.', kind: 'seconds' },
]

/** Each field's value when the option was never set: the manifest's defaults (0041 for `autoStart`). */
export const SETTING_DEFAULTS: SettingValues = {
  autoStart: true,
  showInBand: true,
  encounterPane: 'when-opened',
  showInSpinner: true,
  showInStatusLine: true,
  showIdleLine: true,
  showIdleScene: true,
  includeBuiltins: true,
  encounterIdleTimeoutSec: 90,
}

/** The values from a load's options: anything missing or of the wrong kind is the default. */
export function readSettingValues(options: Readonly<Record<string, unknown>>): SettingValues {
  const values = { ...SETTING_DEFAULTS } as Record<SettingField, SettingValue>
  for (const spec of SETTING_SPECS) {
    const raw = options[spec.field]
    if (spec.kind === 'toggle' && typeof raw === 'boolean') values[spec.field] = raw
    if (spec.kind === 'choice' && typeof raw === 'string' && spec.choices?.includes(raw)) values[spec.field] = raw
    if (spec.kind === 'seconds' && typeof raw === 'number' && Number.isFinite(raw)) values[spec.field] = raw
  }
  return values
}

/** What `o` turns `value` into (0040 point 3): a toggle flips, a choice moves on and wraps, the timeout steps through the presets. */
export function nextSettingValue(field: SettingField, value: SettingValue): SettingValue {
  const spec = specOf(field)
  if (spec.kind === 'toggle') return value !== true
  if (spec.kind === 'choice') {
    const choices = spec.choices ?? []
    const at = choices.indexOf(String(value))
    return choices[(at + 1) % choices.length] ?? choices[0] ?? value
  }
  // The next preset above the value, or the first one past the last
  const choices = SETTINGS.idleTimeoutChoicesSec
  return choices.find((seconds) => seconds > Number(value)) ?? choices[0]
}

/** A value as the row shows it: `on`, `off`, a choice as written, or seconds. */
export function settingText(field: SettingField, value: SettingValue): string {
  const spec = specOf(field)
  if (spec.kind === 'toggle') return value === true ? 'on' : 'off'
  if (spec.kind === 'seconds') return `${value} s`
  return String(value)
}

/** The options whose value isn't the default, in the tab's order: what Reset to defaults writes (0054). */
export function changedSettings(values: SettingValues): SettingField[] {
  return SETTING_SPECS.map((spec) => spec.field).filter((field) => values[field] !== SETTING_DEFAULTS[field])
}

/** `reset 3 settings to their defaults`, or `reset 1 setting to its default`. */
export function resetText(count: number): string {
  return count === 1 ? 'reset 1 setting to its default' : `reset ${count} settings to their defaults`
}

/** A value as the desktop's button shows it (0054): `On`, `Off`, `When opened`, `90 s`. */
export function settingButtonText(field: SettingField, value: SettingValue): string {
  const text = settingText(field, value).replace(/-/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** One row: the selection mark, the label padded so values line up, then the value. */
export function settingRow(field: SettingField, values: SettingValues, isSelected: boolean): BandLine {
  const spec = specOf(field)
  return [
    { text: isSelected ? '▸ ' : '  ', bold: true },
    { text: spec.label.padEnd(SETTINGS.labelColumns), ...(isSelected ? { bold: true } : {}) },
    { text: settingText(field, values[field]), ...(isSelected ? { bold: true } : { dim: true }) },
  ]
}

function specOf(field: SettingField): SettingSpec {
  const spec = SETTING_SPECS.find((candidate) => candidate.field === field)
  if (!spec) throw new Error(`unknown setting ${field}`)
  return spec
}
