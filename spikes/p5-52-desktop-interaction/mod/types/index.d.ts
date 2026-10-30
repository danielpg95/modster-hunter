/** Presses that reached the mod, by test letter */
export type Hits = Record<string, number>

declare module 'claude-code' {
  interface PluginState {
    'modster-interaction-spike': {
      hits: Hits
      /** The dex grid's open Modster, or null for the grid */
      selected: string | null
      showAll: boolean
      band: boolean
    }
  }
}
