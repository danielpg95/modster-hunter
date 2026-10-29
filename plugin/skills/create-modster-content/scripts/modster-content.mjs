#!/usr/bin/env node
// The content helper for the create-modster-content skill (decision 0025).
// It reuses the mod's own content code, so the helper and the mod can't
// disagree. No dependencies; needs Node 22.18+ (type stripping).
//
// Every command writes only the file it's told to, and `check` writes nothing.
//
//   node modster-content.mjs convert <sheet.png> --frames N [--out file.sprite.json] [--catcher]
//   node modster-content.mjs convert <animation.gif> [--out file.sprite.json] [--catcher]
//   node modster-content.mjs draw <grid.json> --out sprite.png [--catcher]
//   node modster-content.mjs preview <sprite.png --frames N | anim.gif | x.sprite.json> --out preview.png [--scale S] [--catcher]
//   node modster-content.mjs preview-catcher <catcher-folder> --out preview.html [--on id,id] [--scale S]
//   node modster-content.mjs check [content-folder] [--without-builtins]
//   node modster-content.mjs reduce <ref.png> --crop X,Y,W,H --size WxH --out base.png [--desktop] [--colors N]
//                            [--dark 70] [--edges top,left,right,bottom|none] [--clear "#rrggbb,…"] [--tolerance 48] [--trim-edges 190]
//   node modster-content.mjs check-desktop <sheet.png> --frames N --kind modster|background|catcher|particles
//                            [--fps F] [--preview page.html] [--catcher catcher.json]
//
// `reduce` turns a reference image into a base to finish (desktop art with --desktop,
// decision 0045); `check-desktop` checks desktop art and can write a browser preview.
//
// `--catcher` allows up to 16 frames, as a catcher's sprite may have (decision 0035).
import './ts-resolve.mjs'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { deflateSync } from 'node:zlib'

const { CONTENT, USER_CONTENT } = await import('../../../hooks/constants.ts')
const { checkCatcherSprite, formatIssue, loadAllContent, spriteFromGif, spriteFromPng, spriteFromSheet, validateCatcher, validateSprite } = await import(
  '../../../hooks/content/index.ts'
)
const { catchPreview, catchPreviewPage, checkReport, clearReaching, desktopPreviewPage, encodeRgbaPng, indexedRgba, keepLargest, parseRgb, previewImage, refImage, sheetFromGrid, trimEdges } = await import(
  './lib/index.ts'
)
const { desktopSheet, loadContent } = await import('../../../hooks/content/index.ts')
const { decodePng } = await import('../../../hooks/vendor/png.ts')

const BUILT_IN_ROOT = new URL('../../../content', import.meta.url).pathname
const PREVIEW_SCALE = { default: 8, min: 1, max: 32 }
// A catcher's preview plays on a big and the smallest built-in Modster unless --on says otherwise
const CATCHER_PREVIEW = { scale: 4, on: ['elderbark', 'dunebun'] }

const USAGE = [
  'usage: node modster-content.mjs convert <sheet.png> --frames N [--out file.sprite.json] [--catcher]',
  '       node modster-content.mjs convert <animation.gif> [--out file.sprite.json] [--catcher]',
  '       node modster-content.mjs draw <grid.json> --out sprite.png [--catcher]',
  '       node modster-content.mjs preview <sprite.png --frames N | anim.gif | x.sprite.json> --out preview.png [--scale S] [--catcher]',
  '       node modster-content.mjs preview-catcher <catcher-folder> --out preview.html [--on id,id] [--scale S]',
  '       node modster-content.mjs check [content-folder] [--without-builtins]',
  '       node modster-content.mjs reduce <ref.png> --crop X,Y,W,H --size WxH --out base.png [--desktop] [--colors N] [--dark 70] [--edges …|none] [--clear "#rrggbb,…"] [--tolerance 48] [--trim-edges 190]',
  '       node modster-content.mjs check-desktop <sheet.png> --frames N --kind modster|background|catcher|particles [--fps F] [--preview page.html] [--catcher catcher.json]',
].join('\n')

function fail(message) {
  console.error(message)
  process.exit(1)
}

const COMMANDS = { convert, draw, preview, 'preview-catcher': previewCatcher, check, reduce, 'check-desktop': checkDesktop }
// Desktop art kinds and their bounds (decisions 0045 and 0046)
const DESKTOP_KINDS = { modster: CONTENT.desktop.modster, background: CONTENT.desktop.background, catcher: CONTENT.desktop.catcher, particles: CONTENT.desktop.particles }

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

/** The frame limit: a catcher's sprite may have more frames than a Modster's (decision 0035). */
function maxFramesFor(isCatcher) {
  return isCatcher ? CONTENT.catcher.framesMax : CONTENT.sprite.framesMax
}

/** The `--frames` value as a number, or undefined when it's left out. */
function framesOption(value, framesMax = CONTENT.sprite.framesMax) {
  if (value === undefined) return undefined
  const frames = Number(value)
  const { framesMin } = CONTENT.sprite
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
function loadSprite(input, frames, maxFrames = CONTENT.sprite.framesMax) {
  const name = basename(input)
  if (input.endsWith('.sprite.json')) {
    let value
    try {
      value = JSON.parse(readFileSync(input, 'utf8'))
    } catch (error) {
      fail(`${input}: ${error.message}`)
    }
    if (frames !== undefined) fail('--frames is only for a PNG sheet; a .sprite.json holds its own frames')
    return valueOf(validateSprite(value, { file: name, maxFrames }))
  }
  const kind = extname(input).toLowerCase()
  if (kind === '.png') {
    if (frames === undefined) fail(`--frames is required for a PNG sheet: how many frames sit side by side\n${USAGE}`)
    return valueOf(spriteFromPng(readBytes(input), frames, name, maxFrames))
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
  const args = parse(argv, { frames: { type: 'string' }, out: { type: 'string' }, catcher: { type: 'boolean' } })
  const [input] = args.positionals
  if (!input) fail(USAGE)
  const kind = extname(input).toLowerCase()
  if (kind !== '.png' && kind !== '.gif') fail(`${input}: expected a .png sheet or a .gif animation\n${USAGE}`)
  const maxFrames = maxFramesFor(args.values.catcher)
  const sprite = loadSprite(input, framesOption(args.values.frames, maxFrames), maxFrames)
  const out = args.values.out ?? join(dirname(input), `${basename(input, extname(input))}.sprite.json`)
  writeFileSync(out, `${JSON.stringify(sprite, null, 2)}\n`)
  console.log(`${out}: ${describeSprite(sprite)}`)
}

/** Writes a PNG sheet from a text grid, after checking it makes a valid sprite. */
function draw(argv) {
  const args = parse(argv, { out: { type: 'string' }, catcher: { type: 'boolean' } })
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
  const maxFrames = maxFramesFor(args.values.catcher)
  const { image, frames } = valueOf(sheetFromGrid(value, basename(input), maxFrames))
  // The same checks the mod runs on the PNG, before anything is written
  const sprite = valueOf(spriteFromSheet(image, frames, basename(out), maxFrames))
  const png = encodeRgbaPng(image, (raw) => new Uint8Array(deflateSync(raw)))
  valueOf(spriteFromPng(png, frames, basename(out), maxFrames))
  writeFileSync(out, png)
  const file = args.values.catcher ? 'catcher.json' : 'modster.json'
  console.log(`${out}: ${describeSprite(sprite)}; in ${file}: "sprite": { "file": "${basename(out)}", "frames": ${frames} }`)
}

/** Writes an enlarged preview of every frame, on a dark and a light background. */
function preview(argv) {
  const args = parse(argv, { frames: { type: 'string' }, out: { type: 'string' }, scale: { type: 'string' }, catcher: { type: 'boolean' } })
  const [input] = args.positionals
  if (!input || !args.values.out) fail(`preview needs a sprite file and --out\n${USAGE}`)
  const out = args.values.out
  if (extname(out).toLowerCase() !== '.png') fail(`--out must name a .png file (got "${out}")`)
  const scale = scaleOption(args.values.scale, PREVIEW_SCALE.default)
  const maxFrames = maxFramesFor(args.values.catcher)
  const sprite = loadSprite(input, framesOption(args.values.frames, maxFrames), maxFrames)
  const image = previewImage(sprite, scale)
  writeFileSync(out, encodeRgbaPng(image, (raw) => new Uint8Array(deflateSync(raw))))
  console.log(`${out}: ${describeSprite(sprite)}, shown ${scale}× on dark and light`)
}

function scaleOption(value, fallback) {
  const scale = value === undefined ? fallback : Number(value)
  if (!(Number.isInteger(scale) && scale >= PREVIEW_SCALE.min && scale <= PREVIEW_SCALE.max)) {
    fail(`--scale must be a whole number ${PREVIEW_SCALE.min}–${PREVIEW_SCALE.max} (got "${value}")`)
  }
  return scale
}

/**
 * Writes an HTML page that plays a catcher's throw on built-in Modsters, made
 * with the mod's own frame function (decision 0035 point 14): a catch and both
 * kinds of miss, on dark and light. Says where the catcher doesn't fit.
 */
function previewCatcher(argv) {
  const args = parse(argv, { out: { type: 'string' }, on: { type: 'string' }, scale: { type: 'string' } })
  const [input] = args.positionals
  if (!input || !args.values.out) fail(`preview-catcher needs a catcher folder and --out\n${USAGE}`)
  const out = args.values.out
  if (extname(out).toLowerCase() !== '.html') fail(`--out must name a .html file (got "${out}")`)
  const scale = scaleOption(args.values.scale, CATCHER_PREVIEW.scale)
  const folder = input.replace(/[\\/]+$/, '')
  const file = join(folder, 'catcher.json')
  let value
  try {
    value = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    fail(`${file}: ${error.message}`)
  }
  const catcher = valueOf(validateCatcher(value, { file: 'catcher.json', folder: basename(folder), userContent: true }))
  if (!catcher.sprite) fail(`${file}: has desktop art only; this preview draws the terminal sprite`)
  const sprite = loadSprite(join(folder, catcher.sprite.file), catcher.sprite.frames, CONTENT.catcher.framesMax)
  const spriteIssues = checkCatcherSprite(catcher, sprite, 'catcher.json')
  for (const issue of spriteIssues) console.error(formatIssue(issue))
  if (spriteIssues.length > 0) process.exit(1)

  const ids = args.values.on ? args.values.on.split(',').map((id) => id.trim()).filter(Boolean) : CATCHER_PREVIEW.on
  const modsters = ids.map((id) => {
    const dir = join(BUILT_IN_ROOT, 'modsters', id)
    if (!existsSync(join(dir, 'modster.json'))) fail(`--on: "${id}" isn't a built-in Modster`)
    const modster = JSON.parse(readFileSync(join(dir, 'modster.json'), 'utf8'))
    if (!modster.sprite) fail(`--on: "${id}" has desktop art only; pick a Modster with a terminal sprite`)
    return {
      name: modster.name,
      sprite: JSON.parse(readFileSync(join(dir, modster.sprite.file), 'utf8')),
      fps: modster.sprite.fps ?? CONTENT.modster.defaultFps,
    }
  })
  const { frames, fits } = catchPreview(catcher, sprite, modsters, scale)
  const pngs = frames.map((image) => Buffer.from(encodeRgbaPng(image, (raw) => new Uint8Array(deflateSync(raw)))).toString('base64'))
  writeFileSync(out, catchPreviewPage(catcher.name, modsters.map((modster) => modster.name), pngs))
  console.log(`${out}: ${catcher.name} on ${modsters.map((modster) => modster.name).join(', ')}, ${frames.length} frames at ${scale}×`)
  modsters.forEach((modster, i) => {
    if (!fits[i]) console.log(`${catcher.name} is bigger than ${modster.name}'s sprite area (${modster.sprite.width}×${modster.sprite.height}): throws at it show the dot count instead`)
  })
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
      async readBase64(path) {
        return existsSync(path) ? readFileSync(path).toString('base64') : undefined
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

/**
 * Turns a reference image into a base to finish by hand (P5-22): cut out along the
 * outline, a palette, a shrink to --size. With --desktop it's desktop art's base
 * (decision 0045): up to 64 colors (default 48). --clear and --trim-edges clean up
 * what a busy background leaves. A PNG reference only (convert others first).
 */
function reduce(argv) {
  const args = parse(argv, {
    crop: { type: 'string' },
    size: { type: 'string' },
    out: { type: 'string' },
    desktop: { type: 'boolean' },
    colors: { type: 'string' },
    dark: { type: 'string' },
    edges: { type: 'string' },
    clear: { type: 'string' },
    tolerance: { type: 'string' },
    'trim-edges': { type: 'string' },
  })
  const [input] = args.positionals
  const { crop, size, out } = args.values
  if (!input || !crop || !size || !out) fail(`reduce needs a reference, --crop, --size and --out\n${USAGE}`)
  if (extname(out).toLowerCase() !== '.png') fail(`--out must name a .png file (got "${out}")`)
  const [x, y, w, h] = crop.split(',').map(Number)
  const [sw, sh] = size.toLowerCase().split('x').map(Number)
  if ([x, y, w, h, sw, sh].some((n) => !Number.isInteger(n) || n < 0) || !w || !h || !sw || !sh) fail(`--crop is X,Y,W,H and --size is WxH, in whole pixels\n${USAGE}`)
  const desktop = args.values.desktop === true
  const colors = args.values.colors === undefined ? (desktop ? 48 : 24) : Number(args.values.colors)
  const most = desktop ? CONTENT.desktop.colorsMax : 24
  if (!(Number.isInteger(colors) && colors >= 1 && colors <= most)) fail(`--colors must be 1–${most}${desktop ? ' for desktop art (decision 0045)' : ' (decision 0034)'}`)
  let image
  try {
    // A reference is big; the sheet it becomes is checked later
    image = decodePng(readBytes(input), { maxWidth: 8192, maxHeight: 8192 })
  } catch (error) {
    fail(`${input}: can't be read as a PNG (${error.message}); convert it first, e.g. sips -s format png ref.jpg --out ref.png`)
  }
  if (x + w > image.width || y + h > image.height) fail(`--crop goes past the ${image.width}×${image.height} image`)
  let clear = []
  try {
    clear = args.values.clear ? args.values.clear.split(',').map(parseRgb) : []
  } catch (error) {
    fail(`--clear: ${error.message}`)
  }
  const result = refImage(image, {
    crop: { x, y, w, h },
    size: { w: sw, h: sh },
    colors,
    dark: args.values.dark === undefined ? 70 : Number(args.values.dark),
    ...(args.values.edges === undefined ? {} : { edges: args.values.edges.split(',') }),
  })
  if (clear.length) clearReaching(result.image, result.palette, clear, args.values.tolerance === undefined ? 48 : Number(args.values.tolerance))
  if (args.values['trim-edges'] !== undefined) trimEdges(result.image, result.palette, Number(args.values['trim-edges']))
  if (clear.length || args.values['trim-edges'] !== undefined) keepLargest(result.image)
  writeFileSync(out, encodeRgbaPng(indexedRgba(result), (raw) => new Uint8Array(deflateSync(raw, { level: 9 }))))
  const used = new Set([...result.image.pixels].filter((p) => p >= 0)).size
  console.log(`${out}: ${sw}×${sh}, ${used} colors`)
}

/**
 * Checks desktop art (decisions 0045 and 0046) the way the mod will when it loads it,
 * and with --preview writes a browser page drawn by the mod's own renderers.
 */
async function checkDesktop(argv) {
  const args = parse(argv, { frames: { type: 'string' }, kind: { type: 'string' }, fps: { type: 'string' }, preview: { type: 'string' }, catcher: { type: 'string' } })
  const [input] = args.positionals
  const kind = args.values.kind
  if (!input || !kind) fail(`check-desktop needs a sheet and --kind\n${USAGE}`)
  if (!Object.hasOwn(DESKTOP_KINDS, kind)) fail(`--kind must be modster, background, catcher or particles (it is "${kind}")`)
  const rules = DESKTOP_KINDS[kind]
  const frames = Number(args.values.frames)
  if (!(Number.isInteger(frames) && frames >= rules.framesMin && frames <= rules.framesMax)) {
    fail(`--frames must be ${rules.framesMin}–${rules.framesMax} for ${kind} desktop art (it is ${args.values.frames ?? 'missing'})`)
  }
  const bytes = readBytes(input)
  const result = desktopSheet(Buffer.from(bytes).toString('base64'), { frames, field: 'desktop art', file: basename(input) }, rules)
  for (const issue of result.issues) console.error(formatIssue(issue))
  if (!result.ok) process.exit(1)
  const sheet = result.value
  const decision = kind === 'particles' ? '0046' : '0045'
  console.log(`${input}: ${frames} frames of ${sheet.width}×${sheet.height}, ${sheet.colors.length} colours, ${(bytes.length / 1024).toFixed(1)} KiB: fits ${kind} desktop art (${decision})`)
  if (args.values.preview === undefined) return
  const fps = args.values.fps === undefined ? CONTENT.modster.defaultFps : Number(args.values.fps)
  if (!(fps >= 1 && fps <= 12)) fail(`--fps must be 1–12 (it is ${args.values.fps})`)
  let catcher
  if (args.values.catcher !== undefined) {
    try {
      catcher = JSON.parse(readFileSync(args.values.catcher, 'utf8'))
    } catch (error) {
      fail(`${args.values.catcher}: ${error.message}`)
    }
  }
  const targets = kind === 'catcher' ? await throwTargets() : []
  writeFileSync(args.values.preview, desktopPreviewPage({ kind, sheet, bytes: bytes.length, fps, title: basename(input), ...(catcher ? { catcher } : {}), targets }))
  console.log(`${args.values.preview}: preview page`)
}

/** Built-in Modsters a catcher's preview throws at: Shellsprout (desktop art) and Dunebun (terminal art, the smallest). */
async function throwTargets() {
  const reader = {
    listFolders: async (path) => (existsSync(path) ? readdirSync(path, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : []),
    readText: async (path) => (existsSync(path) ? readFileSync(path, 'utf8') : undefined),
    readBase64: async (path) => (existsSync(path) ? readFileSync(path).toString('base64') : undefined),
  }
  const content = await loadContent(reader, BUILT_IN_ROOT)
  return ['sproutling', 'dunebun'].flatMap((id) => {
    const loaded = content.modsters.get(id)
    if (!loaded) return []
    const fps = (loaded.desktop ? loaded.modster.desktopSprite?.fps : loaded.modster.sprite?.fps) ?? CONTENT.modster.defaultFps
    return [{ name: loaded.modster.name, art: { ...(loaded.sprite ? { sprite: loaded.sprite } : {}), ...(loaded.desktop ? { desktop: loaded.desktop } : {}) }, fps }]
  })
}

