import { DESKTOP, IDLE_TAG, SCENE } from '../constants'
import { idleTagMarkup, idleTagSize, type IdleTag } from './idle-tag'
import type { DesktopSheet } from '../content'
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
  /** Keeps the strip's size and crops it at the right when the box is narrower, instead of shrinking it */
  crop?: boolean
  /** The idle tag at the bottom-left, in CSS pixels whatever the strip's scale (0047) */
  tag?: IdleTag
}

/**
 * How big the strip is drawn (0044 point 2): `bodyColumns × columnPx` CSS pixels across, at
 * `columnPx` per sprite pixel, smaller so that with `maxRows` the strip and one line fit in
 * `maxRows × rowPx`. Undefined when even 1 CSS pixel per sprite pixel doesn't fit.
 */
export function sceneSvgSize(scene: IdleScene, bodyColumns: number, maxRows?: number, lineRows = 1): { width: number; scale: number } | undefined {
  const height = scene.rows * 2
  const room = maxRows === undefined ? Infinity : (maxRows - lineRows) * DESKTOP.rowPx
  const scale = Math.min(DESKTOP.columnPx, Math.floor(room / height))
  if (scale < 1 || bodyColumns <= 0) return undefined
  return { width: Math.ceil((bodyColumns * DESKTOP.columnPx) / scale), scale }
}

/** The strip as SVG, or undefined when it comes out over `maxChars`. */
export function sceneSvg(scene: IdleScene, particles: readonly Particle[], { width, scale, moving, maxChars = DESKTOP.svgMaxChars, crop, tag }: SceneSvgOptions): string | undefined {
  const height = scene.rows * 2
  const defs: string[] = []
  let body = ''

  const sheet = scene.sheet
  if (sheet) {
    // A desktop background (0045 point 9): the sheet embedded once, a quarter of its pixels per
    // strip pixel, frames stepped by SMIL; an embedded image makes this an image-mode Svg
    const q = DESKTOP.sheetPixels
    const tw = sheet.width / q
    const th = sheet.height / q
    const step =
      moving && sheet.frames > 1
        ? `<animate attributeName="x" values="${Array.from({ length: sheet.frames }, (_, i) => -i * sheet.width).join(';')}" keyTimes="${Array.from({ length: sheet.frames }, (_, i) => +(i / sheet.frames).toFixed(4)).join(';')}" calcMode="discrete" dur="${num(sheet.frames / scene.artFps)}s" repeatCount="indefinite"/>`
        : ''
    const image = `<image href="data:image/png;base64,${sheet.png}" width="${sheet.width * sheet.frames}" height="${sheet.height}" image-rendering="pixelated" style="image-rendering:pixelated">${step}</image>`
    defs.push(`<pattern id="bg" patternUnits="userSpaceOnUse" width="${num(tw)}" height="${num(th)}"><svg width="${num(tw)}" height="${num(th)}" viewBox="0 0 ${sheet.width} ${sheet.height}">${image}</svg></pattern>`)
    body += `<rect width="${width}" height="${num(Math.min(th, height))}" fill="url(#bg)"/>`
  }

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
    // A biome's own particle art (0046), embedded once; else squares in the particle colour (0044 point 4)
    const art = scene.particleSheet
    if (art) defs.push(`<image id="pt" href="data:image/png;base64,${art.png}" width="${art.width * art.frames}" height="${art.height}" image-rendering="pixelated" style="image-rendering:pixelated"/>`)
    const mark = (particle: Particle) => (x: number, y: number) => (art ? particleArt(art, particle, x, y, moving) : `<rect fill="${color}" x="${x}" y="${y}" width="1" height="1"/>`)
    body += particles.map((particle) => (moving ? movingParticle(particle, look.style, mark(particle), width, height) : stillParticle(particle, look.style, mark(particle), width, height))).join('')
  }

  if (tag) {
    const { height: th } = idleTagSize(tag)
    const at = (px: number) => num(px / scale)
    body += `<g transform="translate(${at(IDLE_TAG.margin)} ${num(height - (IDLE_TAG.margin + th) / scale)}) scale(${num(1 / scale)})">${idleTagMarkup(tag)}</g>`
  }

  const fit = crop ? ' preserveAspectRatio="xMinYMin slice"' : ''
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}"${fit} shape-rendering="crispEdges">`
  const svg = `${head}${defs.length > 0 ? `<defs>${defs.join('')}</defs>` : ''}${body}</svg>`
  return svg.length > maxChars ? undefined : svg
}

type Style = NonNullable<IdleScene['particles']>['style']

/** Where the terminal draws it at tick 0; a sparkle that starts dark isn't drawn. */
function stillParticle(particle: Particle, style: Style, mark: Mark, width: number, height: number): string {
  const at = particlePixel(particle, style, 0, width, height)
  return at ? mark(at.x, at.y) : ''
}

/** Draws one particle with its top left pixel at (x, y): a square, or the biome's particle art. */
type Mark = (x: number, y: number) => string

/**
 * One particle as the biome's art (0046 point 2): a one-frame window on the shared sheet, centred on
 * the pixel a square would fill, a quarter of the sheet's pixels per strip pixel. Moving, its frames
 * step at the particle rate, each particle from its own frame so they don't flip in step.
 */
function particleArt(sheet: DesktopSheet, particle: Particle, x: number, y: number, moving: boolean): string {
  const q = DESKTOP.sheetPixels
  const w = sheet.width / q
  const h = sheet.height / q
  const first = Math.floor(particle.phase * sheet.frames) % sheet.frames
  const order = Array.from({ length: sheet.frames }, (_, i) => -((first + i) % sheet.frames) * sheet.width)
  const step =
    moving && sheet.frames > 1
      ? `<animate attributeName="x" values="${order.join(';')}" keyTimes="${order.map((_, i) => +(i / sheet.frames).toFixed(4)).join(';')}" calcMode="discrete" dur="${num(sheet.frames / SCENE.particleFps)}s" repeatCount="indefinite"/>`
      : ''
  return `<svg x="${num(x + 0.5 - w / 2)}" y="${num(y + 0.5 - h / 2)}" width="${num(w)}" height="${num(h)}" viewBox="0 0 ${sheet.width} ${sheet.height}"><use href="#pt" x="${order[0]}">${step}</use></svg>`
}

function movingParticle(particle: Particle, style: Style, mark: Mark, width: number, height: number): string {
  const motion = SCENE.motion[style]
  const tickS = 1 / SCENE.particleFps
  const sx = Math.sign(motion.dx)
  const sy = Math.sign(motion.dy)

  // The copies one strip behind, so a particle leaving an edge comes in at the other
  const offsets: [number, number][] = [[0, 0]]
  if (sx !== 0) offsets.push([-sx * width, 0])
  if (sy !== 0) for (const [x] of [...offsets]) offsets.push([x, -sy * height])
  let dot = offsets.map(([x, y]) => mark(x, y)).join('')

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
