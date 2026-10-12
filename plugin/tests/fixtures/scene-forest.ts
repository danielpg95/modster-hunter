import { encodeFrame } from './encode-frame'
import { oneModsterForest } from './one-modster-forest'

/** The one-Modster forest with an idle scene (decision 0026): an 8×8, 2-frame background (4 rows) and sand. */
export function sceneForest(): Record<string, string> {
  const files = oneModsterForest()
  const biome = JSON.parse(files['biomes/whispering-forest/biome.json']!) as Record<string, unknown>
  files['biomes/whispering-forest/biome.json'] = JSON.stringify({
    ...biome,
    background: 'background.sprite.json',
    backgroundFps: 2,
    particles: { style: 'sand', density: 1 },
  })
  const pixels = Array.from({ length: 64 }, (_, i) => (i < 32 ? 0 : 1 + (i % 2)))
  files['biomes/whispering-forest/background.sprite.json'] = JSON.stringify({
    schemaVersion: 1,
    width: 8,
    height: 8,
    palette: ['#00000000', '#8d6e63ff', '#a1887fff'],
    frames: [encodeFrame(pixels), encodeFrame([...pixels].reverse())],
  })
  return files
}
