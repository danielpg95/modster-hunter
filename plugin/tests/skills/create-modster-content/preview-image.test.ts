import { describe, expect, test } from 'claude-code/testing'
import type { Sprite } from '../../../hooks/content'
import { previewImage } from '../../../skills/create-modster-content/scripts/lib'

// 2×1 sprite, two frames: red then clear, clear then red
const sprite: Sprite = { schemaVersion: 1, width: 2, height: 1, palette: ['#00000000', '#ff0000ff'], frames: [btoa('\x01\x00'), btoa('\x00\x01')] }
const DARK = [0x1e, 0x1e, 0x1e, 0xff]
const LIGHT = [0xf5, 0xf5, 0xf5, 0xff]
const RED = [255, 0, 0, 255]

describe('previewImage', () => {
  test('frames are scaled and laid out on a dark and a light strip, with a one-pixel gap', () => {
    const image = previewImage(sprite, 2)
    // Width: 2 frames × (2 + 1 gap) × 2 + 2; height: 2 strips × (1 + 1 gap) × 2 + 2
    expect([image.width, image.height]).toEqual([14, 10])
    const at = (x: number, y: number) => [...Array.from(image.data).slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4)]
    expect(at(0, 0)).toEqual(DARK)
    expect(at(2, 2)).toEqual(RED) // frame 0, pixel 0, dark strip
    expect(at(4, 2)).toEqual(DARK) // frame 0, pixel 1 is clear
    expect(at(10, 3)).toEqual(RED) // frame 1, pixel 1
    expect(at(2, 6)).toEqual(RED) // frame 0 again, light strip
    expect(at(4, 6)).toEqual(LIGHT)
    expect(at(13, 9)).toEqual(LIGHT)
  })
})
