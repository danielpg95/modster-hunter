#!/usr/bin/env node
// Turns a contributor's reference image into a sprite-sized base to finish by hand (P5-22).
//
//   npm run ref-sprite -- ref.png --crop X,Y,W,H --size WxH [--colors 24] [--dark 70]
//                         [--edges top,left,right,bottom] [--out base.png] [--grid]
//   npm run ref-sprite -- --from-grid base.grid.txt [--out base.png]
//
// 1. Cuts the background away: flood-fills from the crop's edges, stopped by the
//    reference's dark outline (pixels darker than --dark, grown by 1 px so JPEG
//    noise can't leak through). Leave an edge out of --edges when the subject
//    touches it there.
// 2. Builds a palette of --colors colors from the subject (k-means).
// 3. Shrinks to --size by taking each cell's most common palette color, which keeps
//    thin lines (outlines, spirals, eyes) that averaging would blur.
// 4. Keeps only the largest connected shape, dropping stray specks.
// With --grid it also writes a letter grid (palette + one row per line) for hand
// edits; --from-grid turns an edited grid back into a PNG.
//
// --desktop makes a desktop sheet's base (decision 0045): up to 128×128, up to 64
// colors (default 48), and no terminal notes. Busy backgrounds leave pieces that
// the outline didn't stop (sky between leaves, ground under feet):
//   --clear "#8fd3f0,#6b4a2b"  clears pixels within --tolerance (default 48) of
//                              these colors that reach the outside; enclosed ones
//                              stay, since they're usually highlights
//   --trim-edges 190           clears pixels on the outer edge at least this bright
//                              (pale specks left by a light background)
// Every PNG it writes is fully compressed: a desktop sheet has a 48 KiB budget.
import './ts-resolve.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import pngjs from 'pngjs'

const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

// The reduction itself lives with the player's helper, so both reduce the same way
const lib = await import('../plugin/skills/create-modster-content/scripts/lib/ref-image.ts')
export const { cutout, buildPalette, nearest, shrink, keepLargest, clearReaching, trimEdges } = lib
export const refSprite = lib.refImage

const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
const parseHex = lib.parseRgb

/** A letter grid: palette lines (`a #rrggbb`), a blank line, then one row per pixel row ('.' = transparent). */
export function toGrid({ image, palette }) {
  if (palette.length > LETTERS.length) throw new Error(`a grid holds at most ${LETTERS.length} colors`)
  const rows = []
  for (let y = 0; y < image.height; y++) {
    let row = ''
    for (let x = 0; x < image.width; x++) {
      const k = image.pixels[y * image.width + x]
      row += k < 0 ? '.' : LETTERS[k]
    }
    rows.push(row)
  }
  return palette.map((c, i) => `${LETTERS[i]} ${hex(c)}`).join('\n') + '\n\n' + rows.join('\n') + '\n'
}

/** Parses a letter grid back into { image, palette }. */
export function fromGrid(text) {
  const [head, body = ''] = text.replace(/\r/g, '').trim().split(/\n\s*\n/)
  const palette = [], index = new Map()
  for (const line of head.split('\n')) {
    const m = line.trim().match(/^([A-Za-z]) #([0-9a-fA-F]{6})$/)
    if (!m) throw new Error(`bad palette line: "${line}"`)
    index.set(m[1], palette.length)
    palette.push([0, 2, 4].map((o) => parseInt(m[2].slice(o, o + 2), 16)))
  }
  const rows = body.split('\n')
  const width = Math.max(...rows.map((r) => r.length)), height = rows.length
  const pixels = new Int16Array(width * height).fill(-1)
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return
    if (!index.has(ch)) throw new Error(`row ${y}: "${ch}" is not in the palette`)
    pixels[y * width + x] = index.get(ch)
  }))
  return { image: { width, height, pixels }, palette }
}

export function toPng({ image, palette }) {
  const png = new pngjs.PNG({ width: image.width, height: image.height })
  for (let k = 0; k < image.width * image.height; k++) {
    const p = image.pixels[k]
    png.data.set(p < 0 ? [0, 0, 0, 0] : [...palette[p], 255], k * 4)
  }
  return pngjs.PNG.sync.write(png, { deflateLevel: 9, deflateStrategy: 1 })
}

function main(argv) {
  const opts = {}
  const files = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--grid') opts.grid = true
    else if (a === '--desktop') opts.desktop = true
    else if (a.startsWith('--')) opts[a.slice(2)] = argv[++i]
    else files.push(a)
  }
  const usage = 'usage: ref-sprite <ref.png> --crop X,Y,W,H --size WxH [--colors 24] [--dark 70] [--edges top,left,right,bottom] [--out file.png] [--grid]\n' +
    '                  [--desktop] [--clear "#rrggbb,…"] [--tolerance 48] [--trim-edges 190]\n       ref-sprite --from-grid <file.grid.txt> [--out file.png]'
  if (opts['from-grid']) {
    const result = fromGrid(readFileSync(opts['from-grid'], 'utf8'))
    const out = opts.out ?? opts['from-grid'].replace(/\.grid\.txt$|\.txt$/, '') + '.png'
    writeFileSync(out, toPng(result))
    console.log(`${out}: ${result.image.width}×${result.image.height}, ${new Set(result.image.pixels.filter((p) => p >= 0)).size} colors`)
    return 0
  }
  if (files.length !== 1 || !opts.crop || !opts.size) { console.error(usage); return 2 }
  const [x, y, w, h] = opts.crop.split(',').map(Number)
  const [sw, sh] = opts.size.toLowerCase().split('x').map(Number)
  if ([x, y, w, h, sw, sh].some((n) => !Number.isInteger(n) || n < 0) || !w || !h || !sw || !sh) { console.error(usage); return 2 }
  const png = pngjs.PNG.sync.read(readFileSync(files[0]))
  if (x + w > png.width || y + h > png.height) { console.error(`--crop goes past the ${png.width}×${png.height} image`); return 2 }
  const colors = opts.colors ? Number(opts.colors) : opts.desktop ? 48 : 24
  if (opts.desktop) {
    // Decision 0045: hi-res pixel art, up to 128×128 and 64 colors
    if (colors > 64) { console.error('--colors: desktop art has at most 64 colors (decision 0045)'); return 2 }
    if (sw > 128 || sh > 128) console.warn('note: per frame, a desktop Modster is at most 128×128, a background 192×48, a catcher 96×96 (decision 0045)')
  } else {
    if (colors > 24) console.warn('note: built-in sprites use at most 24 colors (decision 0034)')
    if (sh > 32) console.warn('note: sprites are at most 32 px tall (decision 0033)')
  }
  let clear
  try {
    clear = opts.clear ? opts.clear.split(',').map(parseHex) : []
  } catch (error) {
    console.error(`--clear: ${error.message}`)
    return 2
  }
  const result = refSprite(png, {
    crop: { x, y, w, h },
    size: { w: sw, h: sh },
    colors,
    dark: opts.dark ? Number(opts.dark) : 70,
    edges: opts.edges ? opts.edges.split(',') : undefined,
  })
  if (clear.length) clearReaching(result.image, result.palette, clear, opts.tolerance ? Number(opts.tolerance) : 48)
  if (opts['trim-edges']) trimEdges(result.image, result.palette, Number(opts['trim-edges']))
  if (clear.length || opts['trim-edges']) keepLargest(result.image)
  const out = opts.out ?? files[0].replace(/\.png$/i, '') + '.base.png'
  writeFileSync(out, toPng(result))
  let note = ''
  if (opts.grid) {
    const gridOut = out.replace(/\.png$/i, '') + '.grid.txt'
    writeFileSync(gridOut, toGrid(result))
    note = `, grid in ${gridOut}`
  }
  const used = new Set(result.image.pixels.filter((p) => p >= 0)).size
  console.log(`${out}: ${sw}×${sh}, ${used} colors${note}`)
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)))
