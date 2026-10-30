import { DESKTOP } from '../constants'
import type { IdleScene, Particle } from './idle-scene'
import { sceneSvg } from './scene-svg'

/** An SVG document sized in strip pixels (terminal pixels): the Modster's art, or a throw (decision 0048 point 1). */
export interface SceneActor {
  source: string
  width: number
  height: number
}

export interface EncounterSceneOptions {
  /** Strip width in strip pixels, drawn wider than the pane and cropped at its right edge, as the band does */
  width: number
  /** Where the Modster's centre stands, in strip pixels from the left: the middle of the part the pane shows */
  center: number
  /** CSS pixels per strip pixel */
  scale: number
  /** Over this many characters there's no Svg (0048 point 4); defaults to DESKTOP.svgMaxChars */
  maxChars?: number
}

/**
 * The desktop encounter pane's scene (decision 0048): the biome's idle scene as a strip along the
 * bottom, moving, and the actor standing on it in front. One SVG document with both nested, so the
 * pane draws a single `Svg`; undefined over `maxChars`, and the pane draws the Modster alone.
 * The nested ids don't clash: the strip uses `bg` and `pt`, a throw its own (`cs`, `tile`, ...).
 */
export function encounterSceneSvg(scene: IdleScene, particles: readonly Particle[], actor: SceneActor, { width, center, scale, maxChars = DESKTOP.svgMaxChars }: EncounterSceneOptions): string | undefined {
  const strip = sceneSvg(scene, particles, { width, scale: 1, moving: true, maxChars: Infinity })
  if (!strip) return undefined
  const stripHeight = scene.rows * 2
  const height = Math.max(stripHeight, actor.height)
  const x = Math.max(0, Math.min(width - actor.width, center - actor.width / 2))
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width * scale)}" height="${num(height * scale)}" viewBox="0 0 ${num(width)} ${num(height)}" preserveAspectRatio="xMinYMin slice" shape-rendering="crispEdges">`
  const svg = `${head}${placed(strip, 0, height - stripHeight)}${placed(actor.source, x, height - actor.height)}</svg>`
  return svg.length > maxChars ? undefined : svg
}

/** The document moved to (x, y) inside the outer one: a nested `<svg>` keeps its own viewBox and size. */
function placed(svg: string, x: number, y: number): string {
  return svg.replace('<svg ', `<svg x="${num(x)}" y="${num(y)}" `)
}

const num = (n: number): string => String(+n.toFixed(3))
