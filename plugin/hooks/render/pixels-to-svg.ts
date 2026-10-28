import type { Frame } from './pixels-to-cells'

const ALPHA_CUTOFF = 128

export interface SvgOptions {
  /** CSS pixels per sprite pixel */
  scale: number
  /** Frames per second; ignored with one frame */
  fps: number
}

// Hex colour of the pixel at (x, y), or undefined when transparent
function pixelHex(frame: Frame, x: number, y: number): string | undefined {
  const i = (y * frame.width + x) * 4
  const [r = 0, g = 0, b = 0, a = 0] = [frame.rgba[i], frame.rgba[i + 1], frame.rgba[i + 2], frame.rgba[i + 3]]
  if (a < ALPHA_CUTOFF) return undefined
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

// One frame as one path per colour: each run of a colour along a row is a 1-px-tall box.
// Paths keep big, busy sprites well under the Svg source limit (131072 characters)
export function framePaths(frame: Frame): string {
  const runs = new Map<string, string>()
  for (let y = 0; y < frame.height; y++) {
    let x = 0
    while (x < frame.width) {
      const color = pixelHex(frame, x, y)
      let end = x + 1
      while (end < frame.width && pixelHex(frame, end, y) === color) end++
      if (color) runs.set(color, `${runs.get(color) ?? ''}M${x} ${y}h${end - x}v1h-${end - x}z`)
      x = end
    }
  }
  return [...runs].map(([color, d]) => `<path fill="${color}" d="${d}"/>`).join('')
}

/**
 * Draws sprite frames as one SVG document for the remote surfaces' `Svg` (P5-06).
 * With several frames, SMIL shows one at a time in a loop, so the surface animates it
 * with no repaint from the mod; that needs `isInteractive` on the `Svg`.
 */
export function pixelsToSvg(frames: readonly Frame[], { scale, fps }: SvgOptions): string {
  const first = frames[0]
  if (!first) throw new Error('pixelsToSvg needs at least one frame')
  const { width, height } = first
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`
  return `${head}${loopedFrames(frames, fps)}</svg>`
}

/** The frames as SVG content: one frame's paths, or a group per frame that SMIL shows in turn, looping at `fps`. */
export function loopedFrames(frames: readonly Frame[], fps: number): string {
  const first = frames[0]
  if (!first) return ''
  if (frames.length === 1) return framePaths(first)
  const n = frames.length
  const keyTimes = frames.map((_, i) => +(i / n).toFixed(4)).join(';')
  const groups = frames.map((frame, i) => {
    const values = frames.map((_, j) => (j === i ? 'visible' : 'hidden')).join(';')
    const animate = `<animate attributeName="visibility" values="${values}" keyTimes="${keyTimes}" calcMode="discrete" dur="${+(n / fps).toFixed(3)}s" repeatCount="indefinite"/>`
    return `<g visibility="${i === 0 ? 'visible' : 'hidden'}">${animate}${framePaths(frame)}</g>`
  })
  return groups.join('')
}
