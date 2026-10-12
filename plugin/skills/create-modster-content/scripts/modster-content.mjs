#!/usr/bin/env node
// The content helper for the create-modster-content skill (decision 0025).
// It reuses the mod's own content code, so the helper and the mod can't
// disagree. No dependencies; needs Node 22.18+ (type stripping).
//
//   node modster-content.mjs convert <sheet.png> --frames N [--out file.sprite.json]
//   node modster-content.mjs convert <animation.gif> [--out file.sprite.json]
import './ts-resolve.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { parseArgs } from 'node:util'

const { CONTENT } = await import('../../../hooks/constants.ts')
const { formatIssue, spriteFromGif, spriteFromPng } = await import('../../../hooks/content/index.ts')

const USAGE = [
  'usage: node modster-content.mjs convert <sheet.png> --frames N [--out file.sprite.json]',
  '       node modster-content.mjs convert <animation.gif> [--out file.sprite.json]',
].join('\n')

function fail(message) {
  console.error(message)
  process.exit(1)
}

const COMMANDS = { convert }

const [command, ...rest] = process.argv.slice(2)
if (!command || command === '--help' || command === '-h') fail(USAGE)
if (!Object.hasOwn(COMMANDS, command)) fail(`unknown command "${command}"\n${USAGE}`)
COMMANDS[command](rest)

/** Writes a `.sprite.json` from a PNG sheet or a GIF, next to it unless `--out` says otherwise. */
function convert(argv) {
  let args
  try {
    args = parseArgs({ args: argv, allowPositionals: true, options: { frames: { type: 'string' }, out: { type: 'string' } } })
  } catch (error) {
    fail(`${error.message}\n${USAGE}`)
  }
  const [input, ...extra] = args.positionals
  if (!input || extra.length > 0) fail(USAGE)

  const kind = extname(input).toLowerCase()
  if (kind !== '.png' && kind !== '.gif') fail(`${input}: expected a .png sheet or a .gif animation\n${USAGE}`)
  const { framesMin, framesMax } = CONTENT.sprite
  const frames = args.values.frames === undefined ? undefined : Number(args.values.frames)
  if (frames !== undefined && !(Number.isInteger(frames) && frames >= framesMin && frames <= framesMax)) {
    fail(`--frames must be a whole number ${framesMin}–${framesMax} (got "${args.values.frames}")`)
  }
  if (kind === '.png' && frames === undefined) fail(`--frames is required for a PNG sheet: how many frames sit side by side\n${USAGE}`)

  let bytes
  try {
    bytes = new Uint8Array(readFileSync(input))
  } catch (error) {
    fail(`${input}: ${error.message}`)
  }
  const result = kind === '.png' ? spriteFromPng(bytes, frames, basename(input)) : spriteFromGif(bytes, basename(input))
  for (const issue of result.issues) console.error(formatIssue(issue))
  if (!result.ok) process.exit(1)

  const sprite = result.value
  if (kind === '.gif' && frames !== undefined && frames !== sprite.frames.length) {
    fail(`${input}: the GIF has ${sprite.frames.length} frames, but --frames says ${frames}; leave --frames out for a GIF`)
  }
  const out = args.values.out ?? join(dirname(input), `${basename(input, extname(input))}.sprite.json`)
  writeFileSync(out, `${JSON.stringify(sprite, null, 2)}\n`)
  console.log(`${out}: ${sprite.width}×${sprite.height}, ${sprite.frames.length} frames, ${sprite.palette.length - 1} colors`)
}
