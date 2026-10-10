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
    dex: {
      number: 1,
      type: 'grass',
      category: 'Seed Modster',
      heightM: 0.3,
      weightKg: 1.2,
      entry: 'It sprouted from a seed that refused to stay buried.',
    },
    sprite: { file: 'sprite.sprite.json', fps: 6 },
  }
}
