#!/usr/bin/env node
// Converts a PNG sprite sheet or an animated GIF into a `.sprite.json`
// (decision 0008). The conversion itself is the mod's own `spriteFromSheet`
// (plugin/hooks/content/), so the tool and the mod can't disagree.
//
//   node tools/sprite.mjs <sheet.png> --frames N [--out file.sprite.json]
//   node tools/sprite.mjs <animation.gif> [--out file.sprite.json]
//   node tools/sprite.mjs <desktop.png> --frames N --desktop modster|background|catcher
//
// With --desktop it converts nothing: it checks desktop art against decision
// 0045 with the mod's own `desktopSheet`, since the desktop embeds the PNG as-is.
//
// Needs Node 22.18+ (type stripping) and `npm install` (pngjs, omggif).
import './ts-resolve.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { parseArgs } from 'node:util'
import omggif from 'omggif'
import pngjs from 'pngjs'

const { desktopSheet, spriteFromSheet, formatIssue } = await import('../plugin/hooks/content/index.ts')
const { CONTENT } = await import('../plugin/hooks/constants.ts')

const USAGE = 'usage: node tools/sprite.mjs <sheet.png> --frames N [--out file.sprite.json]\n' +
  '       node tools/sprite.mjs <animation.gif> [--out file.sprite.json]\n' +
  '       node tools/sprite.mjs <desktop.png> --frames N --desktop modster|background|catcher'

function fail(message) {
  console.error(message)
  process.exit(1)
}

let args
try {
  args = parseArgs({ allowPositionals: true, options: { frames: { type: 'string' }, out: { type: 'string' }, desktop: { type: 'string' } } })
} catch (error) {
  fail(`${error.message}\n${USAGE}`)
}
const [input, ...extra] = args.positionals
if (!input || extra.length > 0) fail(USAGE)

const kind = extname(input).toLowerCase()
let bytes
try {
  bytes = readFileSync(input)
} catch (error) {
  fail(`${input}: ${error.message}`)
}

if (args.values.desktop !== undefined) checkDesktop(args.values.desktop)

let sheet
let frames
if (kind === '.png') {
  if (args.values.frames === undefined) fail(`--frames is required for a PNG sheet\n${USAGE}`)
  frames = Number(args.values.frames)
  try {
    // pngjs handles every PNG (any bit depth, palette, grayscale, interlaced) and always gives RGBA
    const png = pngjs.PNG.sync.read(bytes)
    sheet = { width: png.width, height: png.height, data: png.data }
  } catch (error) {
    fail(`${input}: not a PNG pngjs can read (${error.message})`)
  }
} else if (kind === '.gif') {
  try {
    ;({ sheet, frames } = gifToSheet(bytes))
  } catch (error) {
    fail(`${input}: not a GIF omggif can read (${error.message})`)
  }
  if (args.values.frames !== undefined && Number(args.values.frames) !== frames) {
    fail(`${input}: the GIF has ${frames} frames, but --frames says ${args.values.frames}; leave --frames out for a GIF`)
  }
} else {
  fail(`${input}: expected a .png sheet or a .gif animation\n${USAGE}`)
}

const out = args.values.out ?? join(dirname(input), `${basename(input, extname(input))}.sprite.json`)
const result = spriteFromSheet(sheet, frames, basename(input))
for (const issue of result.issues) console.error(formatIssue(issue))
if (!result.ok) process.exit(1)

const sprite = result.value
writeFileSync(out, `${JSON.stringify(sprite, null, 2)}\n`)
console.log(`${out}: ${sprite.width}×${sprite.height}, ${sprite.frames.length} frames, ${sprite.palette.length - 1} colors`)

/** Checks desktop art (decision 0045) and exits: 0 when it fits, 1 with every problem. */
function checkDesktop(art) {
  if (!['modster', 'background', 'catcher'].includes(art)) fail(`--desktop must be modster, background or catcher (it is "${art}")\n${USAGE}`)
  const rules = CONTENT.desktop[art]
  if (kind !== '.png') fail(`${input}: desktop art is a .png sheet`)
  if (args.values.out !== undefined) fail('--out is not used with --desktop: the desktop uses the PNG as it is')
  const count = Number(args.values.frames)
  if (!Number.isInteger(count) || count < rules.framesMin || count > rules.framesMax) {
    fail(`--frames must be ${rules.framesMin}–${rules.framesMax} for ${art} desktop art (it is ${args.values.frames ?? 'missing'})`)
  }
  const result = desktopSheet(bytes.toString('base64'), { frames: count, field: 'desktop art', file: basename(input) }, rules)
  for (const issue of result.issues) console.error(formatIssue(issue))
  if (!result.ok) process.exit(1)
  const { width, height, colors } = result.value
  console.log(`${input}: ${count} frames of ${width}×${height}, ${colors.length} colours, ${(bytes.length / 1024).toFixed(1)} KiB: fits ${art} desktop art (0045)`)
  process.exit(0)
}

/**
 * Plays the GIF onto a canvas, honoring each frame's disposal, and lays the
 * frames out side by side as a sheet.
 */
function gifToSheet(buffer) {
  const gif = new omggif.GifReader(new Uint8Array(buffer))
  const { width, height } = gif
  const count = gif.numFrames()
  const canvas = new Uint8Array(width * height * 4)
  const sheetData = new Uint8Array(width * count * height * 4)
  for (let i = 0; i < count; i++) {
    const info = gif.frameInfo(i)
    const before = info.disposal === 3 ? canvas.slice() : undefined
    gif.decodeAndBlitFrameRGBA(i, canvas)
    for (let y = 0; y < height; y++) {
      sheetData.set(canvas.subarray(y * width * 4, (y + 1) * width * 4), (y * width * count + i * width) * 4)
    }
    // Disposal 2: clear the frame's area for the next one; 3: put back what was there
    if (info.disposal === 2) {
      for (let y = info.y; y < info.y + info.height; y++) canvas.fill(0, (y * width + info.x) * 4, (y * width + info.x + info.width) * 4)
    } else if (before) {
      canvas.set(before)
    }
  }
  return { sheet: { width: width * count, height, data: sheetData }, frames: count }
}
