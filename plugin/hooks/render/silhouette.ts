// An uncaught Modster's dark silhouette (P3-02): the sprite's shape in one gray,
// transparency kept, so the shape shows but not the colors.

import { COLLECTION } from '../constants'
import type { Sprite } from '../content'

/** The sprite's palette with every color but transparent ones turned to the silhouette gray. */
export function silhouettePalette(sprite: Sprite, color: string = COLLECTION.silhouetteColor): string[] {
  return sprite.palette.map((entry) => {
    const alpha = entry.length > 7 ? entry.slice(7, 9) : 'ff'
    return `${color}${alpha}`
  })
}
