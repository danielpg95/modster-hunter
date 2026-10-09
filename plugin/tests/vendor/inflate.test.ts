import { describe, expect, test } from 'claude-code/testing'
import { inflate } from '../../hooks/vendor/inflate'
import { bytesFromBase64 } from '../fixtures/bytes-from-base64'
import { ZLIB_SAMPLES } from '../fixtures/zlib-samples'

const text = (bytes: Uint8Array): string => String.fromCharCode(...bytes)

describe('inflate', () => {
  test('a stored block comes back as is', () => {
    expect(text(inflate(bytesFromBase64(ZLIB_SAMPLES.stored.zlib), 1000))).toBe(ZLIB_SAMPLES.stored.text)
  })

  test('a fixed Huffman block decodes', () => {
    expect(text(inflate(bytesFromBase64(ZLIB_SAMPLES.fixed.zlib), 1000))).toBe(ZLIB_SAMPLES.fixed.text)
  })

  test('a dynamic Huffman block with back-references decodes', () => {
    const { zlib, text: expected } = ZLIB_SAMPLES.dynamic
    expect(text(inflate(bytesFromBase64(zlib), 10_000))).toBe(expected)
  })

  test('output past maxBytes throws instead of growing', () => {
    const { zlib, text: expected } = ZLIB_SAMPLES.dynamic
    expect(() => inflate(bytesFromBase64(zlib), expected.length - 1)).toThrow(/expands past/)
  })

  test('data that is not zlib throws a readable error', () => {
    expect(() => inflate(Uint8Array.from([1, 2, 3, 4]), 100)).toThrow('inflate: not zlib data')
  })

  test('cut-short data throws, never loops or reads past the end', () => {
    const zlib = bytesFromBase64(ZLIB_SAMPLES.dynamic.zlib)
    for (const length of [3, 10, zlib.length / 2]) {
      expect(() => inflate(zlib.subarray(0, Math.floor(length)), 10_000)).toThrow()
    }
  })

  test('a corrupt stored block length throws', () => {
    const zlib = bytesFromBase64(ZLIB_SAMPLES.stored.zlib)
    zlib[5] = zlib[5]! ^ 0xff
    expect(() => inflate(zlib, 1000)).toThrow(/stored block length/)
  })
})
