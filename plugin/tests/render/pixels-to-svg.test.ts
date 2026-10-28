import { describe, expect, test } from 'claude-code/testing'
import { pixelsToSvg } from '../../hooks/render'

const RED = [255, 0, 0, 255]
const BLUE = [0, 0, 255, 255]
const CLEAR = [0, 0, 0, 0]

const paths = (svg: string) => svg.match(/<path [^>]*\/>/g) ?? []

describe('pixelsToSvg', () => {
  test('sizes the document by scale and keeps the sprite grid as the viewBox', () => {
    const svg = pixelsToSvg([{ width: 2, height: 2, rgba: [...RED, ...RED, ...RED, ...RED] }], { scale: 4, fps: 2 })
    expect(svg).toContain('width="8" height="8" viewBox="0 0 2 2"')
    expect(svg).toContain('shape-rendering="crispEdges"')
  })

  test('draws each run of a colour as one box in that colour\'s path, skipping transparent pixels', () => {
    const svg = pixelsToSvg([{ width: 4, height: 2, rgba: [...RED, ...RED, ...CLEAR, ...BLUE, ...CLEAR, ...RED, ...RED, ...RED] }], { scale: 1, fps: 2 })
    expect(paths(svg)).toEqual([
      '<path fill="#ff0000" d="M0 0h2v1h-2zM1 1h3v1h-3z"/>',
      '<path fill="#0000ff" d="M3 0h1v1h-1z"/>',
    ])
  })

  test('one frame has no animation', () => {
    const svg = pixelsToSvg([{ width: 1, height: 1, rgba: RED }], { scale: 1, fps: 2 })
    expect(svg).not.toContain('<animate')
  })

  test('several frames loop: each group is visible in its own slot of the cycle', () => {
    const svg = pixelsToSvg(
      [
        { width: 1, height: 1, rgba: RED },
        { width: 1, height: 1, rgba: BLUE },
      ],
      { scale: 1, fps: 2 },
    )
    const animates = svg.match(/<animate [^>]*\/>/g) ?? []
    expect(animates).toHaveLength(2)
    expect(animates[0]).toContain('values="visible;hidden"')
    expect(animates[1]).toContain('values="hidden;visible"')
    expect(animates[0]).toContain('keyTimes="0;0.5"')
    expect(animates[0]).toContain('dur="1s"')
    expect(animates[0]).toContain('repeatCount="indefinite"')
    expect(svg).toContain('<g visibility="visible">')
    expect(svg).toContain('<g visibility="hidden">')
  })
})
