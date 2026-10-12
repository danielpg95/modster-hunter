import { describe, expect, test } from 'claude-code/testing'
import type { Sprite } from '../../hooks/content'
import { DEFAULT_COLOR, artFrame, idleScene, isAnimated, makeParticles, particlePixel, sceneCells, type Particle } from '../../hooks/render'
import { encodeFrame } from '../fixtures/encode-frame'
import { scriptedRandom } from '../fixtures/scripted-random'

// Decodes the base64 back into [char, fg, bg] triples
function decode(cells: string): number[][] {
  const bytes = Uint8Array.from(atob(cells), (char) => char.charCodeAt(0))
  const words = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
  const out: number[][] = []
  for (let i = 0; i < words.length; i += 3) out.push([words[i]!, words[i + 1]!, words[i + 2]!])
  return out
}

/** An 8×`height` background: column x is red when x is 0, else green; one frame per entry of `shift`, rolled right by it. */
function background(height = 8, shifts = [0]): Sprite {
  return {
    schemaVersion: 1,
    width: 8,
    height,
    palette: ['#00000000', '#ff0000ff', '#00ff00ff'],
    frames: shifts.map((shift) => encodeFrame(Array.from({ length: 8 * height }, (_, i) => ((i % 8) - shift + 8) % 8 === 0 ? 1 : 2))),
  }
}

const RED = 0xff0000
const GREEN = 0x00ff00
const at = (x: number, y: number, phase = 0): Particle => ({ x, y, phase })

describe('idleScene', () => {
  test('a biome with neither a background nor particles has no scene', () => {
    expect(idleScene({})).toBeUndefined()
  })

  test('the strip is as tall as the background, or 3 rows of particles without one', () => {
    expect(idleScene({}, background(12))?.rows).toBe(6)
    expect(idleScene({ particles: { style: 'snow' } })?.rows).toBe(3)
    expect(idleScene({ particles: { style: 'snow' } }, background(8))?.rows).toBe(4)
  })

  test('particle color: its own, else the accent color, else white', () => {
    expect(idleScene({ accentColor: '#112233', particles: { style: 'leaf', color: '#445566' } })?.particles?.rgb).toEqual([0x44, 0x55, 0x66])
    expect(idleScene({ accentColor: '#112233', particles: { style: 'leaf' } })?.particles?.rgb).toEqual([0x11, 0x22, 0x33])
    expect(idleScene({ particles: { style: 'leaf' } })?.particles?.rgb).toEqual([255, 255, 255])
  })

  test('density defaults to 2', () => {
    expect(idleScene({ particles: { style: 'sand' } })?.particles?.density).toBe(2)
  })

  test('a still background needs no timer; frames and particles set its speed', () => {
    const still = idleScene({}, background())!
    expect(still.timerFps).toBe(0)
    expect(isAnimated(still)).toBe(false)
    expect(idleScene({ backgroundFps: 3 }, background(8, [0, 1]))?.timerFps).toBe(3)
    expect(idleScene({}, background(8, [0, 1]))?.timerFps).toBe(2)
    expect(idleScene({ particles: { style: 'snow' } })?.timerFps).toBe(8)
    expect(idleScene({ backgroundFps: 12, particles: { style: 'snow' } }, background(8, [0, 1]))?.timerFps).toBe(12)
  })

  test('frames advance at the art speed while the timer runs at the particle speed', () => {
    const scene = idleScene({ backgroundFps: 2, particles: { style: 'snow' } }, background(8, [0, 1]))!
    expect([0, 3, 4, 7, 8].map((tick) => artFrame(scene, tick))).toEqual([0, 0, 1, 1, 0])
  })

  test('a single frame is always frame 0', () => {
    const scene = idleScene({ particles: { style: 'snow' } }, background())!
    expect(artFrame(scene, 41)).toBe(0)
  })

  test('one particle per 240 pixels per density step, three random numbers each', () => {
    const scene = idleScene({ particles: { style: 'snow', density: 2 } })! // 3 rows: 120 × 6 pixels
    const random = scriptedRandom(...Array.from({ length: 18 }, (_, i) => i / 18))
    const particles = makeParticles(scene, 120, random)
    expect(particles.length).toBe(6)
    expect(random.remaining()).toBe(0)
    expect(particles[1]).toEqual({ x: 3 / 18, y: 4 / 18, phase: 5 / 18 })
  })

  test('always at least one particle, and none without particles', () => {
    const scene = idleScene({ particles: { style: 'snow', density: 1 } })!
    expect(makeParticles(scene, 2, scriptedRandom(0, 0, 0)).length).toBe(1)
    expect(makeParticles(idleScene({}, background())!, 120, scriptedRandom())).toEqual([])
  })

  test('sand blows right and wraps at the edge', () => {
    expect(particlePixel(at(0, 0), 'sand', 0, 10, 6)).toEqual({ x: 0, y: 0 })
    expect(particlePixel(at(0, 0), 'sand', 5, 10, 6)).toEqual({ x: 6, y: 0 })
    expect(particlePixel(at(0, 0), 'sand', 10, 10, 6)).toEqual({ x: 2, y: 0 })
  })

  test('snow and leaves fall, bubbles rise, and all wrap top to bottom', () => {
    expect(particlePixel(at(0.5, 0), 'snow', 8, 20, 6)?.y).toBe(2)
    expect(particlePixel(at(0.5, 0), 'leaf', 10, 20, 6)?.y).toBe(2)
    expect(particlePixel(at(0.5, 0), 'bubble', 10, 20, 6)?.y).toBe(3) // -3 wraps to 3
  })

  test('a sparkle stays put and shows 3 ticks out of 12', () => {
    const shown = Array.from({ length: 24 }, (_, tick) => particlePixel(at(0.25, 0.5), 'sparkle', tick, 8, 6))
    expect(shown.map((pixel) => pixel !== undefined).filter(Boolean).length).toBe(6)
    expect(shown[0]).toEqual({ x: 2, y: 3 })
    expect(shown[12]).toEqual({ x: 2, y: 3 })
    expect(shown[3]).toBeUndefined()
  })

  test('phase spreads sparkles out in time', () => {
    expect(particlePixel(at(0, 0, 0.5), 'sparkle', 0, 8, 6)).toBeUndefined()
    expect(particlePixel(at(0, 0, 0.5), 'sparkle', 6, 8, 6)).toEqual({ x: 0, y: 0 })
  })

  test('the same particle and tick always give the same pixel', () => {
    expect(particlePixel(at(0.3, 0.7, 0.2), 'leaf', 37, 50, 6)).toEqual(particlePixel(at(0.3, 0.7, 0.2), 'leaf', 37, 50, 6))
  })

  test('an empty strip has nowhere to draw', () => {
    expect(particlePixel(at(0, 0), 'snow', 0, 0, 6)).toBeUndefined()
  })

  test('the background tiles across the columns and is cut at the right edge', () => {
    const scene = idleScene({}, background(2))!
    const cells = decode(sceneCells(scene, 20, [], 0))
    expect(cells.length).toBe(20)
    expect(cells.map(([, fg]) => fg)).toEqual(Array.from({ length: 20 }, (_, x) => (x % 8 === 0 ? RED : GREEN)))
  })

  test('the frame changes with the tick', () => {
    const scene = idleScene({ backgroundFps: 2 }, background(2, [0, 1]))!
    expect(decode(sceneCells(scene, 8, [], 0))[0]?.[1]).toBe(RED)
    expect(decode(sceneCells(scene, 8, [], 1))[0]?.[1]).toBe(GREEN)
    expect(decode(sceneCells(scene, 8, [], 1))[1]?.[1]).toBe(RED)
  })

  test('particles are stamped on top in their color', () => {
    const scene = idleScene({ particles: { style: 'sand', color: '#0000ff' } })!
    const cells = decode(sceneCells(scene, 4, [at(0.5, 0)], 0))
    expect(cells.length).toBe(4 * 3)
    expect(cells[2]?.[1]).toBe(0x0000ff)
    expect(cells[0]).toEqual([0x20, DEFAULT_COLOR, DEFAULT_COLOR])
  })

  test('particles draw over the background', () => {
    const scene = idleScene({ particles: { style: 'sand', color: '#0000ff' } }, background(2))!
    const cells = decode(sceneCells(scene, 8, [at(0, 0)], 0))
    expect(cells[0]?.[1]).toBe(0x0000ff)
    expect(cells[1]?.[1]).toBe(GREEN)
  })

  test('zero columns draws nothing and never throws', () => {
    const scene = idleScene({ particles: { style: 'snow' } }, background())!
    expect(sceneCells(scene, 0, [at(0.5, 0.5)], 3)).toBe('')
  })
})
