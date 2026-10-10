import { resultText, type BandEncounter } from './band-view'
import type { DisplaySettings } from './display-settings'

// What each place draws for the current encounter (decision 0023). The band and
// the pane hold the buttons; the spinner and status line only read the same
// encounter, so a Throw still counts once (0015 point 3).

export interface DisplayPlan {
  /** How the band draws, unless the encounter pane shows the encounter (0015 point 2) */
  band: 'full' | 'one-row'
  /** The spinner's message while a turn runs; undefined leaves the engine's own */
  spinner: string | undefined
  /** The status line; undefined clears it */
  status: string | undefined
}

export interface DisplayState {
  encounter?: BandEncounter
  turnRunning: boolean
}

export function displayPlan(settings: DisplaySettings, state: DisplayState): DisplayPlan {
  const encounter = state.encounter
  return {
    band: settings.showInBand ? 'full' : 'one-row',
    spinner: settings.showInSpinner && state.turnRunning && encounter ? spinnerText(encounter) : undefined,
    // Only while an encounter is up: nothing stays pinned between them (0023 point 6)
    status: settings.showInStatusLine && encounter ? statusText(encounter, settings.encounterPane !== 'off') : undefined,
  }
}

function spinnerText(e: BandEncounter): string {
  return e.phase === 'result' ? resultText(e) : `A wild ${e.name} appeared!`
}

function statusText(e: BandEncounter, hasPane: boolean): string {
  const who = `${e.name} (${e.tier})`
  switch (e.phase) {
    case 'appearing':
      return `A wild ${who} appeared!`
    case 'waiting':
      return `${who} · ${e.attemptsLeft} left · 1: Throw in the band${hasPane ? ' or pane' : ''}`
    case 'throwing':
      return `${who} · wobble…`
    case 'result':
      return resultText(e)
  }
}
