import { describe, expect, test } from 'claude-code/testing'
import { decodePng } from '../../hooks/vendor/png'
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

  /** A sample scaled to 8 bits the way pngjs does it. */
  const to8 = (value: number, bitDepth: number) => Math.round((value * 255) / (2 ** bitDepth - 1))

  test('grayscale at 1, 2, 4, 8 and 16 bits stretches to 0–255 with full alpha', () => {
    for (const bitDepth of [1, 2, 4, 8, 16]) {
      const max = 2 ** bitDepth - 1
      // 9 px wide, so rows end mid-byte below 8 bits
      const samples = Array.from({ length: 18 }, (_, i) => (i * 5 + 1) % (max + 1))
      const png = decodePng(encodePng({ width: 9, height: 2, colorType: 0, bitDepth, samples, filter: 4 }), LIMITS)
      expect([...png.data]).toEqual(samples.flatMap((v) => [to8(v, bitDepth), to8(v, bitDepth), to8(v, bitDepth), 255]))
    }
  })

  test('a grayscale tRNS key clears matching pixels, compared before scaling', () => {
    // Key 0x0102: the 16-bit sample 0x0103 scales to the same byte but stays opaque
    const png = decodePng(
      encodePng({ width: 2, height: 1, colorType: 0, bitDepth: 16, samples: [0x0102, 0x0103], transparency: [0x01, 0x02] }),
      LIMITS,
    )
    expect([...png.data]).toEqual([0, 0, 0, 0, 1, 1, 1, 255])
  })

  test('grayscale-alpha at 8 and 16 bits', () => {
    const eight = decodePng(encodePng({ width: 2, height: 1, colorType: 4, bitDepth: 8, samples: [10, 0, 200, 255], filter: 1 }), LIMITS)
    expect([...eight.data]).toEqual([10, 10, 10, 0, 200, 200, 200, 255])
    const sixteen = decodePng(encodePng({ width: 1, height: 1, colorType: 4, bitDepth: 16, samples: [0x8000, 0xffff] }), LIMITS)
    expect([...sixteen.data]).toEqual([128, 128, 128, 255])
  })

  test('16-bit RGB and RGBA scale every channel', () => {
    const samples = [0x0000, 0x00ff, 0x8080, 0xffff, 0x7f00, 0x1234, 0xfedc, 0x0101]
    const rgba = decodePng(encodePng({ width: 2, height: 1, colorType: 6, bitDepth: 16, samples, filter: 3 }), LIMITS)
    expect([...rgba.data]).toEqual(samples.map((v) => to8(v, 16)))
    const rgb = decodePng(encodePng({ width: 2, height: 1, colorType: 2, bitDepth: 16, samples: samples.slice(0, 6), filter: 2 }), LIMITS)
    expect([...rgb.data]).toEqual([...samples.slice(0, 3).map((v) => to8(v, 16)), 255, ...samples.slice(3, 6).map((v) => to8(v, 16)), 255])
  })

  test('an RGB tRNS key clears only the exact color', () => {
    const png = decodePng(
      encodePng({ width: 3, height: 1, colorType: 2, bitDepth: 8, samples: [9, 8, 7, 9, 8, 6, 1, 2, 3], transparency: [0, 9, 0, 8, 0, 7] }),
      LIMITS,
    )
    expect([...png.data]).toEqual([0, 0, 0, 0, 9, 8, 6, 255, 1, 2, 3, 255])
  })

  test('interlaced PNGs decode to the same pixels as plain ones, at sizes that leave Adam7 passes empty', () => {
    const variants = [
      { colorType: 6, bitDepth: 8, channels: 4, max: 255 },
      { colorType: 3, bitDepth: 2, channels: 1, max: 3 },
      { colorType: 0, bitDepth: 16, channels: 1, max: 0xffff },
    ]
    for (const [width, height] of [[1, 1], [3, 5], [9, 9], [17, 10]] as const) {
      for (const { colorType, bitDepth, channels, max } of variants) {
        const samples = Array.from({ length: width * height * channels }, (_, i) => (i * 7919 + 13) % (max + 1))
        const palette = colorType === 3 ? [0, 0, 0, 80, 80, 80, 160, 160, 160, 240, 240, 240] : undefined
        const spec = { width, height, colorType, bitDepth, samples, palette, filter: [1, 4, 2, 3] }
        const plain = decodePng(encodePng(spec), LIMITS)
        const interlaced = decodePng(encodePng({ ...spec, interlace: 1 }), LIMITS)
        expect([interlaced.width, interlaced.height]).toEqual([width, height])
        expect([...interlaced.data]).toEqual([...plain.data])
      }
    }
  })

  // [problem, spec, message]
  const INVALID: [string, Parameters<typeof encodePng>[0], string][] = [
    ['4-bit RGB', { width: 2, height: 2, colorType: 2, bitDepth: 4, samples: [] }, "4-bit RGB isn't a valid PNG"],
    ['16-bit palette', { width: 2, height: 2, colorType: 3, bitDepth: 16, samples: [] }, "16-bit palette isn't a valid PNG"],
    ['color type 5', { width: 2, height: 2, colorType: 5, bitDepth: 8, samples: [] }, 'PNG has unknown color type 5'],
    ['interlace method 2', { width: 2, height: 2, colorType: 6, bitDepth: 8, samples: [], interlace: 2 }, 'PNG has unknown interlace method 2'],
  ]
  for (const [problem, spec, message] of INVALID) {
    test(`a PNG with ${problem} throws "${message}"`, () => {
      expect(() => decodePng(encodePng(spec), LIMITS)).toThrow(message)
    })
  }

  test('files that are not PNGs, or are broken, throw', () => {
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
      expect(String(caught)).toMatch(message)
    }
  })

  test('a row with an unknown filter type throws', () => {
    const png = encodePng({ width: 4, height: 2, colorType: 6, bitDepth: 8, samples: CARD, filter: [0, 7] })
    expect(() => decodePng(png, LIMITS)).toThrow('PNG row 1 has unknown filter 7')
  })
})
