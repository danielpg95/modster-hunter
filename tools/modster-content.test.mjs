// Tests for the user content helper, plugin/skills/create-modster-content/scripts/
// modster-content.mjs (decision 0025): run with `npm run test:tools` (Node 22.18+).
// Each test writes a real PNG or GIF, runs the helper, and checks what it writes
// with the mod's own validator.
import './ts-resolve.mjs'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import omggif from 'omggif'
import pngjs from 'pngjs'

const { validateSprite } = await import('../plugin/hooks/content/index.ts')
const { encodePng } = await import('../plugin/tests/fixtures/encode-png.ts')
const HELPER = new URL('../plugin/skills/create-modster-content/scripts/modster-content.mjs', import.meta.url).pathname
const dir = mkdtempSync(join(tmpdir(), 'modster-content-test-'))

function run(...args) {
  const result = spawnSync(process.execPath, [HELPER, ...args], { encoding: 'utf8' })
  return { code: result.status, stdout: result.stdout, stderr: result.stderr }
}

/** A PNG written by pngjs; `paint(x, y)` returns [r, g, b, a] or undefined for transparent. */
function writePng(name, width, height, paint, options = {}) {
  const png = new pngjs.PNG({ width, height, ...options })
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) png.data.set(paint(x, y) ?? [0, 0, 0, 0], (y * width + x) * 4)
  }
  const path = join(dir, name)
  writeFileSync(path, pngjs.PNG.sync.write(png, options))
  return path
}

/** A GIF with one 8-bit index per pixel per frame; index 0 is transparent. */
function writeGif(name, width, height, frames, palette) {
  const buffer = Buffer.alloc(4096)
  const writer = new omggif.GifWriter(buffer, width, height, { loop: 0, palette })
  for (const indexes of frames) writer.addFrame(0, 0, width, height, indexes, { transparent: 0, disposal: 2, delay: 10 })
  const path = join(dir, name)
  writeFileSync(path, buffer.subarray(0, writer.end()))
  return path
}

function readSprite(path) {
  const sprite = JSON.parse(readFileSync(path, 'utf8'))
  assert.deepEqual(validateSprite(sprite, { file: path }).issues, [], 'output must pass the validator with no issues')
  return sprite
}

const indexes = (frame) => [...Buffer.from(frame, 'base64')]
const RED = [255, 0, 0, 255]
const BLUE = [0, 0, 255, 255]

test('convert: a PNG sheet becomes a valid .sprite.json next to it', () => {
  const path = writePng('two.png', 16, 8, (x, y) => (y === 0 && x === 0 ? RED : y === 0 && x === 8 ? BLUE : undefined))
  const { code, stdout } = run('convert', path, '--frames', '2')
  assert.equal(code, 0)
  assert.match(stdout, /two\.sprite\.json: 8×8, 2 frames, 2 colors/)
  const sprite = readSprite(join(dir, 'two.sprite.json'))
  assert.deepEqual(sprite.palette, ['#00000000', '#ff0000ff', '#0000ffff'])
  assert.deepEqual(indexes(sprite.frames[1]).slice(0, 2), [2, 0])
})

test('convert: a 16-bit grayscale PNG converts too (0025 point 7)', () => {
  const path = join(dir, 'gray.png')
  const samples = Array.from({ length: 64 }, (_, i) => (i % 8 < 4 ? 0xffff : 0))
  writeFileSync(path, encodePng({ width: 8, height: 8, colorType: 0, bitDepth: 16, samples }))
  const { code } = run('convert', path, '--frames', '1')
  assert.equal(code, 0)
  assert.deepEqual(readSprite(join(dir, 'gray.sprite.json')).palette, ['#00000000', '#ffffffff', '#000000ff'])
})

test('convert: an animated GIF becomes one frame per GIF frame, at --out', () => {
  const frame = (index) => Array.from({ length: 64 }, (_, i) => (i === 0 ? index : 0))
  const path = writeGif('anim.gif', 8, 8, [frame(1), frame(2), frame(1)], [0x000000, 0xff0000, 0x00ff00, 0x0000ff])
  const out = join(dir, 'custom.sprite.json')
  const { code, stdout } = run('convert', path, '--out', out)
  assert.equal(code, 0, stdout)
  assert.match(stdout, /custom\.sprite\.json: 8×8, 3 frames, 2 colors/)
  assert.deepEqual(readSprite(out).frames.map((f) => indexes(f)[0]), [1, 2, 1])
  assert.equal(existsSync(join(dir, 'anim.sprite.json')), false)
})

test('convert: a GIF with a --frames that disagrees fails and writes nothing', () => {
  const path = writeGif('mismatch.gif', 8, 8, [new Array(64).fill(1)], [0x000000, 0xff0000])
  const { code, stderr } = run('convert', path, '--frames', '2')
  assert.equal(code, 1)
  assert.match(stderr, /the GIF has 1 frames, but --frames says 2/)
  assert.equal(existsSync(join(dir, 'mismatch.sprite.json')), false)
})

test('convert: a sprite out of bounds prints the issue and writes nothing', () => {
  const path = writePng('wide.png', 50, 8, () => RED)
  const { code, stderr } = run('convert', path, '--frames', '1')
  assert.equal(code, 1)
  assert.match(stderr, /wide\.png can't be read as a sprite sheet: PNG is 50×8 px; at most 48×48 fits/)
  assert.equal(existsSync(join(dir, 'wide.sprite.json')), false)
})

test('convert: bad arguments fail with a hint', () => {
  const png = writePng('args.png', 8, 8, () => RED)
  const cases = [
    [['convert', png], /--frames is required for a PNG sheet/],
    [['convert', png, '--frames', '9'], /--frames must be a whole number 1–8 \(got "9"\)/],
    [['convert', png, '--frames', 'two'], /--frames must be a whole number/],
    [['convert', join(dir, 'art.jpg')], /expected a \.png sheet or a \.gif animation/],
    [['convert', join(dir, 'missing.png'), '--frames', '1'], /ENOENT/],
    [['convert'], /usage:/],
    [['draw'], /unknown command "draw"/],
    [[], /usage:/],
  ]
  for (const [args, message] of cases) {
    const { code, stderr } = run(...args)
    assert.equal(code, 1, args.join(' '))
    assert.match(stderr, message)
  }
})
