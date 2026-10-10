// Tests for tools/sprite.mjs: run with `npm run test:tools` (Node 22.18+).
// Each test writes a real PNG or GIF, runs the CLI, and checks the
// `.sprite.json` it writes with the mod's own validator.
import './ts-resolve.mjs'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { crc32, deflateSync } from 'node:zlib'
import omggif from 'omggif'
import pngjs from 'pngjs'

const { validateSprite } = await import('../plugin/hooks/content/index.ts')
const TOOL = new URL('./sprite.mjs', import.meta.url).pathname
const dir = mkdtempSync(join(tmpdir(), 'sprite-test-'))

function run(...args) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8' })
  return { code: result.status, stdout: result.stdout, stderr: result.stderr }
}

/** An RGBA PNG written by pngjs; `paint(x, y)` returns [r, g, b, a] or undefined for transparent. */
function writePng(name, width, height, paint, options = {}) {
  const png = new pngjs.PNG({ width, height, ...options })
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) png.data.set(paint(x, y) ?? [0, 0, 0, 0], (y * width + x) * 4)
  }
  const path = join(dir, name)
  writeFileSync(path, pngjs.PNG.sync.write(png, options))
  return path
}

/** A 4-bit palette PNG built by hand: the kind PIL and optimizers write, which the mod's decoder rejects (0008). */
function writePalette4BitPng(name, width, height, indexAt, colors) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([4, 3, 0, 0, 0], 8) // bit depth 4, color type 3 (palette)
  const rowBytes = Math.ceil(width / 2)
  const raw = Buffer.alloc((rowBytes + 1) * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = y * (rowBytes + 1) + 1 + (x >> 1)
      raw[at] |= x % 2 === 0 ? indexAt(x, y) << 4 : indexAt(x, y)
    }
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('PLTE', Buffer.from(colors.flatMap(([r, g, b]) => [r, g, b]))),
    chunk('tRNS', Buffer.from(colors.map(([, , , a]) => a))),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
  const path = join(dir, name)
  writeFileSync(path, png)
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
  const check = validateSprite(sprite, { file: path })
  assert.deepEqual(check.issues, [], 'output must pass the P2-01 validator with no issues')
  return sprite
}

const indexes = (frame) => [...Buffer.from(frame, 'base64')]
const RED = [255, 0, 0, 255]
const BLUE = [0, 0, 255, 255]

test('a PNG sheet becomes a valid .sprite.json next to it', () => {
  const path = writePng('two.png', 16, 8, (x, y) => (y === 0 && x === 0 ? RED : y === 0 && x === 8 ? BLUE : undefined))
  const { code, stdout } = run(path, '--frames', '2')
  assert.equal(code, 0)
  assert.match(stdout, /two\.sprite\.json: 8×8, 2 frames, 2 colors/)
  const sprite = readSprite(join(dir, 'two.sprite.json'))
  assert.deepEqual(sprite.palette, ['#00000000', '#ff0000ff', '#0000ffff'])
  assert.deepEqual(indexes(sprite.frames[0]).slice(0, 2), [1, 0])
  assert.deepEqual(indexes(sprite.frames[1]).slice(0, 2), [2, 0])
})

test('--out chooses where the file goes', () => {
  const path = writePng('out.png', 8, 8, () => RED)
  const out = join(dir, 'elsewhere.sprite.json')
  assert.equal(run(path, '--frames', '1', '--out', out).code, 0)
  readSprite(out)
})

test('alpha is snapped: below 128 transparent, 128 and up opaque', () => {
  const path = writePng('alpha.png', 8, 8, (x, y) => (y > 0 ? undefined : x === 0 ? [255, 0, 0, 100] : x === 1 ? [255, 0, 0, 200] : undefined))
  assert.equal(run(path, '--frames', '1').code, 0)
  const sprite = readSprite(join(dir, 'alpha.sprite.json'))
  assert.deepEqual(sprite.palette, ['#00000000', '#ff0000ff'])
  assert.deepEqual(indexes(sprite.frames[0]).slice(0, 2), [0, 1])
})

test('a 4-bit palette PNG with transparency converts (the mod itself rejects these)', () => {
  const colors = [[0, 0, 0, 0], [255, 0, 0, 255], [0, 255, 0, 255]]
  const path = writePalette4BitPng('pal4.png', 8, 8, (x, y) => (y === 0 ? (x % 3) : 0), colors)
  assert.equal(run(path, '--frames', '1').code, 0)
  const sprite = readSprite(join(dir, 'pal4.sprite.json'))
  assert.deepEqual(sprite.palette, ['#00000000', '#ff0000ff', '#00ff00ff'])
  assert.deepEqual(indexes(sprite.frames[0]).slice(0, 4), [0, 1, 2, 0])
})

test('a grayscale PNG converts', () => {
  const path = writePng('gray.png', 8, 8, (x) => [x * 30, x * 30, x * 30, 255], { colorType: 0, inputHasAlpha: true })
  assert.equal(run(path, '--frames', '1').code, 0)
  assert.equal(readSprite(join(dir, 'gray.sprite.json')).palette.length, 9)
})

test('more than 63 colors fails with a hint', () => {
  const path = writePng('many.png', 8, 10, (x, y) => [y * 8 + x, 0, 0, 255])
  const { code, stderr } = run(path, '--frames', '1')
  assert.equal(code, 1)
  assert.match(stderr, /80 opaque colors; at most 63 fit .* Reduce the colors/)
})

test('frames outside the 0021 bounds fail with a hint', () => {
  for (const [name, width, height] of [['wide.png', 50, 8], ['tall.png', 8, 50], ['odd.png', 8, 9], ['small.png', 6, 8]]) {
    const { code, stderr } = run(writePng(name, width, height, () => RED), '--frames', '1')
    assert.equal(code, 1, name)
    assert.match(stderr, /must be 8–48 wide and 8–48 tall with an even height \(decision 0021\)\. Resize the art or check --frames/, name)
  }
})

test('the largest frames convert: 48×48 (decision 0021)', () => {
  const path = writePng('big.png', 96, 48, (x, y) => ((x + y) % 2 === 0 ? RED : BLUE))
  const { code, stdout } = run(path, '--frames', '2')
  assert.equal(code, 0)
  assert.match(stdout, /big\.sprite\.json: 48×48, 2 frames, 2 colors/)
  readSprite(join(dir, 'big.sprite.json'))
})

test('a sheet that does not split into the frame count fails with a hint', () => {
  const { code, stderr } = run(writePng('split.png', 20, 8, () => RED), '--frames', '3')
  assert.equal(code, 1)
  assert.match(stderr, /can't split a 20 px wide sheet into 3 equal frames/)
})

test('a PNG needs --frames', () => {
  const { code, stderr } = run(writePng('noframes.png', 8, 8, () => RED))
  assert.equal(code, 1)
  assert.match(stderr, /--frames is required for a PNG sheet/)
})

test('an animated GIF becomes one frame per GIF frame', () => {
  const frame = (color) => Array.from({ length: 64 }, (_, i) => (i < 8 ? color : 0))
  const path = writeGif('anim.gif', 8, 8, [frame(1), frame(2), frame(1)], [0x000000, 0xff0000, 0x00ff00, 0x0000ff])
  const { code, stdout } = run(path)
  assert.equal(code, 0, stdout)
  const sprite = readSprite(join(dir, 'anim.sprite.json'))
  assert.equal(sprite.frames.length, 3)
  assert.deepEqual(sprite.palette, ['#00000000', '#ff0000ff', '#00ff00ff'])
  assert.deepEqual(indexes(sprite.frames[1]).slice(0, 1), [2])
  assert.deepEqual(indexes(sprite.frames[1]).slice(8, 9), [0])
})

test('a GIF with a --frames that disagrees fails', () => {
  const path = writeGif('mismatch.gif', 8, 8, [new Array(64).fill(1)], [0x000000, 0xff0000])
  const { code, stderr } = run(path, '--frames', '2')
  assert.equal(code, 1)
  assert.match(stderr, /the GIF has 1 frames, but --frames says 2/)
})

test('other file types and unreadable files fail clearly', () => {
  assert.match(run(join(dir, 'nope.jpg')).stderr, /ENOENT|expected a \.png sheet or a \.gif/)
  const bad = join(dir, 'bad.png')
  writeFileSync(bad, 'not a png')
  assert.match(run(bad, '--frames', '1').stderr, /not a PNG pngjs can read/)
})
