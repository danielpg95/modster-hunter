import { IDLE_TAG } from '../constants'

// The desktop's idle tag (decision 0047): the biome's name on a translucent
// backing at the bottom-left of the scene, with a dot that pulses while
// Claude works. It shows when the biome comes into view and fades; the mod
// times that with redraws, since an image restarts its animation on each.

export interface IdleTag {
  name: string
  /** `#rrggbb`: the biome's accent colour */
  color: string
  /** Claude is working: the dot pulses */
  pulse: boolean
  /** The last moments: it fades out over `IDLE_TAG.fadeMs` */
  fading: boolean
}

/** The tag's size in CSS pixels. */
export function idleTagSize(tag: IdleTag): { width: number; height: number } {
  const { padX, height, dotR, gap, charPx } = IDLE_TAG
  return { width: Math.ceil(padX * 2 + dotR * 2 + gap + [...tag.name].length * charPx), height }
}

/** The tag as SVG content in CSS pixels, its top left at (0, 0). */
export function idleTagMarkup(tag: IdleTag): string {
  const { padX, height, dotR, gap, fontPx } = IDLE_TAG
  const { width } = idleTagSize(tag)
  const mid = height / 2
  const dot = tag.pulse
    ? `<circle cx="${padX + dotR}" cy="${mid}" r="${dotR}" fill="${tag.color}"><animate attributeName="opacity" values="1;0.3;1" dur="${IDLE_TAG.pulseMs / 1000}s" repeatCount="indefinite"/></circle>`
    : `<circle cx="${padX + dotR}" cy="${mid}" r="${dotR}" fill="${tag.color}" opacity="0.45"/>`
  const text = `<text x="${padX + dotR * 2 + gap}" y="${mid}" dominant-baseline="central" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${fontPx}" font-weight="600" fill="${tag.color}">${escape(tag.name)}</text>`
  const fade = tag.fading ? `<animate attributeName="opacity" from="1" to="0" dur="${IDLE_TAG.fadeMs / 1000}s" fill="freeze"/>` : ''
  return `<g>${fade}<rect width="${width}" height="${height}" rx="${height / 2}" fill="#000" fill-opacity="${IDLE_TAG.backingOpacity}"/>${dot}${text}</g>`
}

/** The tag alone, for a biome with no scene (0047 point 3). */
export function idleTagSvg(tag: IdleTag): string {
  const { width, height } = idleTagSize(tag)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${idleTagMarkup(tag)}</svg>`
}

const escape = (text: string): string => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
