/** What reached the mod, newest first */
export type Log = string[]

declare module 'claude-code' {
  interface PluginState {
    'modster-overlay-spike': {
      log: Log
      band: boolean
      outline: boolean
    }
  }
}
