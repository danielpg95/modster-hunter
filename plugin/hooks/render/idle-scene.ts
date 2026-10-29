import { DESKTOP, SCENE } from '../constants'
import type { Biome, DesktopSheet, ParticleStyle, Sprite } from '../content'
import type { RandomSource } from '../game'
import { pixelsToCells } from './pixels-to-cells'
import { rgbaOf, spriteRgba } from './sprite-cells'

// The biome idle scene between encounters (decision 0026): the background tiled
// across the band, with particles stamped on as single pixels. A Raster can't
// hold text on top, so particles have to be part of its cells.

export interface IdleScene {
  /** Terminal rows the strip takes */
  rows: number
  /** The background's frames as RGBA; absent for a particle-only strip */
  art?: { width: number; height: number; frames: Uint8Array[] }
  /** A desktop background instead (decision 0045 point 4), drawn by `sceneSvg` only */
  sheet?: DesktopSheet
  /** The biome's particle art on desktop (decision 0046), drawn by `sceneSvg` only */
  particleSheet?: DesktopSheet
  particles?: { style: ParticleStyle; rgb: number[]; density: number }
  /** Background frames per second */
  artFps: number
  /** How often the strip is redrawn while it moves: the faster of the art and the particles (0026 point 5) */
  timerFps: number
}

/** A particle's start as fractions of the strip, so it survives a resize; `phase` offsets its sway and twinkle. */
export interface Particle {
  x: number
  y: number
  phase: number
}

/** The scene a biome draws between encounters, or undefined when it has neither art nor particles. */
export function idleScene(biome: Pick<Biome, 'accentColor' | 'backgroundFps' | 'particles'>, background?: Sprite): IdleScene | undefined {
  if (!background && !biome.particles) return undefined
  const artFps = biome.backgroundFps ?? SCENE.defaultFps
  const animatedArt = background !== undefined && background.frames.length > 1
  const particles = biome.particles && {
    style: biome.particles.style,
    rgb: rgbaOf(biome.particles.color ?? biome.accentColor ?? SCENE.defaultParticleColor).slice(0, 3),
    density: biome.particles.density ?? SCENE.defaultDensity,
  }
  return {
    rows: background ? Math.ceil(background.height / 2) : SCENE.particleOnlyRows,
    ...(background ? { art: { width: background.width, height: background.height, frames: spriteRgba(background) } } : {}),
    ...(particles ? { particles } : {}),
    artFps,
    timerFps: Math.max(animatedArt ? artFps : 0, particles ? SCENE.particleFps : 0),
  }
}

/**
 * The scene the desktop draws for a biome with a `desktopBackground` (decision 0045 points 4
 * and 9): the sheet in place of the terminal background, a quarter of its pixels per strip
 * pixel, with the biome's particles. Its frames step by SMIL, so only particles need a timer.
 */
export function desktopIdleScene(biome: Pick<Biome, 'accentColor' | 'backgroundFps' | 'particles'>, sheet: DesktopSheet): IdleScene {
  const base = idleScene(biome)
  const particles = base?.particles
  return {
    rows: Math.ceil(sheet.height / DESKTOP.sheetPixels / 2),
    sheet,
    ...(particles ? { particles } : {}),
    artFps: biome.backgroundFps ?? SCENE.defaultFps,
    timerFps: particles ? SCENE.particleFps : 0,
  }
}

/** Whether the strip changes over time at all; a still one needs no timer. */
export function isAnimated(scene: IdleScene): boolean {
  return scene.timerFps > 0
}

/** Particles for a strip `columns` wide, drawn from `random`: three numbers each. */
export function makeParticles(scene: IdleScene, columns: number, random: RandomSource): Particle[] {
  if (!scene.particles) return []
  const pixels = Math.max(0, columns) * scene.rows * 2
  const count = Math.max(1, Math.round((scene.particles.density * pixels) / SCENE.pixelsPerParticle))
  return Array.from({ length: count }, () => ({ x: random(), y: random(), phase: random() }))
}

/** The background frame shown at `tick` (ticks run at `timerFps`). */
export function artFrame(scene: IdleScene, tick: number): number {
  const frames = scene.art?.frames.length ?? 0
  if (frames < 2 || scene.timerFps === 0) return 0
  return Math.floor((tick * scene.artFps) / scene.timerFps) % frames
}

/** Where a particle is at `tick`, in whole pixels of a `width` × `height` strip; undefined while a sparkle is dark. */
export function particlePixel(
  particle: Particle,
  style: ParticleStyle,
  tick: number,
  width: number,
  height: number,
): { x: number; y: number } | undefined {
  if (width <= 0 || height <= 0) return undefined
  if (style === 'sparkle') {
    const { on, period } = SCENE.sparkleTicks
    if ((tick + Math.floor(particle.phase * period)) % period >= on) return undefined
  }
  const motion = SCENE.motion[style]
  const sway = motion.sway * Math.sin(tick / 4 + particle.phase * 2 * Math.PI)
  const x = particle.x * width + motion.dx * tick + sway
  const y = particle.y * height + motion.dy * tick
  return { x: wrap(Math.floor(x), width), y: wrap(Math.floor(y), height) }
}

/** The strip's Raster cells at `tick`: `columns` × `scene.rows` cells. A still strip passes `frame` 0 (0026 point 5). */
export function sceneCells(scene: IdleScene, columns: number, particles: readonly Particle[], tick: number, frame = artFrame(scene, tick)): string {
  const width = Math.max(0, columns)
  const height = scene.rows * 2
  const rgba = new Uint8Array(width * height * 4)

  const art = scene.art
  const pixels = art?.frames[frame]
  if (art && pixels) {
    // Tiled left to right, cut at the right edge (0026 point 2)
    for (let y = 0; y < Math.min(art.height, height); y++) {
      for (let x = 0; x < width; x++) {
        const from = (y * art.width + (x % art.width)) * 4
        rgba.set(pixels.subarray(from, from + 4), (y * width + x) * 4)
      }
    }
  }

  if (scene.particles) {
    const [r = 255, g = 255, b = 255] = scene.particles.rgb
    for (const particle of particles) {
      const at = particlePixel(particle, scene.particles.style, tick, width, height)
      if (at) rgba.set([r, g, b, 255], (at.y * width + at.x) * 4)
    }
  }

  return pixelsToCells({ width, height, rgba })
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size
}
