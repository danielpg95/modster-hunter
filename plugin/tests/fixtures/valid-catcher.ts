/** A fresh catcher.json that passes validation, from the CONTENT_FORMAT.md example (its sprite: `validSprite`, 2 frames, 3 colors). */
export function validCatcher(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: 'firefly-jar',
    name: 'Firefly Jar',
    description: 'Glows with whatever it holds.',
    style: 'contain',
    sprite: { file: 'sprite.sprite.json' },
    beats: {
      take: { frames: [1] },
      rock: { frames: [1, 0] },
    },
    glowIndex: 2,
    lidRows: 4,
  }
}
