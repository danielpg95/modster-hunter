/** A fresh modster.json that passes validation, from the CONTENT_FORMAT.md example. */
export function validModster(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: 'sproutling',
    name: 'Sproutling',
    description: 'A seed that learned to walk. Very proud of it.',
    rarity: null,
    maxAttempts: null,
    catchRate: null,
    shinyChance: null,
    sprite: { file: 'sprite.sprite.json', fps: 6 },
  }
}
