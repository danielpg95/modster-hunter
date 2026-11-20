import { encodePng } from '../../hooks/vendor/png-encode'
import { base64FromBytes } from './base64-from-bytes'
import { rgbaSheet } from './rgba-sheet'
import { validModster } from './valid-modster'

/**
 * Content files (for stubContentFs) of one forest with `count` Modsters `big-01`…
 * drawn only for the desktop, each a two-frame 128×128 sheet whose frame 0 is
 * seeded noise in 64 colours, so each card's art is about 16k characters
 * even cut to frame 0 (0061), and a page of a dozen passes `cardSvgCharsMax`.
 */
export function desktopRoster(count: number): Record<string, string> {
  const files: Record<string, string> = {}
  const ids: string[] = []
  const { sprite: _terminal, ...modster } = validModster()
  for (let i = 1; i <= count; i++) {
    const id = `big-${String(i).padStart(2, '0')}`
    ids.push(id)
    let state = i * 2654435761 || 1
    const sheet = rgbaSheet(256, 128, (x) => {
      if (x >= 128) return undefined
      // xorshift32: noise deflate can't shrink below 6 bits a pixel
      state ^= state << 13
      state ^= state >>> 17
      state ^= state << 5
      const color = (state >>> 26) & 63
      return [color * 4, 255 - color * 4, (color * 37) & 0xff, 255]
    })
    files[`modsters/${id}/modster.json`] = JSON.stringify({
      ...modster,
      id,
      name: `Big ${String(i).padStart(2, '0')}`,
      dex: { ...(modster.dex as object), number: i },
      desktopSprite: { file: 'desktop.png', frames: 2 },
    })
    files[`modsters/${id}/desktop.png`] = base64FromBytes(encodePng(sheet))
  }
  files['biomes/whispering-forest/biome.json'] = JSON.stringify({
    schemaVersion: 1,
    id: 'whispering-forest',
    name: 'Whispering Forest',
    modsters: ids.map((id) => ({ id })),
  })
  return files
}
