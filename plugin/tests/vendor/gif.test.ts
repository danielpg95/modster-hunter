import { describe, expect, test } from 'claude-code/testing'
import { decodeGif } from '../../hooks/vendor/gif'
import { bytesFromBase64 } from '../fixtures/bytes-from-base64'
import { rawGif } from '../fixtures/raw-gif'
import { REAL_GIFS } from '../fixtures/real-gifs'

const LIMITS = { maxWidth: 64, maxHeight: 64, maxFrames: 8 }

// Codes clear, 1, 0, end at 3 bits: color 1 then color 0
const TWO_PIXELS = [0x0c, 0x0a]

describe('decodeGif', () => {
  for (const [name, sample] of Object.entries(REAL_GIFS)) {
    test(`${name} plays to the same frames as omggif`, () => {
      const gif = decodeGif(bytesFromBase64(sample.gif), LIMITS)
      expect([gif.width, gif.height]).toEqual([sample.width, sample.height])
      expect(gif.frames.map((frame) => [...frame])).toEqual(sample.frames.map((frame) => [...bytesFromBase64(frame)]))
    })
  }

  test('a small hand-built GIF decodes', () => {
    const gif = decodeGif(rawGif([{ data: TWO_PIXELS }]), LIMITS)
    expect(gif.frames.map((frame) => [...frame])).toEqual([[255, 0, 0, 255, 0, 0, 0, 255]])
  })

  test('a local color table replaces the global one for its frame', () => {
    const gif = decodeGif(rawGif([{ data: TWO_PIXELS, palette: true }]), LIMITS)
    expect([...gif.frames[0]!]).toEqual([0, 255, 0, 255, 0, 0, 255, 255])
  })

  test('a screen larger than the limits is refused', () => {
    expect(() => decodeGif(bytesFromBase64(REAL_GIFS.omgDisposal.gif), { ...LIMITS, maxWidth: 9 })).toThrow('GIF is 10×8 px; at most 9×64 fits')
  })

  test('too many frames are refused before any frame is decoded', () => {
    // Broken image data: decoding it would fail differently
    const frames = Array.from({ length: 9 }, () => ({ data: [0xff, 0xff] }))
    expect(() => decodeGif(rawGif(frames), LIMITS)).toThrow('GIF has 9 frames; at most 8 fit')
  })

  test('broken files throw', () => {
    const good = rawGif([{ data: TWO_PIXELS }])
    const broken: [Uint8Array, string][] = [
      [new TextEncoder().encode('\x89PNG not a gif'), 'not a GIF file'],
      [good.subarray(0, 20), 'GIF is cut short'],
      [rawGif([{ data: TWO_PIXELS }], { trailer: false }), 'GIF is cut short'],
      [rawGif([]), 'GIF has no frames'],
      [rawGif([{ data: TWO_PIXELS }], { palette: false }), 'GIF frame 1 has no color table'],
      [rawGif([{ data: TWO_PIXELS, minCodeSize: 0 }]), 'GIF frame 1 has a broken LZW code size 0'],
      // Codes clear, 1, then 7 (past the table): broken
      [rawGif([{ data: [0xcc, 0x01] }]), 'GIF frame 1 has broken image data'],
      // Codes clear, 1, end: one pixel of two
      [rawGif([{ data: [0x4c, 0x01] }]), 'GIF frame 1 image data is cut short'],
      [Uint8Array.from([...good.subarray(0, good.length - 1), 0x99, 0x3b]), 'GIF has an unknown block 0x99'],
    ]
    for (const [bytes, message] of broken) expect(() => decodeGif(bytes, LIMITS)).toThrow(message)
  })

  test('a pixel past the color table throws', () => {
    // Codes clear, 3, 0, end: color 3 of a 2-color table
    expect(() => decodeGif(rawGif([{ data: [0x1c, 0x0a] }]), LIMITS)).toThrow("GIF pixel uses color 3, past the color table's end")
  })
})
