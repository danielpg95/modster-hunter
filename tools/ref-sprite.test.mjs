// Tests for tools/ref-sprite.mjs: run with `npm run test:tools`.
// Each test paints a small synthetic "reference" (a dark-outlined creature on a
// light background) and checks the cut-out, palette, shrink and grid round trip.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import pngjs from 'pngjs'
import { cutout, buildPalette, keepLargest, refSprite, toGrid, fromGrid, toPng } from './ref-sprite.mjs'

const TOOL = new URL('./ref-sprite.mjs', import.meta.url).pathname
const dir = mkdtempSync(join(tmpdir(), 'ref-sprite-test-'))

const BG = [216, 232, 240], INK = [16, 16, 16], RED = [192, 48, 48], BLUE = [40, 90, 220]

/** A 60×40 reference: a red disc with a dark outline and a blue eye on a light background. */
function reference({ speck = false, touchTop = false } = {}) {
  const png = new pngjs.PNG({ width: 60, height: 40 })
  for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) {
    const d = Math.hypot(x + 0.5 - 30, y + 0.5 - 20)
    let c = BG
    if (d <= 12) c = d > 10 ? INK : RED
    if (x >= 32 && x <= 35 && y >= 15 && y <= 18) c = BLUE
    if (speck && x >= 2 && x <= 5 && y >= 2 && y <= 5) c = x === 2 || x === 5 || y === 2 || y === 5 ? INK : RED
    // a red bar running off the top edge, outlined on its sides only
    if (touchTop && x >= 28 && x <= 32 && y <= 8) c = x === 28 || x === 32 ? INK : RED
    png.data.set([...c, 255], (y * 60 + x) * 4)
  }
  return png
}
const FULL = { x: 0, y: 0, w: 60, h: 40 }

test('cutout: background outside the outline, subject inside', () => {
  const bg = cutout(reference(), FULL)
  assert.equal(bg[0], 1, 'top-left corner is background')
  assert.equal(bg[20 * 60 + 30], 0, 'centre of the disc is subject')
  assert.equal(bg[16 * 60 + 33], 0, 'the eye is subject')
})

test('cutout: an edge left out of --edges keeps a subject that touches it', () => {
  const withTop = cutout(reference({ touchTop: true }), FULL)
  const noTop = cutout(reference({ touchTop: true }), FULL, { edges: ['left', 'right', 'bottom'] })
  assert.equal(withTop[30], 1, 'seeding the top edge floods into the bar')
  assert.equal(noTop[30], 0, 'without the top edge the bar stays')
})

test('buildPalette: at most the asked count, and distinct colors survive', () => {
  const colors = [...Array(50).fill(RED), ...Array(50).fill(INK), ...Array(5).fill(BLUE)]
  const palette = buildPalette(colors, 3)
  assert.equal(palette.length, 3)
  for (const c of [RED, INK, BLUE]) assert.ok(palette.some((p) => p.every((v, i) => Math.abs(v - c[i]) <= 1)))
  assert.equal(buildPalette(Array(10).fill(RED), 5).length, 1, 'one color in, one out')
})

test('refSprite: target size, transparent corners, outline and eye kept, palette capped', () => {
  const { image, palette } = refSprite(reference(), { crop: FULL, size: { w: 30, h: 20 }, colors: 4 })
  assert.equal(image.width, 30)
  assert.equal(image.height, 20)
  assert.ok(palette.length <= 4)
  assert.equal(image.pixels[0], -1, 'corner is transparent')
  const at = (x, y) => palette[image.pixels[y * 30 + x]]
  assert.deepEqual(at(15, 10).map((v) => Math.round(v / 16)), RED.map((v) => Math.round(v / 16)), 'centre is red')
  assert.ok(image.pixels.some((p) => p >= 0 && palette[p][2] > 150), 'the blue eye survives the shrink')
  assert.ok(image.pixels.some((p) => p >= 0 && palette[p][0] < 40), 'the dark outline survives the shrink')
})

test('keepLargest: a stray outlined speck is dropped', () => {
  const kept = refSprite(reference({ speck: true }), { crop: FULL, size: { w: 30, h: 20 }, colors: 4 })
  assert.equal(kept.image.pixels[1 * 30 + 1], -1, 'the speck in the corner is gone')
  const image = { width: 3, height: 1, pixels: Int16Array.from([0, -1, 0]) }
  keepLargest(image)
  assert.equal([...image.pixels].filter((p) => p >= 0).length, 1)
})

test('grid: round trip, and unknown letters are refused', () => {
  const result = refSprite(reference(), { crop: FULL, size: { w: 30, h: 20 }, colors: 4 })
  const back = fromGrid(toGrid(result))
  assert.deepEqual([...back.image.pixels], [...result.image.pixels])
  assert.deepEqual(back.palette, result.palette)
  assert.throws(() => fromGrid('a #ff0000\n\naz\n'), /"z" is not in the palette/)
  assert.throws(() => fromGrid('a red\n\na\n'), /bad palette line/)
})

test('cli: writes the base PNG and grid; --from-grid turns an edited grid back into a PNG', () => {
  const ref = join(dir, 'ref.png')
  writeFileSync(ref, pngjs.PNG.sync.write(reference()))
  const out = join(dir, 'base.png')
  const run = spawnSync(process.execPath, [TOOL, ref, '--crop', '0,0,60,40', '--size', '30x20', '--colors', '6', '--out', out, '--grid'], { encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout, /30×20/)
  const grid = join(dir, 'base.grid.txt')
  assert.ok(existsSync(grid))
  const png = pngjs.PNG.sync.read(readFileSync(out))
  assert.equal(png.width, 30)
  // hand edit: clear the whole first row of the subject, then rebuild
  const edited = readFileSync(grid, 'utf8').replace(/\n\n([^\n]*)/, (m, row) => '\n\n' + '.'.repeat(row.length))
  writeFileSync(grid, edited)
  const back = spawnSync(process.execPath, [TOOL, '--from-grid', grid, '--out', join(dir, 'edited.png')], { encoding: 'utf8' })
  assert.equal(back.status, 0, back.stderr)
  assert.equal(pngjs.PNG.sync.read(readFileSync(join(dir, 'edited.png'))).height, 20)
})

test('cli: bad arguments print the usage and exit 2', () => {
  const run = spawnSync(process.execPath, [TOOL, 'x.png'], { encoding: 'utf8' })
  assert.equal(run.status, 2)
  assert.match(run.stderr, /usage: ref-sprite/)
  const ref = join(dir, 'small.png')
  writeFileSync(ref, pngjs.PNG.sync.write(reference()))
  const past = spawnSync(process.execPath, [TOOL, ref, '--crop', '0,0,100,40', '--size', '10x10'], { encoding: 'utf8' })
  assert.equal(past.status, 2)
  assert.match(past.stderr, /goes past/)
})

test('toPng: transparent where the image is empty', () => {
  const png = pngjs.PNG.sync.read(toPng({ image: { width: 2, height: 1, pixels: Int16Array.from([0, -1]) }, palette: [[1, 2, 3]] }))
  assert.deepEqual([...png.data.slice(0, 8)], [1, 2, 3, 255, 0, 0, 0, 0])
})
