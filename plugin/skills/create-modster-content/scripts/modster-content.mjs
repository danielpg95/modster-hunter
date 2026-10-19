#!/usr/bin/env node
// The content helper for the create-modster-content skill (decision 0025).
// It reuses the mod's own content code, so the helper and the mod can't
// disagree. No dependencies; needs Node 22.18+ (type stripping).
//
// Every command writes only the file it's told to, and `check` writes nothing.
//
//   node modster-content.mjs convert <sheet.png> --frames N [--out file.sprite.json]
//   node modster-content.mjs convert <animation.gif> [--out file.sprite.json]
//   node modster-content.mjs draw <grid.json> --out sprite.png
//   node modster-content.mjs preview <sprite.png --frames N | anim.gif | x.sprite.json> --out preview.png [--scale S]
//   node modster-content.mjs check [content-folder] [--without-builtins]
import './ts-resolve.mjs'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { deflateSync } from 'node:zlib'

const { CONTENT, USER_CONTENT } = await import('../../../hooks/constants.ts')
const { formatIssue, loadAllContent, spriteFromGif, spriteFromPng, spriteFromSheet, validateSprite } = await import(
  '../../../hooks/content/index.ts'
)
const { checkReport, encodeRgbaPng, previewImage, sheetFromGrid } = await import('./lib/index.ts')

const BUILT_IN_ROOT = new URL('../../../content', import.meta.url).pathname
const PREVIEW_SCALE = { default: 8, min: 1, max: 32 }

const USAGE = [
  'usage: node modster-content.mjs convert <sheet.png> --frames N [--out file.sprite.json]',
  '       node modster-content.mjs convert <animation.gif> [--out file.sprite.json]',
  '       node modster-content.mjs draw <grid.json> --out sprite.png',
  '       node modster-content.mjs preview <sprite.png --frames N | anim.gif | x.sprite.json> --out preview.png [--scale S]',
  '       node modster-content.mjs check [content-folder] [--without-builtins]',
].join('\n')

function fail(message) {
  console.error(message)
  process.exit(1)
}

const COMMANDS = { convert, draw, preview, check }

const [command, ...rest] = process.argv.slice(2)
if (!command || command === '--help' || command === '-h') fail(USAGE)
if (!Object.hasOwn(COMMANDS, command)) fail(`unknown command "${command}"\n${USAGE}`)
await COMMANDS[command](rest)

function parse(argv, options, positionals = 1) {
  let args
  try {
    args = parseArgs({ args: argv, allowPositionals: true, options })
  } catch (error) {
    fail(`${error.message}\n${USAGE}`)
  }
  if (args.positionals.length > positionals) fail(USAGE)
  return args
}

function readBytes(path) {
  try {
    return new Uint8Array(readFileSync(path))
  } catch (error) {
    fail(`${path}: ${error.message}`)
  }
}

/** The `--frames` value as a number, or undefined when it's left out. */
function framesOption(value) {
  if (value === undefined) return undefined
  const frames = Number(value)
  const { framesMin, framesMax } = CONTENT.sprite
  if (!(Number.isInteger(frames) && frames >= framesMin && frames <= framesMax)) {
    fail(`--frames must be a whole number ${framesMin}–${framesMax} (got "${value}")`)
  }
  return frames
}

/** Prints a validation's issues; exits when it isn't `ok`. */
function valueOf(result) {
  for (const issue of result.issues) console.error(formatIssue(issue))
  if (!result.ok) process.exit(1)
  return result.value
}

/** A sprite from a PNG sheet (with frames), a GIF or a `.sprite.json`. */
function loadSprite(input, frames) {
  const name = basename(input)
  if (input.endsWith('.sprite.json')) {
    let value
    try {
      value = JSON.parse(readFileSync(input, 'utf8'))
    } catch (error) {
      fail(`${input}: ${error.message}`)
    }
    if (frames !== undefined) fail('--frames is only for a PNG sheet; a .sprite.json holds its own frames')
    return valueOf(validateSprite(value, { file: name }))
  }
  const kind = extname(input).toLowerCase()
  if (kind === '.png') {
    if (frames === undefined) fail(`--frames is required for a PNG sheet: how many frames sit side by side\n${USAGE}`)
    return valueOf(spriteFromPng(readBytes(input), frames, name))
  }
  if (kind === '.gif') {
    const sprite = valueOf(spriteFromGif(readBytes(input), name))
    if (frames !== undefined && frames !== sprite.frames.length) {
      fail(`${input}: the GIF has ${sprite.frames.length} frames, but --frames says ${frames}; leave --frames out for a GIF`)
    }
    return sprite
  }
  fail(`${input}: expected a .png sheet, a .gif animation or a .sprite.json\n${USAGE}`)
}

function describeSprite(sprite) {
  return `${sprite.width}×${sprite.height}, ${sprite.frames.length} frames, ${sprite.palette.length - 1} colors`
}

/** Writes a `.sprite.json` from a PNG sheet or a GIF, next to it unless `--out` says otherwise. */
function convert(argv) {
  const args = parse(argv, { frames: { type: 'string' }, out: { type: 'string' } })
  const [input] = args.positionals
  if (!input) fail(USAGE)
  const kind = extname(input).toLowerCase()
  if (kind !== '.png' && kind !== '.gif') fail(`${input}: expected a .png sheet or a .gif animation\n${USAGE}`)
  const sprite = loadSprite(input, framesOption(args.values.frames))
  const out = args.values.out ?? join(dirname(input), `${basename(input, extname(input))}.sprite.json`)
  writeFileSync(out, `${JSON.stringify(sprite, null, 2)}\n`)
  console.log(`${out}: ${describeSprite(sprite)}`)
}

/** Writes a PNG sheet from a text grid, after checking it makes a valid sprite. */
function draw(argv) {
  const args = parse(argv, { out: { type: 'string' } })
  const [input] = args.positionals
  if (!input || !args.values.out) fail(`draw needs a grid file and --out\n${USAGE}`)
  const out = args.values.out
  if (extname(out).toLowerCase() !== '.png') fail(`--out must name a .png file (got "${out}")`)
  let value
  try {
    value = JSON.parse(readFileSync(input, 'utf8'))
  } catch (error) {
    fail(`${input}: ${error.message}`)
  }
  const { image, frames } = valueOf(sheetFromGrid(value, basename(input)))
  // The same checks the mod runs on the PNG, before anything is written
  const sprite = valueOf(spriteFromSheet(image, frames, basename(out)))
  const png = encodeRgbaPng(image, (raw) => new Uint8Array(deflateSync(raw)))
  valueOf(spriteFromPng(png, frames, basename(out)))
  writeFileSync(out, png)
  console.log(`${out}: ${describeSprite(sprite)}; in modster.json: "sprite": { "file": "${basename(out)}", "frames": ${frames} }`)
}

/** Writes an enlarged preview of every frame, on a dark and a light background. */
function preview(argv) {
  const args = parse(argv, { frames: { type: 'string' }, out: { type: 'string' }, scale: { type: 'string' } })
  const [input] = args.positionals
  if (!input || !args.values.out) fail(`preview needs a sprite file and --out\n${USAGE}`)
  const out = args.values.out
  if (extname(out).toLowerCase() !== '.png') fail(`--out must name a .png file (got "${out}")`)
  const scale = args.values.scale === undefined ? PREVIEW_SCALE.default : Number(args.values.scale)
  if (!(Number.isInteger(scale) && scale >= PREVIEW_SCALE.min && scale <= PREVIEW_SCALE.max)) {
    fail(`--scale must be a whole number ${PREVIEW_SCALE.min}–${PREVIEW_SCALE.max} (got "${args.values.scale}")`)
  }
  const sprite = loadSprite(input, framesOption(args.values.frames))
  const image = previewImage(sprite, scale)
  writeFileSync(out, encodeRgbaPng(image, (raw) => new Uint8Array(deflateSync(raw))))
  console.log(`${out}: ${describeSprite(sprite)}, shown ${scale}× on dark and light`)
}

/** Loads a content folder the way the mod does, merged with the built-ins, and prints every issue. */
async function check(argv) {
  const args = parse(argv, { 'without-builtins': { type: 'boolean' } })
  const defaultRoot = join(homedir(), USER_CONTENT.contentFolder)
  const root = (args.positionals[0] ?? defaultRoot).replace(/[\\/]+$/, '')
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`${root}: no content folder here yet`)
  // Issues name files the way the mod's log does
  const label = root === defaultRoot ? `~/${USER_CONTENT.contentFolder}/` : `${root}/`
  const registry = await loadAllContent({
    reader: {
      async listFolders(path) {
        if (!existsSync(path)) return []
        return readdirSync(path, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      },
      async readText(path) {
        return existsSync(path) ? readFileSync(path, 'utf8') : undefined
      },
    },
    builtInRoot: BUILT_IN_ROOT,
    includeBuiltins: !args.values['without-builtins'],
    user: {
      root,
      label,
      // No PNG cache: check writes nothing
      sheets: async ({ path, file, frames, maxFrames }) => (existsSync(path) ? spriteFromPng(new Uint8Array(readFileSync(path)), frames, file, maxFrames) : undefined),
    },
  })
  const { lines, errors } = checkReport(registry)
  for (const line of lines) console.log(line)
  if (errors > 0) process.exit(1)
}
