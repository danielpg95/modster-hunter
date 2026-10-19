import { encodeFrame } from './encode-frame'

/**
 * Content files (for stubContentFs) of two catchers that fit the 8×8 fixture
 * sprite: `jar` (contain, 8×8, a red lid over a blue body) and `net` (cover, an
 * 8×8 tile of diagonal rope with a rim). 8 px is the smallest sprite. Add them to a forest's files to give throws a catcher.
 */
export function catcherFiles(): Record<string, string> {
  const jar = {
    schemaVersion: 1,
    width: 8,
    height: 8,
    palette: ['#00000000', '#ff0000ff', '#0000ffff'],
    frames: [encodeFrame(Array.from({ length: 64 }, (_, i) => (i < 16 ? 1 : 2)))],
  }
  const tile = {
    schemaVersion: 1,
    width: 8,
    height: 8,
    palette: ['#00000000', '#c9a46aff', '#6e4f2cff'],
    frames: [encodeFrame(Array.from({ length: 64 }, (_, i) => (i % 4 === Math.floor(i / 8) % 4 ? 1 : 0)))],
  }
  const catcher = (id: string, style: string, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ schemaVersion: 1, id, name: id, style, sprite: { file: 'sprite.sprite.json' }, ...extra })
  return {
    'catchers/jar/catcher.json': catcher('jar', 'contain', { lidRows: 2 }),
    'catchers/jar/sprite.sprite.json': JSON.stringify(jar),
    'catchers/net/catcher.json': catcher('net', 'cover', { rimIndex: 2 }),
    'catchers/net/sprite.sprite.json': JSON.stringify(tile),
  }
}
