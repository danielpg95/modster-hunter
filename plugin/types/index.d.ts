// Modster Hunter's $.state contract: session values that must survive a hot
// reload of the mod's code, which a /config change causes (decision 0023), and
// so every Settings tab change, /modsters hunt and stop (decisions 0038, 0040).
// /clear, /resume and /branch reset $.state; module variables carry those.

declare module 'claude-code' {
  interface PluginState {
    'modster-hunter': {
      /** The collection pane's shown tab, so a reload doesn't send the pane back to Collection */
      paneTab: 'collection' | 'biomes' | 'stats' | 'catchers' | 'settings'
      /** The Settings tab's selected row (a SettingField) */
      settingsSelected: string
      /** The session's biome (decision 0006), so a reload doesn't pick a new one */
      biomeId: string
    }
  }
}
