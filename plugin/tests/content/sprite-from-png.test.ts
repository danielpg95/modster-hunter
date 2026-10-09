import { describe, expect, test } from 'claude-code/testing'
import { formatIssue, spriteFromPng } from '../../hooks/content'
import { encodePng } from '../fixtures/encode-png'

const file = 'modsters/blobby/sprite.png'

/** A 4-bit palette sheet `width × 8`; index 1 (red) marks the first pixel of each 8 px frame. */
function sheet(width: number): Uint8Array {
  const samples = Array.from({ length: width * 8 }, (_, i) => (i < width && i % 8 === 0 ? 1 : 0))
  return encodePng({ width, height: 8, colorType: 3, bitDepth: 4, samples, palette: [0, 0, 0, 255, 0, 0], transparency: [0] })
}

describe('spriteFromPng', () => {
  test('a 4-bit palette sheet becomes a valid two-frame sprite', () => {
    const result = spriteFromPng(sheet(16), 2, file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect([result.value.width, result.value.height, result.value.frames.length]).toEqual([8, 8, 2])
    expect(result.value.palette).toEqual(['#00000000', '#ff0000ff'])
  })

  test('an unsupported PNG is one error that points to tools/sprite.mjs', () => {
    const png = encodePng({ width: 16, height: 8, colorType: 0, bitDepth: 8, samples: [] })
    const result = spriteFromPng(png, 2, file)
    expect(result.ok).toBe(false)
    expect(result.issues.map(formatIssue)).toEqual([
      `${file} can't be read as a sprite sheet: 8-bit grayscale PNGs are not supported; convert it with tools/sprite.mjs, which reads every PNG`,
    ])
  })

  test('a sheet wider than its frames allow is refused before decoding', () => {
    const result = spriteFromPng(sheet(32), 1, file)
    expect(result.issues.map(formatIssue)).toEqual([`${file} can't be read as a sprite sheet: PNG is 32×8 px; at most 24×12 fits`])
  })

  test('a broken file is an error, never a throw', () => {
    const result = spriteFromPng(Uint8Array.from([1, 2, 3]), 2, file)
    expect(result.ok).toBe(false)
    expect(result.issues[0]?.problem).toBe("can't be read as a sprite sheet: not a PNG file")
  })

  test('the sheet rules of spriteFromSheet still apply', () => {
    // 16 px doesn't split into 3 equal frames
    const result = spriteFromPng(sheet(16), 3, file)
    expect(result.ok).toBe(false)
    expect(result.issues[0]?.field).toBe('frames')
  })
})
