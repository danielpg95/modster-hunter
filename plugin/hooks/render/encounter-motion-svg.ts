import { DESKTOP, IDLE_TAG, MOTION } from '../constants'
import type { MotionLayout } from './motion-layout'
import { ARRIVAL, type MotionStage } from './motion-stage'

// The desktop encounter in the scene (decision 0051), one Svg per motion. The strip keeps its idle
// size; during an encounter it sits slid right over a dark backdrop, where the Client draws Throw and
// Run. Each motion is stamped with its start: the surface reuses a source it has drawn before with
// its animation already over, so the same markup twice would show the end first.

export interface MotionSvgInput {
  /** The biome's strip as the idle scene draws it, sized in CSS pixels */
  strip: { source: string; width: number; height: number }
  layout: MotionLayout
  stage: Exclude<MotionStage, 'gone'>
  /** The arrival's or the departure's start, so each motion is a new source */
  stamp: number
  /** The Modster or its throw, drawn at `layout.modster`; none for a caught Modster leaving */
  actor?: string
  /** The name tag: name, caught mark and tier; the result while leaving */
  tag: string
  /** Leaving: a gold burst for a catch, else a grey puff */
  caught?: boolean
  maxChars?: number
}

export function encounterMotionSvg({ strip, layout, stage, stamp, actor, tag, caught = false, maxChars = DESKTOP.svgMaxChars }: MotionSvgInput): string | undefined {
  const { width, height } = strip
  const { slide, modster } = layout
  // Inside the sliding group, where x 0 is the strip's left edge
  const box = { ...modster, x: modster.x - slide }
  const drawn = actor ? nested(actor, box) : ''
  const label = tagMarkup(tag, height)
  let defs = ''
  let content: string
  let motion = ''
  let flash = ''
  if (stage === 'arrive') {
    defs = `<defs><filter id="mm-dark"><feFlood flood-color="${MOTION.silhouette}"/><feComposite in2="SourceAlpha" operator="in"/></filter><g id="mm-actor">${drawn}</g></defs>`
    const span = ARRIVAL.spriteAt + MOTION.fadeS - ARRIVAL.silhouetteAt
    const keys = `0;${num(MOTION.fadeS / span)};${num((ARRIVAL.spriteAt - ARRIVAL.silhouetteAt) / span)};1`
    const silhouette = `<g opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="${keys}" begin="${sec(ARRIVAL.silhouetteAt)}" dur="${sec(span)}" fill="freeze"/><use href="#mm-actor" filter="url(#mm-dark)"/></g>`
    content = `${silhouette}${fadingIn(ARRIVAL.spriteAt, '<use href="#mm-actor"/>')}${fadingIn(ARRIVAL.tagAt, label)}`
    motion = slideBy(0, slide, ARRIVAL.slideAt)
    flash = `<rect width="${num(width)}" height="${num(height)}" fill="#fff" opacity="0"><animate attributeName="opacity" values="0;${MOTION.flashOpacity};0" dur="${sec(MOTION.flashS)}" fill="freeze"/></rect>`
  } else if (stage === 'up') {
    content = `${drawn}${label}`
  } else {
    // The Modster and its tag fade under the cue, then the scene slides back (0051 point 4)
    const fade = `<animate attributeName="opacity" from="1" to="0" dur="${sec(MOTION.cueS * 0.6)}" fill="freeze"/>`
    content = `<g>${fade}${drawn}${label}</g>${cue(box, caught)}`
    motion = slideBy(slide, 0, MOTION.cueS)
  }
  const at = stage === 'arrive' ? 0 : slide
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" data-motion="${stage}/${stamp}" width="${num(width)}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}">` +
    `${defs}<rect width="${num(width)}" height="${num(height)}" fill="${MOTION.backdrop}"/>` +
    `<g transform="translate(${num(at)} 0)">${motion}${placed(strip.source, 0, 0)}${content}</g>${flash}</svg>`
  return svg.length > maxChars ? undefined : svg
}

/** The tag at the scene's bottom left, on a translucent backing like the idle tag's (0047). */
function tagMarkup(text: string, sceneHeight: number): string {
  const { padX, height, fontPx, charPx, margin, backingOpacity } = IDLE_TAG
  const width = Math.ceil(padX * 2 + [...text].length * charPx)
  const y = sceneHeight - height - margin
  return (
    `<g transform="translate(${margin} ${num(y)})"><rect width="${width}" height="${height}" rx="${height / 2}" fill="#000" fill-opacity="${backingOpacity}"/>` +
    `<text x="${padX}" y="${height / 2}" dominant-baseline="central" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${fontPx}" font-weight="600" fill="#f2f2f2">${escape(text)}</text></g>`
  )
}

/** A gold burst for a catch, a grey puff otherwise, where the Modster stood. */
function cue(box: { x: number; y: number; width: number; height: number }, caught: boolean): string {
  const cx = num(box.x + box.width / 2)
  const cy = num(box.y + box.height / 2)
  const r = Math.max(box.width, box.height) * 0.6
  const color = caught ? MOTION.caughtCue : MOTION.fledCue
  const dur = sec(MOTION.cueS)
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    return (
      `<circle cx="${cx}" cy="${cy}" r="4" fill="${color}"><animate attributeName="cx" from="${cx}" to="${num(+cx + Math.cos(a) * r)}" dur="${dur}" fill="freeze"/>` +
      `<animate attributeName="cy" from="${cy}" to="${num(+cy + Math.sin(a) * r)}" dur="${dur}" fill="freeze"/><animate attributeName="r" from="4" to="0" dur="${dur}" fill="freeze"/></circle>`
    )
  }).join('')
  return `<circle cx="${cx}" cy="${cy}" r="0" fill="${color}" opacity="0.7"><animate attributeName="r" from="0" to="${num(r)}" dur="${dur}" fill="freeze"/><animate attributeName="opacity" from="0.7" to="0" dur="${dur}" fill="freeze"/></circle>${rays}`
}

function fadingIn(at: number, markup: string): string {
  return `<g opacity="0"><animate attributeName="opacity" from="0" to="1" begin="${sec(at)}" dur="${sec(MOTION.fadeS)}" fill="freeze"/>${markup}</g>`
}

function slideBy(from: number, to: number, at: number): string {
  return `<animateTransform attributeName="transform" type="translate" from="${num(from)} 0" to="${num(to)} 0" begin="${sec(at)}" dur="${sec(MOTION.slideS)}" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.8 0.2 1" fill="freeze"/>`
}

/** A document moved to (x, y) inside the outer one: a nested `<svg>` keeps its own viewBox and size. */
function placed(svg: string, x: number, y: number): string {
  return svg.replace('<svg ', `<svg x="${num(x)}" y="${num(y)}" `)
}

/** A document nested at `box`, its root's own size replaced; its viewBox scales it. */
function nested(svg: string, box: { x: number; y: number; width: number; height: number }): string {
  return svg.replace(/^<svg ([^>]*)>/, (_, attrs: string) => `<svg x="${num(box.x)}" y="${num(box.y)}" width="${num(box.width)}" height="${num(box.height)}" ${attrs.replace(/(^|\s)(width|height)="[^"]*"/g, '').trim()}>`)
}

const num = (n: number): string => String(+n.toFixed(3))
/** Seconds for SMIL, rounded so sums like 0.4 + 0.45 read 0.85s */
const sec = (n: number): string => `${num(n)}s`
const escape = (text: string): string => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
