// Tests for the user content helper, plugin/skills/create-modster-content/scripts/
// modster-content.mjs (decision 0025): run with `npm run test:tools` (Node 22.18+).
// Each test writes a real PNG or GIF, runs the helper, and checks what it writes
// with the mod's own validator.
import './ts-resolve.mjs'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import omggif from 'omggif'
import pngjs from 'pngjs'

const { spriteFromPng, validateSprite } = await import('../plugin/hooks/content/index.ts')
const { encodePng } = await import('../plugin/tests/fixtures/encode-png.ts')
const HELPER = new URL('../plugin/skills/create-modster-content/scripts/modster-content.mjs', import.meta.url).pathname
const dir = mkdtempSync(join(tmpdir(), 'modster-content-test-'))
// Counted from the built-in content, so adding a biome or a Modster doesn't break the tests
const BUILT_IN = new URL('../plugin/content/', import.meta.url).pathname
const builtInCount = (kind) => readdirSync(join(BUILT_IN, kind), { withFileTypes: true }).filter((entry) => entry.isDirectory()).length

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
    [['paint'], /unknown command "paint"/],
    [[], /usage:/],
  ]
  for (const [args, message] of cases) {
    const { code, stderr } = run(...args)
    assert.equal(code, 1, args.join(' '))
    assert.match(stderr, message)
  }
})

const GRID = {
  palette: { '.': 'transparent', k: '#1b1b1b', g: '#4caf50' },
  frames: [
    ['........', '..kkkk..', '.kggggk.', 'kggggggk', 'kggggggk', 'kggggggk', '.kggggk.', '..kkkk..'],
    ['........', '........', '..kkkk..', '.kggggk.', 'kggggggk', 'kggggggk', 'kggggggk', '.kkkkkk.'],
  ],
}

function writeJson(name, value) {
  const path = join(dir, name)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(value))
  return path
}

test('draw: a grid becomes a PNG sheet the mod decodes', () => {
  const out = join(dir, 'drawn.png')
  const { code, stdout } = run('draw', writeJson('grid.json', GRID), '--out', out)
  assert.equal(code, 0, stdout)
  assert.match(stdout, /drawn\.png: 8×8, 2 frames, 2 colors; in modster\.json: "sprite": \{ "file": "drawn\.png", "frames": 2 \}/)
  const result = spriteFromPng(new Uint8Array(readFileSync(out)), 2, 'drawn.png')
  assert.equal(result.ok, true)
  assert.deepEqual(result.value.palette, ['#00000000', '#1b1b1bff', '#4caf50ff'])
})

test('draw: a grid with problems, or too small for a sprite, prints them and writes nothing', () => {
  const out = join(dir, 'bad.png')
  const broken = run('draw', writeJson('broken.json', { palette: { k: '#000000' }, frames: [['kq']] }), '--out', out)
  assert.equal(broken.code, 1)
  assert.match(broken.stderr, /broken\.json: frames\[0\]\[0\] uses "q" at column 1, which isn't in the palette/)
  const tiny = run('draw', writeJson('tiny.json', { palette: { k: '#000000' }, frames: [['kk', 'kk']] }), '--out', out)
  assert.equal(tiny.code, 1)
  assert.match(tiny.stderr, /bad\.png/)
  assert.equal(existsSync(out), false)
  assert.match(run('draw', writeJson('g2.json', GRID)).stderr, /draw needs a grid file and --out/)
  assert.match(run('draw', writeJson('g3.json', GRID), '--out', join(dir, 'x.gif')).stderr, /--out must name a \.png file/)
})

test('preview: a sheet, a GIF or a .sprite.json becomes an enlarged PNG', () => {
  const sheet = join(dir, 'for-preview.png')
  run('draw', writeJson('pv.json', GRID), '--out', sheet)
  const out = join(dir, 'preview.png')
  const { code, stdout } = run('preview', sheet, '--frames', '2', '--out', out, '--scale', '4')
  assert.equal(code, 0, stdout)
  assert.match(stdout, /8×8, 2 frames, 2 colors, shown 4× on dark and light/)
  const png = pngjs.PNG.sync.read(readFileSync(out))
  // 2 frames × (8 + 1) × 4 + 4 wide; 2 strips × (8 + 1) × 4 + 4 tall
  assert.deepEqual([png.width, png.height], [76, 76])

  run('convert', sheet, '--frames', '2', '--out', join(dir, 'pv.sprite.json'))
  assert.equal(run('preview', join(dir, 'pv.sprite.json'), '--out', out).code, 0)
  assert.match(run('preview', join(dir, 'pv.sprite.json'), '--frames', '2', '--out', out).stderr, /--frames is only for a PNG sheet/)
  assert.match(run('preview', sheet, '--out', out).stderr, /--frames is required/)
  assert.match(run('preview', sheet, '--frames', '2', '--out', out, '--scale', '0').stderr, /--scale must be a whole number 1–32/)
})

test('check: a user folder loads like the mod loads it, with every issue', () => {
  const root = join(dir, 'content')
  const sheet = join(root, 'modsters', 'blobby', 'sprite.png')
  mkdirSync(join(sheet, '..'), { recursive: true })
  run('draw', writeJson('blobby.json', GRID), '--out', sheet)
  writeJson('content/modsters/blobby/modster.json', {
    schemaVersion: 1, id: 'blobby', name: 'Blobby', rarity: 'uncommon', sprite: { file: 'sprite.png', frames: 2 },
  })
  writeJson('content/biomes/test-meadow/biome.json', {
    schemaVersion: 1, id: 'test-meadow', name: 'Test Meadow', modsters: [{ id: 'blobby' }, { id: 'sproutling' }],
  })
  const clean = run('check', root)
  assert.equal(clean.code, 0, clean.stdout)
  const biomes = builtInCount('biomes') + 1
  const modsters = builtInCount('modsters') + 1
  assert.match(clean.stdout, new RegExp(`^${biomes} biomes and ${modsters} Modsters load; 0 errors, 0 warnings$`, 'm'))

  // Without the built-ins, sproutling is missing
  const alone = run('check', root, '--without-builtins')
  assert.equal(alone.code, 1)
  assert.match(alone.stdout, /content\/biomes\/test-meadow\/biome\.json: modsters\[1\]\.id names a Modster that doesn't exist: "sproutling"/)
  assert.match(alone.stdout, /1 biome and 1 Modster load; 1 error, 0 warnings/)

  assert.match(run('check', join(dir, 'nowhere')).stderr, /no content folder here yet/)
})
