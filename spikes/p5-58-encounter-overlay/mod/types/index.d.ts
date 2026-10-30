/** What reached the mod, newest first */
export type Log = string[]

/** The test encounter: none yet, up since `at`, or leaving since `at` (clock ms) */
export type Encounter = { phase: 'idle' | 'up' | 'leaving'; at: number }

declare module 'claude-code' {
  interface PluginState {
    'modster-overlay-spike': {
      log: Log
      band: boolean
      outline: boolean
      encounter: Encounter
      redraws: number
      tries: number
    }
  }
}
