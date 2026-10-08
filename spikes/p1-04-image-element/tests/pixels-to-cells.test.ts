import { test, expect } from 'claude-code/testing'
import { DEFAULT_COLOR, pixelsToCells } from '../lib/pixels-to-cells'

const UPPER = 0x2580
const LOWER = 0x2584
const SPACE = 0x20

// Decodes the base64 back into [char, fg, bg] triples
function decode(cells: string): number[][] {
  const bytes = (Uint8Array as unknown as { fromBase64(s: string): Uint8Array }).fromBase64(cells)
  const words = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
  const out: number[][] = []
  for (let i = 0; i < words.length; i += 3) out.push([words[i]!, words[i + 1]!, words[i + 2]!])
  return out
}

const RED = [255, 0, 0, 255]
const BLUE = [0, 0, 255, 255]
const CLEAR = [0, 0, 0, 0]

test('two opaque pixels become one upper-half cell: top is fg, bottom is bg', () => {
  const cells = decode(pixelsToCells({ width: 1, height: 2, rgba: [...RED, ...BLUE] }))
  expect(cells).toEqual([[UPPER, 0xff0000, 0x0000ff]])
})

test('transparent bottom keeps the default background', () => {
  const cells = decode(pixelsToCells({ width: 1, height: 2, rgba: [...RED, ...CLEAR] }))
  expect(cells).toEqual([[UPPER, 0xff0000, DEFAULT_COLOR]])
})

test('transparent top uses a lower-half cell so the foreground is never the default', () => {
  const cells = decode(pixelsToCells({ width: 1, height: 2, rgba: [...CLEAR, ...BLUE] }))
  expect(cells).toEqual([[LOWER, 0x0000ff, DEFAULT_COLOR]])
})

test('two transparent pixels become a blank cell with default colors', () => {
  const cells = decode(pixelsToCells({ width: 1, height: 2, rgba: [...CLEAR, ...CLEAR] }))
  expect(cells).toEqual([[SPACE, DEFAULT_COLOR, DEFAULT_COLOR]])
})

test('an odd height pads the last row with transparency', () => {
  const cells = decode(pixelsToCells({ width: 1, height: 3, rgba: [...RED, ...RED, ...BLUE] }))
  expect(cells).toEqual([
    [UPPER, 0xff0000, 0xff0000],
    [UPPER, 0x0000ff, DEFAULT_COLOR],
  ])
})

test('cells are row-major: width × ceil(height / 2)', () => {
  const rgba = [...RED, ...BLUE, ...BLUE, ...RED]
  const cells = decode(pixelsToCells({ width: 2, height: 2, rgba }))
  expect(cells).toEqual([
    [UPPER, 0xff0000, 0x0000ff],
    [UPPER, 0x0000ff, 0xff0000],
  ])
})

test('alpha below 128 counts as transparent', () => {
  const faint = [255, 0, 0, 127]
  const cells = decode(pixelsToCells({ width: 1, height: 2, rgba: [...faint, ...BLUE] }))
  expect(cells).toEqual([[LOWER, 0x0000ff, DEFAULT_COLOR]])
})
