import { describe, expect, test } from 'claude-code/testing'
import { firstFrameSheet } from '../../hooks/render'
import { decodePng } from '../../hooks/vendor/png'
import { base64FromBytes } from '../fixtures/base64-from-bytes'
import { bytesFromBase64 } from '../fixtures/bytes-from-base64'
import { desktopPng } from '../fixtures/desktop-png'
import { desktopSheetOf } from '../fixtures/desktop-sheet-of'

const LIMITS = { maxWidth: 512, maxHeight: 512 }

describe('firstFrameSheet (0061)', () => {
  test('cuts a sheet to frame 0, pixel for pixel, and keeps its size, bounds and colours', () => {
    // Frame 0 a red block, frame 1 a blue one elsewhere
    const png = desktopPng(16, 8, 3, (x, y) => {
      const frame = Math.floor(x / 16)
      const fx = x % 16
      if (frame === 0 && fx >= 2 && fx < 6 && y >= 1 && y < 5) return [255, 0, 0, 255]
      if (frame > 0 && fx >= 8 && y >= 3) return [0, 0, 255, 255]
      return undefined
    })
    const sheet = desktopSheetOf(16, 8, 3, { png: base64FromBytes(png), bounds: { x0: 2, y0: 1, x1: 15, y1: 7 } })
    const one = firstFrameSheet(sheet)
    expect(one.frames).toBe(1)
    expect([one.width, one.height, one.bounds, one.colors]).toEqual([16, 8, sheet.bounds, sheet.colors])
    const whole = decodePng(png, LIMITS)
    const cut = decodePng(bytesFromBase64(one.png), LIMITS)
    expect([cut.width, cut.height]).toEqual([16, 8])
    for (let y = 0; y < 8; y++) {
      expect([...cut.data.subarray(y * 16 * 4, (y + 1) * 16 * 4)]).toEqual([...whole.data.subarray(y * 48 * 4, (y * 48 + 16) * 4)])
    }
    expect(one.png.length).toBeLessThan(sheet.png.length / 3)
  })

  test('a one-frame sheet is already its first frame', () => {
    const sheet = desktopSheetOf(8, 8, 1)
    expect(firstFrameSheet(sheet)).toBe(sheet)
  })
})
