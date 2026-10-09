import { describe, expect, test } from 'claude-code/testing'
import { DEFAULT_COLOR, spriteCells } from '../../hooks/render'
import type { Sprite } from '../../hooks/content'
import { encodeFrame } from '../fixtures/encode-frame'

const UPPER = 0x2580

function decode(cells: string): number[][] {
  const bytes = Uint8Array.from(atob(cells), (char) => char.charCodeAt(0))
  const words = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
  const out: number[][] = []
  for (let i = 0; i < words.length; i += 3) out.push([words[i] ?? 0, words[i + 1] ?? 0, words[i + 2] ?? 0])
  return out
}

// 8×8: frame 0 has red over green in the top-left column, frame 1 is blank
const sprite: Sprite = {
  schemaVersion: 1,
  width: 8,
  height: 8,
  palette: ['#00000000', '#ff0000ff', '#00ff00ff'],
  frames: [encodeFrame([1, ...new Array<number>(7).fill(0), 2, ...new Array<number>(55).fill(0)]), encodeFrame(new Array<number>(64).fill(0))],
}

describe('spriteCells', () => {
  test('one cells string per frame, width × height/2 cells each', () => {
    const cells = spriteCells(sprite)
    expect(cells.length).toBe(2)
    expect(decode(cells[0] ?? '').length).toBe(8 * 4)
  })

  test('palette colors land in half-block cells; index 0 shows the terminal background', () => {
    const [first] = spriteCells(sprite)
    const cells = decode(first ?? '')
    expect(cells[0]).toEqual([UPPER, 0xff0000, 0x00ff00])
    expect(cells[1]).toEqual([0x20, DEFAULT_COLOR, DEFAULT_COLOR])
  })

  test('another palette (shiny, P5-01) recolors the same frames', () => {
    const [first] = spriteCells(sprite, ['#00000000', '#0000ffff', '#ffffffff'])
    expect(decode(first ?? '')[0]).toEqual([UPPER, 0x0000ff, 0xffffff])
  })
})
