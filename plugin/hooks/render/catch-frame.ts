import { CATCH } from '../constants'
import type { Catcher, Sprite } from '../content'
import { resolveBeats, type ResolvedBeat, type ResolvedBeats } from './catch-beats'
import { catchBeatAt, type CatchBeatAt, type CatchOutcome } from './catch-timeline'
import type { Frame } from './pixels-to-cells'
import { rgbaOf, spriteRgba } from './sprite-cells'

// One frame of a throw (decision 0035), drawn in the Modster's own sprite area
// so it never takes more rows than the Modster does (0012). Terminal cells
// can't blend, so every pixel is opaque or empty: fades become motion, and a
// flash mixes colors toward white instead of lowering alpha.

interface Art {
  width: number
  height: number
  /** RGBA, row-major, one array per frame */
  frames: Uint8Array[]
}

/** Everything a throw draws from, decoded once per catcher and Modster. */
export interface CatchArt {
  /** The Modster's sprite area, which every frame fills */
  width: number
  height: number
  modster: Art
  modsterFps: number
  catcher: Art
  beats: ResolvedBeats
  lidRows: number
  rim?: number[]
  /** The Modster's opaque pixels across all its frames, inclusive */
  bounds: { x0: number; y0: number; x1: number; y1: number }
  /** False when a beat anchors the catcher (`over`, `behind`) and it's bigger than the area: callers show the dot count (0035 point 8) */
  fits: boolean
}

/** Decodes the art; `glowIndex` takes the Modster's most common bright color. */
export function prepareCatch(catcher: Catcher, catcherSprite: Sprite, modsterSprite: Sprite, modsterFps: number): CatchArt {
  const modster: Art = { width: modsterSprite.width, height: modsterSprite.height, frames: spriteRgba(modsterSprite) }
  const palette = [...catcherSprite.palette]
  if (catcher.glowIndex !== undefined) palette[catcher.glowIndex] = mainColor(modster)
  const art: Art = { width: catcherSprite.width, height: catcherSprite.height, frames: spriteRgba(catcherSprite, palette) }
  const beats = resolveBeats(catcher)
  const anchored = Object.values(beats).some((beat) => beat.place !== 'stretch')
  const rimColor = catcher.rimIndex === undefined ? undefined : catcherSprite.palette[catcher.rimIndex]
  return {
    width: modster.width,
    height: modster.height,
    modster,
    modsterFps,
    catcher: art,
    beats,
    lidRows: catcher.lidRows ?? 0,
    ...(rimColor ? { rim: rgbaOf(rimColor).slice(0, 3) } : {}),
    bounds: opaqueBounds(modster),
    fits: !anchored || (art.width <= modster.width && art.height <= modster.height),
  }
}

/** The throw `ms` after it was made, for a catch or a miss after `rocks` rocks. */
export function catchFrame(art: CatchArt, outcome: CatchOutcome, rocks: number, ms: number): Frame {
  const canvas = new Canvas(art.width, art.height)
  const at = catchBeatAt(ms, outcome, rocks)
  const beat = art.beats[at.beat]
  const modsterFrame = Math.floor((Math.max(0, ms) * art.modsterFps) / 1000) % art.modster.frames.length
  const pose = modsterPose(art, beat, at)

  // The Modster goes into or comes out of the opening in front of the catcher
  const modsterOnTop = beat.place === 'behind' || beat.modster === 'shrink-in' || beat.modster === 'pop-out'
  if (modsterOnTop) drawCatcher(canvas, art, beat, at, pose)
  if (pose) drawModster(canvas, art, modsterFrame, pose)
  if (!modsterOnTop) drawCatcher(canvas, art, beat, at, pose)
  if (at.beat === 'caught') drawSparkles(canvas, art, beat, at, pose)
  return { width: art.width, height: art.height, rgba: canvas.rgba }
}

// ---------- the Modster ----------

interface Pose {
  scale: number
  /** Where the sprite's center lands */
  anchor: [number, number]
  /** 0–1 toward white */
  white: number
  dim: boolean
}

function modsterPose(art: CatchArt, beat: ResolvedBeat, at: CatchBeatAt): Pose | undefined {
  const center: [number, number] = [art.width / 2, art.height / 2]
  const u = at.progress
  const plain: Pose = { scale: 1, anchor: center, white: 0, dim: false }
  switch (beat.modster) {
    case 'hidden':
      return undefined
    case 'visible':
      return plain
    case 'dim':
      return { ...plain, dim: true }
    case 'shake': {
      const dx = Math.round(sway(at) * 1.4)
      return { ...plain, anchor: [center[0] + dx, center[1] - (Math.abs(sway(at)) > 0.7 ? 1 : 0)] }
    }
    case 'hop-out':
      return { ...plain, anchor: [center[0], center[1] - Math.round(CATCH.hopPx * Math.sin(Math.min(1, u / 0.66) * Math.PI))] }
    case 'shrink': {
      const scale = 1 - (1 - CATCH.shrinkScale) * easeOut(Math.min(1, u / 0.5))
      return { ...plain, scale, anchor: shrinkAnchor(art, scale) }
    }
    case 'shrink-in': {
      const scale = 1 - easeOut(clamp01((u - 0.2) / 0.8))
      return { scale, anchor: lerp2(center, mouth(art), 1 - scale), white: Math.min(1, u * 2.2), dim: false }
    }
    case 'pop-out': {
      const scale = easeOut(Math.min(1, u / 0.85))
      return { scale, anchor: lerp2(mouth(art), center, scale), white: 1 - u, dim: false }
    }
  }
}

/** Scaling about the bottom of the Modster's outline, so it shrinks where it stands. */
function shrinkAnchor(art: CatchArt, scale: number): [number, number] {
  const { x0, x1, y1 } = art.bounds
  const bx = (x0 + x1 + 1) / 2
  const by = y1 + 1
  return [bx + (art.width / 2 - bx) * scale, by - (by - art.height / 2) * scale]
}

function drawModster(canvas: Canvas, art: CatchArt, frame: number, pose: Pose): void {
  if (pose.scale <= 0.02) return
  const { width, height, frames } = art.modster
  const rgba = frames[frame] ?? frames[0]
  if (!rgba) return
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const sx = Math.floor(width / 2 + (x + 0.5 - pose.anchor[0]) / pose.scale)
      const sy = Math.floor(height / 2 + (y + 0.5 - pose.anchor[1]) / pose.scale)
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue
      const i = (sy * width + sx) * 4
      if ((rgba[i + 3] ?? 0) < 128) continue
      const color = [rgba[i] ?? 0, rgba[i + 1] ?? 0, rgba[i + 2] ?? 0].map((c) => (pose.dim ? c * (1 - CATCH.dimAmount) : c))
      canvas.put(x, y, color, pose.white)
    }
  }
}

// ---------- the catcher ----------

function drawCatcher(canvas: Canvas, art: CatchArt, beat: ResolvedBeat, at: CatchBeatAt, pose: Pose | undefined): void {
  const frame = beatFrame(art, beat, at)
  if (beat.place === 'stretch') drawStretch(canvas, art, beat, at, frame, pose)
  else drawAnchored(canvas, art, beat, at, frame)
}

/** The frame a beat shows now: its own frames spread over the beat, or frame 0 when the preset makes them. */
function beatFrame(art: CatchArt, beat: ResolvedBeat, at: CatchBeatAt): Uint8Array {
  const list = beat.frames ?? [0]
  const index = list[Math.min(list.length - 1, Math.floor(at.progress * list.length))] ?? 0
  return art.catcher.frames[index] ?? art.catcher.frames[0] ?? new Uint8Array()
}

/** The catcher's resting place: bottom center of the area. */
function restingAt(art: CatchArt): [number, number] {
  return [Math.floor((art.width - art.catcher.width) / 2), art.height - art.catcher.height]
}

/** The opening the Modster goes through: the lid's lower edge, or the catcher's top. */
function mouth(art: CatchArt): [number, number] {
  const [, y] = restingAt(art)
  return [art.width / 2, y + art.lidRows]
}

interface Motion {
  x: number
  y: number
  angle: number
  lidDx: number
  lidDy: number
  body: boolean
  white: number
}

function drawAnchored(canvas: Canvas, art: CatchArt, beat: ResolvedBeat, at: CatchBeatAt, frame: Uint8Array): void {
  const motion = anchoredMotion(art, beat, at)
  const { width, height } = art.catcher
  const cos = Math.cos(motion.angle)
  const sin = Math.sin(motion.angle)
  // Rotation is about the bottom center, so a tilt rocks on the ground
  const px = width / 2
  const py = height
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = x + 0.5 - motion.x - px
      const dy = y + 0.5 - motion.y - py
      const rx = cos * dx + sin * dy + px
      const ry = -sin * dx + cos * dy + py
      // The lid, moved on its own, wins over the body
      const lid = sample(frame, width, height, rx - motion.lidDx, ry - motion.lidDy, (row) => row < art.lidRows)
      const body = motion.body ? sample(frame, width, height, rx, ry, (row) => row >= art.lidRows) : undefined
      const color = lid ?? body
      if (color) canvas.put(x, y, color, motion.white)
    }
  }
}

function anchoredMotion(art: CatchArt, beat: ResolvedBeat, at: CatchBeatAt): Motion {
  const [x, y] = restingAt(art)
  const still: Motion = { x, y, angle: 0, lidDx: 0, lidDy: 0, body: true, white: 0 }
  const made = beat.frames === undefined
  const lid = art.lidRows > 0 && made
  const u = at.progress
  switch (at.beat) {
    case 'throw': {
      const v = easeOut(u)
      const from = throwStart(art, beat, x, y)
      const lift = beat.path === 'arc' ? Math.sin(v * Math.PI) * art.height * 0.35 : 0
      // Made frames spin in flight; drawn ones keep their own look
      const spin = beat.path === 'arc' && made ? (1 - v) * -Math.PI * 1.5 : 0
      return { ...still, x: Math.round(from[0] + (x - from[0]) * v), y: Math.round(from[1] + (y - from[1]) * v - lift), angle: spin }
    }
    case 'take':
      return lid ? { ...still, lidDy: -Math.round(CATCH.lidLiftPx * Math.min(1, u * 3)) } : still
    case 'settle':
      return { ...still, y: y + (u < 0.5 ? 1 : 0), lidDy: lid ? -Math.round(CATCH.lidLiftPx * (1 - Math.min(1, u * 2))) : 0 }
    case 'rock': {
      if (!made) return still
      const step = Math.round(sway(at) * 2) / 2
      return { ...still, angle: step * CATCH.tiltRadians }
    }
    case 'caught':
      return { ...still, white: at.elapsedMs < 80 ? 0.7 : 0 }
    case 'broken': {
      if (!made) return still
      const e = at.elapsedMs
      return {
        ...still,
        body: u < 0.5,
        lidDy: lid ? -Math.round(3 + e / 18) : 0,
        lidDx: lid ? Math.round(e / 40) : 0,
        white: e < 90 ? 0.8 : 0,
      }
    }
  }
}

function throwStart(art: CatchArt, beat: ResolvedBeat, x: number, y: number): [number, number] {
  if (beat.path === 'drop') return [x, -art.catcher.height]
  if (beat.path === 'none') return [x, y]
  return [-art.catcher.width, Math.round(art.height * 0.15)]
}

// ---------- a stretch shape: the frame tiled over the Modster's outline ----------

interface Dome {
  cx: number
  /** The bottom row */
  by: number
  rx: number
  ry: number
}

function dome(art: CatchArt): Dome {
  const { x0, y0, x1, y1 } = art.bounds
  const by = Math.min(art.height - 1, y1 + 1)
  return { cx: (x0 + x1 + 1) / 2, by, rx: (x1 - x0 + 1) / 2 + CATCH.stretchMarginPx, ry: by - y0 + CATCH.stretchMarginPx }
}

interface StretchMotion {
  shape: Dome
  /** Shifts the tile sideways, so the mesh moves with a shaking Modster */
  shift: number
  /** Rows below this aren't drawn yet, while it drops over */
  showTo: number
  /** Half-width of the tear in the middle, and how far the halves have moved */
  tear: number
  spread: number
  fall: number
  knot: boolean
}

function drawStretch(canvas: Canvas, art: CatchArt, beat: ResolvedBeat, at: CatchBeatAt, tile: Uint8Array, pose: Pose | undefined): void {
  const m = stretchMotion(art, beat, at, pose)
  if (!m) return
  const { cx, by, rx, ry } = m.shape
  const { width: tw, height: th } = art.catcher
  const left = Math.floor(cx - rx)
  const top = Math.floor(by - ry)
  for (let y = top; y <= Math.round(by); y++) {
    for (let x = left; x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx
      const dy = (y + 0.5 - by) / ry
      const d = dx * dx + dy * dy
      if (d > 1 || y > m.showTo || (m.tear > 0 && Math.abs(x + 0.5 - cx) < m.tear)) continue
      const side = x + 0.5 < cx ? -1 : 1
      const ox = m.tear > 0 ? side * m.spread : 0
      const edge = y === Math.round(by) || d > CATCH.rimFrom
      if (edge && art.rim) {
        canvas.put(x + ox, y + m.fall, art.rim, 0)
        continue
      }
      const color = sample(tile, tw, th, mod(x - left + m.shift, tw), mod(y - top, th), () => true)
      if (color) canvas.put(x + ox, y + m.fall, color, 0)
    }
  }
  if (m.knot && art.rim) {
    const kx = Math.round(cx)
    const ky = Math.round(by - ry) - 1
    for (const [a, b] of [[0, 0], [-1, -1], [1, -1], [0, 1]] as const) canvas.put(kx + a, ky + b, art.rim, 0)
  }
}

function stretchMotion(art: CatchArt, beat: ResolvedBeat, at: CatchBeatAt, pose: Pose | undefined): StretchMotion | undefined {
  const full = dome(art)
  const base: StretchMotion = { shape: full, shift: 0, showTo: Infinity, tear: 0, spread: 0, fall: 0, knot: false }
  const u = at.progress
  switch (at.beat) {
    case 'throw': {
      const v = easeOut(u)
      const scale = 0.35 + 0.65 * v
      const startX = beat.path === 'arc' ? -full.rx : full.cx
      const startY = beat.path === 'none' ? full.by : full.by - full.ry * 1.1
      const lift = beat.path === 'arc' ? full.ry * 0.4 * Math.sin(v * Math.PI) : 0
      const shape = { cx: startX + (full.cx - startX) * v, by: startY + (full.by - startY) * v - lift, rx: full.rx * scale, ry: full.ry * scale * 0.6 }
      return { ...base, shape }
    }
    case 'take':
      return { ...base, showTo: full.by - full.ry + (full.ry + 1) * easeOut(Math.min(1, u / 0.75)) }
    case 'settle':
      return base
    case 'rock': {
      const dx = Math.round(sway(at) * 1.4)
      return { ...base, shape: { ...full, cx: full.cx + dx * 0.5, rx: full.rx + Math.abs(dx) * 0.5 }, shift: dx }
    }
    case 'caught': {
      // The shape tightens with a shrinking Modster
      const scale = pose && pose.scale < 1 ? pose.scale : 1
      return { ...base, shape: { cx: full.cx, by: full.by, rx: full.rx * scale, ry: full.ry * scale }, knot: u > 0.6 }
    }
    case 'broken': {
      if (u >= 1) return undefined
      return { ...base, tear: 1 + u * full.rx * 0.6, spread: Math.round(u * 6), fall: Math.round(u * u * 8) }
    }
  }
}

// ---------- sparkles on a catch ----------

function drawSparkles(canvas: Canvas, art: CatchArt, beat: ResolvedBeat, at: CatchBeatAt, pose: Pose | undefined): void {
  if (at.progress >= 1) return
  const shape = dome(art)
  const scale = pose && pose.scale < 1 ? pose.scale : 1
  const [, top] = restingAt(art)
  const center: [number, number] = beat.place === 'stretch' ? [shape.cx, shape.by - shape.ry * scale] : [art.width / 2, top + 2]
  const r = 3 + at.progress * 9
  const size = at.progress < 0.6 ? 2 : 1
  const points = [[-1, -1], [1, -1], [-1.4, 0.2], [1.4, 0.2], [0, -1.4]] as const
  points.forEach(([ax, ay], n) => {
    const color = rgbaOf(CATCH.sparkleColors[n % CATCH.sparkleColors.length] ?? '#ffffff').slice(0, 3)
    const x = Math.round(center[0] + ax * r)
    const y = Math.round(center[1] + ay * r)
    canvas.put(x, y, color, 0)
    for (let k = 1; k <= size; k++) for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]] as const) canvas.put(x + dx, y + dy, color, 0)
  })
}

// ---------- helpers ----------

class Canvas {
  readonly width: number
  readonly height: number
  readonly rgba: Uint8Array

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.rgba = new Uint8Array(width * height * 4)
  }

  /** An opaque pixel, mixed `white` of the way to white; off the area is skipped. */
  put(x: number, y: number, color: readonly number[], white: number): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const i = (y * this.width + x) * 4
    for (let c = 0; c < 3; c++) {
      const v = color[c] ?? 0
      this.rgba[i + c] = Math.round(v + (255 - v) * white)
    }
    this.rgba[i + 3] = 255
  }
}

/** The opaque color at a point of an RGBA image, when `row` passes `keep`. */
function sample(rgba: Uint8Array, width: number, height: number, x: number, y: number, keep: (row: number) => boolean): number[] | undefined {
  const sx = Math.floor(x)
  const sy = Math.floor(y)
  if (sx < 0 || sy < 0 || sx >= width || sy >= height || !keep(sy)) return undefined
  const i = (sy * width + sx) * 4
  if ((rgba[i + 3] ?? 0) < 128) return undefined
  return [rgba[i] ?? 0, rgba[i + 1] ?? 0, rgba[i + 2] ?? 0]
}

/** A rock's side-to-side motion, -1 to 1: one swing, then a still moment; every other rock leans the other way. */
function sway(at: CatchBeatAt): number {
  const u = at.progress
  const raw = u < 0.8 ? Math.sin((u / 0.8) * Math.PI * 2) : 0
  return at.rock % 2 === 0 ? raw : -raw
}

/** The Modster's most common color bright enough to glow, else its most common one. */
function mainColor(art: Art): string {
  const counts = new Map<number, number>()
  const rgba = art.frames[0] ?? new Uint8Array()
  for (let i = 0; i < rgba.length; i += 4) {
    if ((rgba[i + 3] ?? 0) < 128) continue
    const key = ((rgba[i] ?? 0) << 16) | ((rgba[i + 1] ?? 0) << 8) | (rgba[i + 2] ?? 0)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key)
  const bright = ranked.find((key) => ((key >> 16) & 255) + ((key >> 8) & 255) + (key & 255) > CATCH.glowMinBrightness)
  const key = bright ?? ranked[0] ?? 0xffffff
  return `#${key.toString(16).padStart(6, '0')}ff`
}

function opaqueBounds(art: Art): CatchArt['bounds'] {
  let x0 = art.width
  let y0 = art.height
  let x1 = -1
  let y1 = -1
  for (const rgba of art.frames) {
    for (let y = 0; y < art.height; y++) {
      for (let x = 0; x < art.width; x++) {
        if ((rgba[(y * art.width + x) * 4 + 3] ?? 0) < 128) continue
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
        y0 = Math.min(y0, y)
        y1 = Math.max(y1, y)
      }
    }
  }
  // A blank sprite: the whole area
  return x1 < 0 ? { x0: 0, y0: 0, x1: art.width - 1, y1: art.height - 1 } : { x0, y0, x1, y1 }
}

const easeOut = (u: number): number => 1 - (1 - u) * (1 - u)
const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
const mod = (n: number, m: number): number => ((n % m) + m) % m
const lerp2 = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
