import { DESKTOP, SCENE } from '../constants'
import type { IdleScene, Particle } from './idle-scene'
import { particlePixel } from './idle-scene'
import { framePaths, loopedFrames } from './pixels-to-svg'

// A biome's idle scene as one vector SVG for the desktop's `Svg` (decision 0044).
// The background is a pattern tiled from the left; each particle is a 1-pixel
// square moved by SMIL with idle-scene's own motion: a drift that wraps (a second
// copy one strip behind it fills the gap), a sampled sway, a sparkle's twinkle.

export interface SceneSvgOptions {
  /** Strip width in sprite pixels */
  width: number
  /** CSS pixels per sprite pixel */
  scale: number
  /** False draws the still strip between turns: frame 0, particles at their start (0026 point 5) */
  moving: boolean
  /** Over this many characters there's no Svg (0044 point 7); defaults to DESKTOP.svgMaxChars */
  maxChars?: number
}

/**
 * How big the strip is drawn (0044 point 2): `bodyColumns × columnPx` CSS pixels across, at
 * `columnPx` per sprite pixel, smaller so that with `maxRows` the strip and one line fit in
 * `maxRows × rowPx`. Undefined when even 1 CSS pixel per sprite pixel doesn't fit.
 */
export function sceneSvgSize(scene: IdleScene, bodyColumns: number, maxRows?: number): { width: number; scale: number } | undefined {
  const height = scene.rows * 2
  const room = maxRows === undefined ? Infinity : (maxRows - 1) * DESKTOP.rowPx
  const scale = Math.min(DESKTOP.columnPx, Math.floor(room / height))
  if (scale < 1 || bodyColumns <= 0) return undefined
  return { width: Math.ceil((bodyColumns * DESKTOP.columnPx) / scale), scale }
}

/** The strip as SVG, or undefined when it comes out over `maxChars`. */
export function sceneSvg(scene: IdleScene, particles: readonly Particle[], { width, scale, moving, maxChars = DESKTOP.svgMaxChars }: SceneSvgOptions): string | undefined {
  const height = scene.rows * 2
  const defs: string[] = []
  let body = ''

  const art = scene.art
  if (art) {
    const frames = art.frames.map((rgba) => ({ width: art.width, height: art.height, rgba }))
    const first = frames[0]
    const tile = moving ? loopedFrames(frames, scene.artFps) : first ? framePaths(first) : ''
    defs.push(`<pattern id="bg" patternUnits="userSpaceOnUse" width="${art.width}" height="${art.height}">${tile}</pattern>`)
    body += `<rect width="${width}" height="${Math.min(art.height, height)}" fill="url(#bg)"/>`
  }

  const look = scene.particles
  if (look) {
    const color = `#${look.rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`
    body += particles.map((particle) => (moving ? movingParticle(particle, look.style, color, width, height) : stillParticle(particle, look.style, color, width, height))).join('')
  }

  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`
  const svg = `${head}${defs.length > 0 ? `<defs>${defs.join('')}</defs>` : ''}${body}</svg>`
  return svg.length > maxChars ? undefined : svg
}

type Style = NonNullable<IdleScene['particles']>['style']

/** Where the terminal draws it at tick 0; a sparkle that starts dark isn't drawn. */
function stillParticle(particle: Particle, style: Style, color: string, width: number, height: number): string {
  const at = particlePixel(particle, style, 0, width, height)
  return at ? `<rect fill="${color}" x="${at.x}" y="${at.y}" width="1" height="1"/>` : ''
}

function movingParticle(particle: Particle, style: Style, color: string, width: number, height: number): string {
  const motion = SCENE.motion[style]
  const tickS = 1 / SCENE.particleFps
  const sx = Math.sign(motion.dx)
  const sy = Math.sign(motion.dy)

  // The copies one strip behind, so a particle leaving an edge comes in at the other
  const offsets: [number, number][] = [[0, 0]]
  if (sx !== 0) offsets.push([-sx * width, 0])
  if (sy !== 0) for (const [x] of [...offsets]) offsets.push([x, -sy * height])
  let dot = offsets.map(([x, y]) => `<rect fill="${color}" x="${x}" y="${y}" width="1" height="1"/>`).join('')

  if (style === 'sparkle') {
    // On for `on` ticks out of every `period`, shifted by its phase (idle-scene's particlePixel)
    const { on, period } = SCENE.sparkleTicks
    const shift = Math.floor(particle.phase * period)
    const values = Array.from({ length: period }, (_, tick) => ((tick + shift) % period < on ? 'inline' : 'none'))
    const keyTimes = values.map((_, i) => +(i / period).toFixed(4))
    dot = `<g display="${values[0]}"><animate attributeName="display" values="${values.join(';')}" keyTimes="${keyTimes.join(';')}" calcMode="discrete" dur="${num(period * tickS)}s" repeatCount="indefinite"/>${dot}</g>`
  }
  if (motion.sway > 0) {
    // One period of sway × sin(tick / 4 + phase), sampled; the surface blends between samples
    const ticks = 8 * Math.PI
    const steps = DESKTOP.swaySamples
    const values = Array.from({ length: steps + 1 }, (_, i) => `${num(motion.sway * Math.sin((i / steps) * 2 * Math.PI + particle.phase * 2 * Math.PI))} 0`)
    dot = `<g>${loop('translate', values, ticks * tickS)}${dot}</g>`
  }
  if (sy !== 0) dot = `<g>${loop('translate', ['0 0', `0 ${sy * height}`], (height / Math.abs(motion.dy)) * tickS)}${dot}</g>`
  if (sx !== 0) dot = `<g>${loop('translate', ['0 0', `${sx * width} 0`], (width / Math.abs(motion.dx)) * tickS)}${dot}</g>`
  return `<g transform="translate(${num(particle.x * width)} ${num(particle.y * height)})">${dot}</g>`
}

/** A transform that runs through `values` evenly in `seconds`, over and over. */
function loop(type: string, values: string[], seconds: number): string {
  return `<animateTransform attributeName="transform" type="${type}" values="${values.join(';')}" dur="${num(seconds)}s" repeatCount="indefinite"/>`
}

const num = (n: number): string => String(+n.toFixed(3))
