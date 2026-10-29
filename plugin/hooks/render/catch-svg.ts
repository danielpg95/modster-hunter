import { CATCH, DESKTOP } from '../constants'
import type { DesktopSheet } from '../content'
import { catchBeatAt, throwingMs, type CatchOutcome } from '../game'
import { anchoredMotion, beatFrameIndex, dome, modsterOnTop, modsterPose, sparkles, stretchMotion, type CatchArt, type StretchMotion } from './catch-frame'
import type { Frame } from './pixels-to-cells'
import { framePaths, loopedFrames } from './pixels-to-svg'

// A throw as one vector SVG for the desktop's `Svg` (decision 0043). The art is
// drawn once; the motion is catch-frame's own, sampled every catchSampleMs and
// written as SMIL values the surface blends between. It plays once and holds
// its last frame. The terminal's catchFrame stays the reference for what shows.
// Groups that tests read carry a `data-part`; ids can't, since the catcher is drawn twice.

export interface CatchSvgOptions {
  /** CSS pixels per sprite pixel */
  scale: number
  /** Over this many characters there's no Svg (0043 point 8); defaults to DESKTOP.svgMaxChars */
  maxChars?: number
  /** Loop the throw forever, holding its last frame this long between plays (the Catchers tab's preview) */
  loopPauseMs?: number
  /** Paints a desktop sheet Modster in this one colour: the Catchers tab's preview before any catch */
  silhouette?: string
  /**
   * Starts the Svg this far into the throw: its first values are the throw's state then. An Svg drawn
   * as an image restarts its SMIL on every redraw and shows its plain values for a moment first, so a
   * redraw mid-throw starts a new Svg where the throw is (P5-47, checked in the Code tab)
   */
  fromMs?: number
}

/** How long a throw plays: the throw itself, then a catch's `caught` beat (0035 point 5). */
export function catchLengthMs(outcome: CatchOutcome, rocks: number): number {
  return throwingMs(outcome, rocks) + (outcome === 'caught' ? CATCH.beatMs.caught : 0)
}

/** The throw as SVG, or undefined when it comes out over `maxChars`. */
export function catchSvg(art: CatchArt, outcome: CatchOutcome, rocks: number, { scale, maxChars = DESKTOP.svgMaxChars, loopPauseMs, silhouette, fromMs = 0 }: CatchSvgOptions): string | undefined {
  const length = catchLengthMs(outcome, rocks)
  const start = Math.min(Math.max(0, fromMs), length)
  const times: number[] = []
  for (let t = start; t < length; t += DESKTOP.catchSampleMs) times.push(t)
  times.push(length)
  const timing = new Timing(
    times.map((t) => t - start),
    length - start,
    loopPauseMs,
  )
  const samples = times.map((ms) => {
    const at = catchBeatAt(ms, outcome, rocks)
    const beat = art.beats[at.beat]
    const pose = modsterPose(art, beat, at)
    return {
      at,
      beat,
      pose,
      onTop: modsterOnTop(beat),
      frame: litFrame(art, beatFrameIndex(beat, at)),
      anchored: beat.place === 'stretch' ? undefined : anchoredMotion(art, beat, at),
      stretch: beat.place === 'stretch' ? stretchMotion(art, beat, at, pose) : undefined,
      sparkles: at.beat === 'caught' ? sparkles(art, beat, at, pose) : [],
    }
  })

  const defs: string[] = []
  const { width, height } = art
  // Desktop sheets (0045 point 5) are embedded once and reused, so a throw stays under the Svg limit
  if (art.modster.sheet) defs.push(sheetImage('ms', art.modster.sheet))
  if (art.catcher.sheet) defs.push(sheetImage('cs', art.catcher.sheet))
  if (art.modster.sheet && silhouette) defs.push(`<filter id="sil"><feFlood flood-color="${silhouette}"/><feComposite in2="SourceAlpha" operator="in"/></filter>`)

  // ---------- the Modster: its idle loop, moved, scaled and tinted ----------
  const modsterFrames = art.modster.frames.map((rgba) => ({ width: art.modster.width, height: art.modster.height, rgba }))
  const shown = samples.map((s) => s.pose !== undefined && s.pose.scale > 0.02)
  const poses = held(samples.map((s) => s.pose))
  const modsterTint = poses.map((p) => colorMatrix(p?.white ?? 0, p?.dim ? 1 - CATCH.dimAmount : 1))
  const modsterFilter = filter(defs, 'mt', modsterTint, timing)
  const modster = group(
    { 'data-part': 'modster', display: timing.discrete(shown.map(shownAs)) },
    group(
      { 'data-part': 'modster-move', transform: timing.transform(poses.map((p) => (p ? `${num(p.anchor[0] - (art.modster.width / 2) * p.scale)} ${num(p.anchor[1] - (art.modster.height / 2) * p.scale)}` : '0 0')), 'translate') },
      group(
        { transform: timing.transform(poses.map((p) => num(p?.scale ?? 1)), 'scale') },
        group(
          modsterFilter ? { filter: modsterFilter } : {},
          art.modster.sheet ? modsterSheet(art.modster.sheet, art.modsterFps, silhouette !== undefined) : loopedFrames(modsterFrames, art.modsterFps),
        ),
      ),
    ),
  )

  // ---------- the catcher ----------
  const catcher = [anchoredLayer(art, samples, timing, defs), stretchLayer(art, samples, timing, defs)].join('')
  const under = samples.some((s) => s.onTop) ? group({ display: timing.discrete(samples.map((s) => shownAs(s.onTop))) }, catcher) : ''
  const over = samples.some((s) => !s.onTop) ? group({ display: timing.discrete(samples.map((s) => shownAs(!s.onTop))) }, catcher) : ''

  // ---------- sparkles on a catch ----------
  const sparkleLayer = samples.some((s) => s.sparkles.length > 0) ? sparkleGroup(samples, timing) : ''

  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`
  const svg = `${head}${defs.length > 0 ? `<defs>${defs.join('')}</defs>` : ''}${under}${modster}${over}${sparkleLayer}</svg>`
  return svg.length > maxChars ? undefined : svg
}

type Sample = {
  at: ReturnType<typeof catchBeatAt>
  beat: CatchArt['beats'][keyof CatchArt['beats']]
  pose: ReturnType<typeof modsterPose>
  onTop: boolean
  frame: { lit: boolean; index: number }
  anchored: ReturnType<typeof anchoredMotion> | undefined
  stretch: ReturnType<typeof stretchMotion>
  sparkles: { x: number; y: number; size: number }[]
}

/** Anchored beats (`over`, `behind`): the catcher moved and turned about its bottom center, the lid moving on its own. */
function anchoredLayer(art: CatchArt, samples: Sample[], timing: Timing, defs: string[]): string {
  if (samples.every((s) => !s.anchored)) return ''
  const { width, height } = art.catcher
  const motions = held(samples.map((s) => s.anchored))
  const tint = filter(defs, 'ct', motions.map((m) => colorMatrix(m?.white ?? 0, 1)), timing)
  const frames = usedFrames(samples.filter((s) => s.anchored))
  const frameGroups = (rows: { from: number; to: number }) =>
    frames
      .map((key) => {
        const content = catcherFrame(art, key, rows)
        if (content === '') return ''
        return group({ display: timing.discrete(samples.map((s) => shownAs(sameFrame(s.frame, key)))) }, content)
      })
      .join('')
  const body = frameGroups({ from: art.lidRows, to: height })
  const lid = art.lidRows > 0 ? frameGroups({ from: 0, to: art.lidRows }) : ''
  return group(
    { display: timing.discrete(samples.map((s) => shownAs(s.anchored !== undefined))) },
    group(
      tint ? { filter: tint } : {},
      group(
        { 'data-part': 'catcher-move', transform: timing.transform(motions.map((m) => (m ? `${num(m.x)} ${num(m.y)}` : '0 0')), 'translate') },
        group(
          { transform: timing.transform(motions.map((m) => `${num(((m?.angle ?? 0) * 180) / Math.PI)} ${num(width / 2)} ${height}`), 'rotate') },
          group({ display: timing.discrete(motions.map((m) => shownAs(m?.body ?? true))) }, body) +
            (lid ? group({ 'data-part': 'lid', transform: timing.transform(motions.map((m) => `${num(m?.lidDx ?? 0)} ${num(m?.lidDy ?? 0)}`), 'translate') }, lid) : ''),
        ),
      ),
    ),
  )
}

/**
 * `stretch` beats: the frame tiled over a dome on the Modster's outline (0043 point 5).
 * The dome is a path SMIL reshapes; `rimIndex` is its outer ring; a tear is two halves moving apart.
 */
function stretchLayer(art: CatchArt, samples: Sample[], timing: Timing, defs: string[]): string {
  if (samples.every((s) => !s.stretch)) return ''
  const full = dome(art)
  const motions = held(samples.map((s) => s.stretch)).map((m) => m ?? { shape: full, shift: 0, showTo: Infinity, tear: 0, spread: 0, fall: 0, knot: false })
  const { width: tw, height: th } = art.catcher
  const rim = art.rim ? `#${art.rim.map((c) => c.toString(16).padStart(2, '0')).join('')}` : undefined

  // The tile, moved with the dome's left edge and a shaking Modster
  const tileFrames = usedFrames(samples.filter((s) => s.stretch))
    .map((key) => {
      const content = catcherFrame(art, key, { from: 0, to: th })
      if (content === '') return ''
      return group({ display: timing.discrete(samples.map((s) => shownAs(sameFrame(s.frame, key)))) }, content)
    })
    .join('')
  const tileX = timing.linear(motions.map((m) => num(Math.floor(m.shape.cx - m.shape.rx) - m.shift)))
  const tileY = timing.linear(motions.map((m) => num(Math.floor(m.shape.by - m.shape.ry))))
  defs.push(
    `<pattern id="tile" patternUnits="userSpaceOnUse" width="${tw}" height="${th}" x="${tileX.value}" y="${tileY.value}">${tileX.animate('x')}${tileY.animate('y')}${tileFrames}</pattern>`,
  )

  // Rows below showTo aren't drawn yet (it drops over the Modster)
  const showTo = timing.linear(motions.map((m) => num(Math.min(3000, m.showTo + 1001))))
  defs.push(`<clipPath id="show"><rect x="-1000" y="-1000" width="3000" height="${showTo.value}">${showTo.animate('height')}</rect></clipPath>`)

  // Each half keeps the pixels on its side of the tear
  const leftEdge = timing.linear(motions.map((m) => num(Math.max(0, m.shape.cx - m.tear + 1000))))
  const rightX = timing.linear(motions.map((m) => num(m.shape.cx + m.tear)))
  defs.push(`<clipPath id="tear-l"><rect x="-1000" y="-1000" width="${leftEdge.value}" height="3000">${leftEdge.animate('width')}</rect></clipPath>`)
  defs.push(`<clipPath id="tear-r"><rect x="${rightX.value}" y="-1000" width="3000" height="3000">${rightX.animate('x')}</rect></clipPath>`)

  const domeD = (m: StretchMotion, k: number, bottom: number) => {
    const { cx, by, rx, ry } = m.shape
    return `M${num(cx - rx * k)} ${num(bottom)}V${num(by)}A${num(rx * k)} ${num(ry * k)} 0 0 1 ${num(cx + rx * k)} ${num(by)}V${num(bottom)}Z`
  }
  // The outline down to the bottom row; inside the rim, above the bottom row (catchFrame's edge test)
  const outerD = (m: StretchMotion) => domeD(m, 1, Math.round(m.shape.by) + 1)
  const innerD = (m: StretchMotion) => domeD(m, Math.sqrt(CATCH.rimFrom), Math.min(m.shape.by, Math.round(m.shape.by)))
  // The rim is a ring (even-odd: the outline less the inside), so the tile's gaps stay see-through
  const fill = rim
    ? path(rim, timing.linear(motions.map((m) => outerD(m) + innerD(m))), 'evenodd') + path('url(#tile)', timing.linear(motions.map(innerD)))
    : path('url(#tile)', timing.linear(motions.map(outerD)))
  const half = (side: 'l' | 'r') =>
    group(
      { transform: timing.transform(motions.map((m) => `${num(side === 'l' ? -m.spread : m.spread)} ${num(m.fall)}`), 'translate'), 'clip-path': `url(#tear-${side})` },
      group({ 'clip-path': 'url(#show)' }, fill),
    )
  const knot = rim
    ? group(
        {
          display: timing.discrete(motions.map((m) => shownAs(m.knot))),
          transform: timing.transform(motions.map((m) => `${Math.round(m.shape.cx)} ${Math.round(m.shape.by - m.shape.ry) - 1}`), 'translate'),
        },
        `<path fill="${rim}" d="M0 0h1v1h-1zM-1 -1h1v1h-1zM1 -1h1v1h-1zM0 1h1v1h-1z"/>`,
      )
    : ''
  return group({ display: timing.discrete(samples.map((s) => shownAs(s.stretch !== undefined))) }, half('l') + half('r') + knot)
}

/** Five sparkles, each a white core with gold arms, that burst outward and fade (0043 point 6). */
function sparkleGroup(samples: Sample[], timing: Timing): string {
  const core = CATCH.sparkleCore
  const arms = CATCH.sparkleArms
  const armPath = (size: number) => `<path fill="${arms}" d="M${-size} 0h${size}v1h${-size}zM1 0h${size}v1h${-size}zM0 ${-size}h1v${size}h-1zM0 1h1v${size}h-1z"/>`
  const count = Math.max(...samples.map((s) => s.sparkles.length))
  const tracks = Array.from({ length: count }, (_, i) => held(samples.map((s) => s.sparkles[i])))
  const points = tracks
    .map((track) =>
      group(
        { transform: timing.transform(track.map((p) => (p ? `${p.x} ${p.y}` : '0 0')), 'translate') },
        `<rect fill="${core}" width="1" height="1"/>` +
          group({ display: timing.discrete(track.map((p) => shownAs((p?.size ?? 2) === 2))) }, armPath(2)) +
          group({ display: timing.discrete(track.map((p) => shownAs((p?.size ?? 2) === 1))) }, armPath(1)),
      ),
    )
    .join('')
  // Fully bright for most of the beat, fading out over its last 40%
  const opacity = samples.map((s) => (s.sparkles.length === 0 ? '0' : num(s.at.progress < 0.6 ? 1 : (1 - s.at.progress) / 0.4)))
  return group({ 'data-part': 'sparkles', display: timing.discrete(samples.map((s) => shownAs(s.sparkles.length > 0))), opacity: timing.linear(opacity) }, points)
}

// ---------- SMIL ----------

/** A value per sample, as an attribute: a plain value when it never changes, else that plus an <animate>. */
interface Track {
  value: string
  animate(attribute: string, type?: string): string
}

/** A transform type tag, so `group` can write `translate(…)` and an animateTransform. */
interface TransformTrack {
  track: Track
  type: string
}

class Timing {
  private readonly keys: string[]
  private readonly dur: string
  private readonly loops: boolean

  /** Plays once and holds the end; with `loopPauseMs`, holds the end that long and plays again. */
  constructor(times: number[], length: number, loopPauseMs?: number) {
    const total = length + (loopPauseMs ?? 0)
    this.loops = loopPauseMs !== undefined
    this.keys = times.map((t) => String(+(t / total).toFixed(4)))
    // A loop's pause holds the last sample to the end, where linear keyTimes must reach 1
    if (this.loops) this.keys.push('1')
    this.dur = `${+(total / 1000).toFixed(3)}s`
  }

  /** Blends between samples. */
  linear(values: string[]): Track {
    return this.track(values, 'linear')
  }

  /** A `transform` of `type` (translate, scale, rotate) that blends between samples. */
  transform(values: string[], type: string): TransformTrack {
    return { track: this.track(values, 'linear'), type }
  }

  /** Jumps from one value to the next. */
  discrete(values: string[]): Track {
    return this.track(values, 'discrete')
  }

  private track(sampled: string[], mode: 'linear' | 'discrete'): Track {
    const values = this.loops ? [...sampled, sampled.at(-1) ?? ''] : sampled
    const first = values[0] ?? ''
    if (values.every((v) => v === first)) return { value: first, animate: () => '' }
    // Keep the samples where something changes: a run of one value needs only its ends
    const kept = values
      .map((value, i) => ({ value, key: this.keys[i] ?? '1' }))
      .filter(({ value }, i) => {
        if (i === 0 || i === values.length - 1) return true
        if (mode === 'discrete') return value !== values[i - 1]
        return !(value === values[i - 1] && value === values[i + 1])
      })
    const list = kept.map((k) => k.value).join(';')
    const keyTimes = kept.map((k) => k.key).join(';')
    const timing = `keyTimes="${keyTimes}" calcMode="${mode}" dur="${this.dur}" ${this.loops ? 'repeatCount="indefinite"' : 'fill="freeze"'}`
    return {
      value: first,
      animate: (attribute, type) =>
        type
          ? `<animateTransform attributeName="${attribute}" type="${type}" values="${list}" ${timing}/>`
          : `<animate attributeName="${attribute}" values="${list}" ${timing}/>`,
    }
  }
}

function group(attributes: Record<string, string | Track | TransformTrack>, content: string): string {
  if (content === '') return ''
  let attrs = ''
  let animations = ''
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'string') attrs += ` ${name}="${value}"`
    else if ('type' in value) {
      attrs += ` ${name}="${value.type}(${value.track.value})"`
      animations += value.track.animate(name, value.type)
    } else {
      attrs += ` ${name}="${value.value}"`
      animations += value.animate(name)
    }
  }
  return `<g${attrs}>${animations}${content}</g>`
}

function path(fill: string, d: Track, rule?: 'evenodd'): string {
  return `<path fill="${fill}"${rule ? ` fill-rule="${rule}"` : ''} d="${d.value}">${d.animate('d')}</path>`
}

/** A color-matrix filter in `defs` when the tint ever changes from none; returns its url. */
function filter(defs: string[], id: string, matrices: string[], timing: Timing): string | undefined {
  const plain = colorMatrix(0, 1)
  if (matrices.every((m) => m === plain)) return undefined
  const track = timing.linear(matrices)
  defs.push(`<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${track.value}">${track.animate('values')}</feColorMatrix></filter>`)
  return `url(#${id})`
}

/** Each color times `keep`, then mixed `white` of the way to white, as catchFrame's Canvas does. */
function colorMatrix(white: number, keep: number): string {
  const a = num(keep * (1 - white))
  const o = num(white)
  return `${a} 0 0 0 ${o} 0 ${a} 0 0 ${o} 0 0 ${a} 0 ${o} 0 0 0 1 0`
}

// ---------- helpers ----------

// `display`, not `visibility`: a child set visible would still show inside a hidden parent
const shownAs = (shown: boolean): string => (shown ? 'inline' : 'none')
const num = (n: number): string => String(+n.toFixed(2))

/** Fills gaps (undefined) with the nearest value before, or else after, so a hidden layer doesn't blend through garbage. */
function held<T>(values: (T | undefined)[]): (T | undefined)[] {
  let last = values.find((v) => v !== undefined)
  return values.map((v) => {
    if (v !== undefined) last = v
    return last
  })
}

function usedFrames(samples: Sample[]): { lit: boolean; index: number }[] {
  const seen = new Map<string, { lit: boolean; index: number }>()
  for (const { frame } of samples) seen.set(`${frame.lit}/${frame.index}`, frame)
  return [...seen.values()]
}

/** A catcher without `glowIndex` has one set of frames: its lit copy is the same art. */
function litFrame(art: CatchArt, frame: { lit: boolean; index: number }): { lit: boolean; index: number } {
  return art.lit === art.catcher ? { lit: false, index: frame.index } : frame
}

const sameFrame = (a: { lit: boolean; index: number }, b: { lit: boolean; index: number }): boolean => a.lit === b.lit && a.index === b.index

/**
 * One catcher frame, rows `from` to `to` (terminal pixels; the lid or the body),
 * in the catcher's own coordinates: paths for terminal art, or the shared desktop
 * sheet seen through a window on that frame, its glow colour repainted when lit.
 */
function catcherFrame(art: CatchArt, key: { lit: boolean; index: number }, rows: { from: number; to: number }): string {
  const { width, height, sheet } = art.catcher
  if (sheet) {
    const q = sheet.width / width
    const index = key.index < sheet.frames ? key.index : 0
    const glow = key.lit && art.lit.glow ? art.lit.glow : undefined
    const lit = glow?.paths[index] ? `<path fill="${glow.to}" d="${glow.paths[index]}"/>` : ''
    const view = `${index * sheet.width} ${num(rows.from * q)} ${sheet.width} ${num((rows.to - rows.from) * q)}`
    return `<svg x="0" y="${num(rows.from)}" width="${num(width)}" height="${num(rows.to - rows.from)}" viewBox="${view}" preserveAspectRatio="none"><use href="#cs"/>${lit}</svg>`
  }
  const { frames: list } = key.lit ? art.lit : art.catcher
  const rgba = list[key.index] ?? list[0]
  if (!rgba) return ''
  return framePaths(cropRows({ width, height, rgba }, (row) => row >= rows.from && row < rows.to))
}

/** A desktop sheet, embedded once under `id` for every `use` of it; pixelated, as the desktop draws sheets. */
function sheetImage(id: string, sheet: DesktopSheet): string {
  return `<image id="${id}" href="data:image/png;base64,${sheet.png}" width="${sheet.width * sheet.frames}" height="${sheet.height}" image-rendering="pixelated" style="image-rendering:pixelated"/>`
}

/** The Modster's sheet in its area, stepped a frame at a time at `fps` (as `desktopSheetSvg`); a silhouette holds frame 0. */
function modsterSheet(sheet: DesktopSheet, fps: number, silhouette: boolean): string {
  const q = CATCH.desktopPixels
  const step =
    sheet.frames > 1 && !silhouette
      ? `<animate attributeName="x" values="${Array.from({ length: sheet.frames }, (_, i) => -i * sheet.width).join(';')}" keyTimes="${Array.from({ length: sheet.frames }, (_, i) => +(i / sheet.frames).toFixed(4)).join(';')}" calcMode="discrete" dur="${+(sheet.frames / fps).toFixed(3)}s" repeatCount="indefinite"/>`
      : ''
  return `<svg width="${num(sheet.width / q)}" height="${num(sheet.height / q)}" viewBox="0 0 ${sheet.width} ${sheet.height}"><use href="#ms"${silhouette ? ' filter="url(#sil)"' : ''}>${step}</use></svg>`
}

/** The frame with the rows that fail `keep` made empty. */
function cropRows(frame: Frame, keep: (row: number) => boolean): Frame {
  const rgba = new Uint8Array(frame.rgba)
  for (let y = 0; y < frame.height; y++) if (!keep(y)) rgba.fill(0, y * frame.width * 4, (y + 1) * frame.width * 4)
  return { width: frame.width, height: frame.height, rgba }
}
