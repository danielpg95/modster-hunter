import { describe, expect, test } from 'claude-code/testing'
import { decodePng, UnsupportedPngError } from '../../hooks/vendor/png'
import { bytesFromBase64 } from '../fixtures/bytes-from-base64'
import { encodePng } from '../fixtures/encode-png'
import { REAL_PNGS } from '../fixtures/real-pngs'

const LIMITS = { maxWidth: 192, maxHeight: 12 }

/** A 4×2 RGBA test card: every pixel differs, alpha included. */
const CARD = Array.from({ length: 4 * 2 * 4 }, (_, i) => (i * 37 + 11) & 0xff)

describe('decodePng', () => {
  for (const [name, sample] of Object.entries(REAL_PNGS)) {
    test(`${name} decodes to the same pixels as pngjs`, () => {
      const png = decodePng(bytesFromBase64(sample.png), LIMITS)
      expect([png.width, png.height]).toEqual([sample.width, sample.height])
      expect([...png.data]).toEqual([...bytesFromBase64(sample.rgba)])
    })
  }

  test('every row filter decodes, alone and mixed', () => {
    for (const filter of [0, 1, 2, 3, 4, [4, 3], [2, 1]]) {
      const png = decodePng(encodePng({ width: 4, height: 2, colorType: 6, bitDepth: 8, samples: CARD, filter }), LIMITS)
      expect([...png.data]).toEqual(CARD)
    }
  })

  test('RGB pixels get full alpha', () => {
    const png = decodePng(encodePng({ width: 2, height: 1, colorType: 2, bitDepth: 8, samples: [1, 2, 3, 4, 5, 6], filter: 1 }), LIMITS)
    expect([...png.data]).toEqual([1, 2, 3, 255, 4, 5, 6, 255])
  })

  test('palette PNGs at 1, 2, 4 and 8 bits unpack indexes high bits first, with tRNS alpha', () => {
    // 9 px wide, so rows end mid-byte at every depth below 8
    for (const bitDepth of [1, 2, 4, 8]) {
      const colors = Math.min(1 << bitDepth, 4)
      const samples = Array.from({ length: 18 }, (_, i) => (i * 3) % colors)
      const palette = [0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255].slice(0, colors * 3)
      const png = decodePng(encodePng({ width: 9, height: 2, colorType: 3, bitDepth, samples, palette, transparency: [0], filter: 2 }), LIMITS)
      const expected = samples.flatMap((index) => [palette[index * 3]!, palette[index * 3 + 1]!, palette[index * 3 + 2]!, index === 0 ? 0 : 255])
      expect([...png.data]).toEqual(expected)
    }
  })

  test('a sheet larger than the limits is refused before inflating', () => {
    // Broken image data: reaching the inflate would fail differently
    const png = encodePng({ width: 200, height: 8, colorType: 6, bitDepth: 8, samples: [], compress: () => Uint8Array.from([0, 0]) })
    expect(() => decodePng(png, LIMITS)).toThrow('PNG is 200×8 px; at most 192×12 fits')
  })

  // [variant, spec changes, message]
  const UNSUPPORTED: [string, Parameters<typeof encodePng>[0], string][] = [
    ['grayscale', { width: 2, height: 2, colorType: 0, bitDepth: 8, samples: [] }, '8-bit grayscale PNGs are not supported'],
    ['16-bit RGBA', { width: 2, height: 2, colorType: 6, bitDepth: 16, samples: [] }, '16-bit RGBA PNGs are not supported'],
    ['4-bit RGB', { width: 2, height: 2, colorType: 2, bitDepth: 4, samples: [] }, '4-bit RGB PNGs are not supported'],
    ['interlaced', { width: 2, height: 2, colorType: 6, bitDepth: 8, samples: [], interlace: 1 }, 'interlaced PNGs are not supported'],
  ]
  for (const [variant, spec, message] of UNSUPPORTED) {
    test(`a ${variant} PNG throws UnsupportedPngError: "${message}"`, () => {
      let caught: unknown
      try {
        decodePng(encodePng(spec), LIMITS)
      } catch (error) {
        caught = error
      }
      expect(caught instanceof UnsupportedPngError).toBe(true)
      expect((caught as Error).message).toBe(message)
    })
  }

  test('files that are not PNGs, or are broken, throw plain errors', () => {
    const good = encodePng({ width: 4, height: 2, colorType: 6, bitDepth: 8, samples: CARD })
    const broken: [Uint8Array, RegExp][] = [
      [new TextEncoder().encode('GIF89a not a png'), /not a PNG file/],
      [good.subarray(0, 20), /cut short/],
      [good.subarray(0, good.length - 30), /cut short|no image data|unexpected end/],
      [encodePng({ width: 2, height: 1, colorType: 3, bitDepth: 8, samples: [0, 1] }), /no PLTE chunk/],
      [encodePng({ width: 2, height: 1, colorType: 3, bitDepth: 8, samples: [0, 5], palette: [1, 2, 3] }), /palette entry 5/],
    ]
    for (const [bytes, message] of broken) {
      let caught: unknown
      try {
        decodePng(bytes, LIMITS)
      } catch (error) {
        caught = error
      }
      expect(caught instanceof UnsupportedPngError).toBe(false)
      expect(String(caught)).toMatch(message)
    }
  })

  test('a row with an unknown filter type throws', () => {
    const png = encodePng({ width: 4, height: 2, colorType: 6, bitDepth: 8, samples: CARD, filter: [0, 7] })
    expect(() => decodePng(png, LIMITS)).toThrow('PNG row 1 has unknown filter 7')
  })
})
