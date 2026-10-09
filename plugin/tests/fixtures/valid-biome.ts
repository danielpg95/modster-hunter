/** A fresh biome.json that passes validation, from the CONTENT_FORMAT.md example. */
export function validBiome(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: 'whispering-forest',
    name: 'Whispering Forest',
    description: 'Tall pines, soft moss, something rustling.',
    accentColor: '#4caf50',
    background: 'background.sprite.json',
    encounterEverySec: [8, 20],
    modsters: [
      { id: 'sproutling', weight: 60 },
      { id: 'mossbeast', weight: 15 },
      { id: 'pinewraith', weight: 4, maxAttempts: 5 },
    ],
  }
}
