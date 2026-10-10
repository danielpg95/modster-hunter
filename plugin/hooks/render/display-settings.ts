import { DISPLAY } from '../constants'

// Where the game shows (decision 0023): one toggle per place, plus a picker for
// the encounter pane. Values come from the plugin's `userConfig`.

export type EncounterPaneMode = (typeof DISPLAY.encounterPaneModes)[number]

export interface DisplaySettings {
  showInBand: boolean
  encounterPane: EncounterPaneMode
  showInSpinner: boolean
  showInStatusLine: boolean
}

/** Reads the display options; a missing or unexpected value falls back to its default. */
export function readDisplaySettings(options: Record<string, unknown>): DisplaySettings {
  const flag = (key: 'showInBand' | 'showInSpinner' | 'showInStatusLine'): boolean =>
    typeof options[key] === 'boolean' ? options[key] : DISPLAY.defaults[key]
  const pane = options.encounterPane
  return {
    showInBand: flag('showInBand'),
    encounterPane: isPaneMode(pane) ? pane : DISPLAY.defaults.encounterPane,
    showInSpinner: flag('showInSpinner'),
    showInStatusLine: flag('showInStatusLine'),
  }
}

function isPaneMode(value: unknown): value is EncounterPaneMode {
  return (DISPLAY.encounterPaneModes as readonly unknown[]).includes(value)
}
