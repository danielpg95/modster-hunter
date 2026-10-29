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
import { readFileSync, writeFileSync } from 'node:fs'
import pngjs from 'pngjs'

const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

/** Background mask for a crop of `png`: true where the background is. */
export function cutout(png, crop, { dark = 70, edges = ['top', 'left', 'right', 'bottom'] } = {}) {
  const { x: X0, y: Y0, w: W, h: H } = crop
  const at = (x, y) => ((Y0 + y) * png.width + X0 + x) * 4
  const wall = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = at(x, y)
    if (lum(png.data[i], png.data[i + 1], png.data[i + 2]) >= dark) continue
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) wall[ny * W + nx] = 1
    }
  }
  const bg = new Uint8Array(W * H)
  const stack = []
  for (let x = 0; x < W; x++) {
    if (edges.includes('top')) stack.push(x)
    if (edges.includes('bottom')) stack.push((H - 1) * W + x)
  }
  for (let y = 0; y < H; y++) {
    if (edges.includes('left')) stack.push(y * W)
    if (edges.includes('right')) stack.push(y * W + W - 1)
  }
  while (stack.length) {
    const k = stack.pop()
    if (bg[k] || wall[k]) continue
    bg[k] = 1
    const x = k % W, y = (k / W) | 0
    if (x > 0) stack.push(k - 1)
    if (x < W - 1) stack.push(k + 1)
    if (y > 0) stack.push(k - W)
    if (y < H - 1) stack.push(k + W)
  }
  return bg
}

/** A palette of up to `count` colors for `colors` ([r, g, b] lists), by k-means from spread-out seeds. */
export function buildPalette(colors, count) {
  if (!colors.length) return []
  const centres = [colors[0].slice()]
  while (centres.length < count) {
    let best = null, bestD = -1
    for (const c of colors) {
      const d = Math.min(...centres.map((m) => dist2(c, m)))
      if (d > bestD) { bestD = d; best = c }
    }
    if (bestD <= 0) break
    centres.push(best.slice())
  }
  for (let round = 0; round < 20; round++) {
    const sums = centres.map(() => [0, 0, 0, 0])
    for (const c of colors) {
      const s = sums[nearest(centres, c)]
      s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; s[3]++
    }
    sums.forEach((s, i) => { if (s[3]) centres[i] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]] })
  }
  return centres.map((c) => c.map(Math.round))
}

export function nearest(palette, c) {
  let best = 0, bestD = Infinity
  palette.forEach((p, i) => { const d = dist2(p, c); if (d < bestD) { bestD = d; best = i } })
  return best
}

/**
 * Shrinks the crop to `size` cells: each cell takes its most common palette color
 * among subject pixels, or stays transparent when most of it is background.
 * Returns { width, height, pixels } with palette indexes (-1 = transparent).
 */
export function shrink(png, crop, bg, palette, size) {
  const { x: X0, y: Y0, w: W, h: H } = crop
  const pixels = new Int16Array(size.w * size.h).fill(-1)
  for (let cy = 0; cy < size.h; cy++) for (let cx = 0; cx < size.w; cx++) {
    const counts = new Map()
    let total = 0, subject = 0
    for (let y = Math.floor((cy * H) / size.h); y < ((cy + 1) * H) / size.h; y++) {
      for (let x = Math.floor((cx * W) / size.w); x < ((cx + 1) * W) / size.w; x++) {
        total++
        if (bg[y * W + x]) continue
        subject++
        const i = ((Y0 + y) * png.width + X0 + x) * 4
        const k = nearest(palette, [png.data[i], png.data[i + 1], png.data[i + 2]])
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
    }
    if (subject * 2 < total) continue
    pixels[cy * size.w + cx] = [...counts].sort((a, b) => b[1] - a[1])[0][0]
  }
  return { width: size.w, height: size.h, pixels }
}

/** Clears everything but the largest 4-connected shape. */
export function keepLargest(image) {
  const { width: W, height: H, pixels } = image
  const id = new Int32Array(W * H).fill(-1)
  let best = -1, bestSize = 0, next = 0
  for (let s = 0; s < W * H; s++) {
    if (pixels[s] < 0 || id[s] >= 0) continue
    let size = 0
    const stack = [s]
    while (stack.length) {
      const k = stack.pop()
      if (id[k] >= 0 || pixels[k] < 0) continue
      id[k] = next; size++
      const x = k % W, y = (k / W) | 0
      if (x > 0) stack.push(k - 1)
      if (x < W - 1) stack.push(k + 1)
      if (y > 0) stack.push(k - W)
      if (y < H - 1) stack.push(k + W)
    }
    if (size > bestSize) { bestSize = size; best = next }
    next++
  }
  for (let k = 0; k < W * H; k++) if (id[k] !== best) pixels[k] = -1
  return image
}

/** The whole pipeline: reference PNG in, { image, palette } out. */
export function refSprite(png, { crop, size, colors = 24, dark = 70, edges } = {}) {
  const bg = cutout(png, crop, { dark, edges })
  const sample = []
  for (let y = 0; y < crop.h; y += 2) for (let x = 0; x < crop.w; x += 2) {
    if (bg[y * crop.w + x]) continue
    const i = ((crop.y + y) * png.width + crop.x + x) * 4
    sample.push([png.data[i], png.data[i + 1], png.data[i + 2]])
  }
  const palette = buildPalette(sample, colors)
  const image = keepLargest(shrink(png, crop, bg, palette, size))
  return { image, palette }
}

/**
 * Clears pixels whose color is within `tolerance` of one of `colors` and that reach the
 * outside (the image edge or a transparent pixel) through such pixels. Enclosed matches stay.
 */
export function clearReaching(image, palette, colors, tolerance = 48) {
  const { width: W, height: H, pixels } = image
  const near = palette.map((p) => colors.some((c) => dist2(p, c) <= tolerance * tolerance))
  const matches = (k) => pixels[k] >= 0 && near[pixels[k]]
  const out = new Uint8Array(W * H)
  const stack = []
  for (let k = 0; k < W * H; k++) {
    const x = k % W, y = (k / W) | 0
    if (pixels[k] < 0 || x === 0 || y === 0 || x === W - 1 || y === H - 1) { out[k] = 1; stack.push(k) }
  }
  while (stack.length) {
    const k = stack.pop()
    const x = k % W, y = (k / W) | 0
    for (const n of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1]) {
      if (n < 0 || out[n] || !matches(n)) continue
      out[n] = 1
      stack.push(n)
    }
  }
  for (let k = 0; k < W * H; k++) if (out[k] && matches(k)) pixels[k] = -1
  return image
}

/** Clears pixels on the outer edge at least `brightness` bright (0–255 luma), twice, so a 2-px fringe goes too. */
export function trimEdges(image, palette, brightness) {
  const { width: W, height: H, pixels } = image
  for (let pass = 0; pass < 2; pass++) {
    const clear = []
    for (let k = 0; k < W * H; k++) {
      if (pixels[k] < 0 || lum(...palette[pixels[k]]) < brightness) continue
      const x = k % W, y = (k / W) | 0
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy
        return nx < 0 || ny < 0 || nx >= W || ny >= H || pixels[ny * W + nx] < 0
      })
      if (edge) clear.push(k)
    }
    for (const k of clear) pixels[k] = -1
  }
  return image
}

const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
const parseHex = (text) => {
  const m = text.trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (!m) throw new Error(`"${text}" is not a color like #8fd3f0`)
  return [0, 2, 4].map((o) => parseInt(m[1].slice(o, o + 2), 16))
}

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
    if (sw > 128 || sh > 128) console.warn('note: a desktop Modster is at most 128×128 per frame (decision 0045)')
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
