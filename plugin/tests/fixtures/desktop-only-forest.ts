import { base64FromBytes } from './base64-from-bytes'
import { desktopPng } from './desktop-png'
import { validModster } from './valid-modster'

/**
 * Content files (for stubContentFs) of a forest drawn only for the Desktop app
 * (decision 0045): its one Modster has a `desktopSprite` and no terminal
 * sprite, and the biome has a `desktopBackground` and no terminal background.
 * As `oneModsterForest`, the Modster appears after exactly 3 s and is always caught.
 */
export function desktopOnlyForest(): Record<string, string> {
  const biome = {
    schemaVersion: 1,
    id: 'whispering-forest',
    name: 'Whispering Forest',
    accentColor: '#4caf50',
    encounterEverySec: [3, 3],
    desktopBackground: { file: 'desktop.png', frames: 1 },
    modsters: [{ id: 'sproutling' }],
  }
  const { sprite: _terminal, ...modster } = validModster()
  return {
    'biomes/whispering-forest/biome.json': JSON.stringify(biome),
    'biomes/whispering-forest/desktop.png': base64FromBytes(desktopPng(64, 40, 1)),
    'modsters/sproutling/modster.json': JSON.stringify({ ...modster, catchRate: 1, desktopSprite: { file: 'desktop.png', frames: 2 } }),
    'modsters/sproutling/desktop.png': base64FromBytes(desktopPng(32, 32, 2)),
  }
}
