import { validModster } from './valid-modster'
import { validSprite } from './valid-sprite'

/**
 * Content files (for stubContentFs) of a forest whose only Modster appears
 * after exactly 3 s of work and is always caught, so band tests are exact.
 */
export function oneModsterForest(): Record<string, string> {
  const biome = {
    schemaVersion: 1,
    id: 'whispering-forest',
    name: 'Whispering Forest',
    accentColor: '#4caf50',
    encounterEverySec: [3, 3],
    modsters: [{ id: 'sproutling', weight: 1 }],
  }
  return {
    'biomes/whispering-forest/biome.json': JSON.stringify(biome),
    'modsters/sproutling/modster.json': JSON.stringify({ ...validModster(), catchRate: 1 }),
    'modsters/sproutling/sprite.sprite.json': JSON.stringify(validSprite()),
  }
}
