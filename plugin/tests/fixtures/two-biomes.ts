import { oneModsterForest } from './one-modster-forest'
import { validModster } from './valid-modster'
import { validSprite } from './valid-sprite'

/**
 * Content files (for stubContentFs) of oneModsterForest plus "Ash Dunes":
 * Sproutling and Emberkit (#002), both common, so 50% each.
 */
export function twoBiomes(): Record<string, string> {
  const modster = validModster()
  return {
    ...oneModsterForest(),
    'biomes/ash-dunes/biome.json': JSON.stringify({
      schemaVersion: 1,
      id: 'ash-dunes',
      name: 'Ash Dunes',
      encounterEverySec: [3, 3],
      modsters: [
        { id: 'sproutling' },
        { id: 'emberkit' },
      ],
    }),
    'modsters/emberkit/modster.json': JSON.stringify({
      ...modster,
      id: 'emberkit',
      name: 'Emberkit',
      dex: { ...(modster.dex as object), number: 2, types: ['fire'] },
    }),
    'modsters/emberkit/sprite.sprite.json': JSON.stringify(validSprite()),
  }
}
