// Shapes of the content files in docs/CONTENT_FORMAT.md (schema version 1).
// A value of these types has passed its validator; fields keep the file's own
// shape, and defaults (e.g. `encounterEverySec`) are applied by the code that reads them.

import type { CONTENT, MODSTER_TYPES } from '../constants'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

/** One of the keys of `MODSTER_TYPES` (decision 0017) */
export type ModsterType = keyof typeof MODSTER_TYPES

/** The dex entry (decision 0017). Every field is optional; built-in content fills them all. */
export interface ModsterDex {
  /** Built-in content only; a user override keeps the built-in's number */
  number?: number
  /** One or two types; the first is the primary one (decision 0022) */
  types?: ModsterType[]
  category?: string
  heightM?: number
  weightKg?: number
  entry?: string
}

export interface BiomeModsterEntry {
  id: string
  /** Wins over the Modster's own `rarity` (decision 0030 point 3) */
  rarity?: Rarity
  maxAttempts?: number
  catchRate?: number
}

/** How a biome's idle-scene particles move (decision 0026 point 3) */
export type ParticleStyle = (typeof CONTENT.biome.particleStyles)[number]

export interface BiomeParticles {
  style: ParticleStyle
  /** Default: the biome's `accentColor`, else white */
  color?: string
  density?: number
}

export interface Biome {
  schemaVersion: 1
  id: string
  name: string
  description?: string
  accentColor?: string
  /** 1–4 frames; tiled across the band between encounters (decision 0026) */
  background?: string
  backgroundFps?: number
  /** Hi-res idle scene for the Desktop app, played at `backgroundFps` (decision 0045 point 4) */
  desktopBackground?: { file: string; frames: number }
  particles?: BiomeParticles
  encounterEverySec?: [number, number]
  modsters: BiomeModsterEntry[]
}

export interface Modster {
  schemaVersion: 1
  id: string
  name: string
  description?: string
  rarity: Rarity
  maxAttempts?: number | null
  catchRate?: number | null
  shinyChance?: number | null
  dex?: ModsterDex
  /** `file` is a `.png` only in user content, and then `frames` is set (decision 0016). Optional with a `desktopSprite` (0045 point 2) */
  sprite?: { file: string; frames?: number; fps?: number }
  /** Hi-res art for the Desktop app (decision 0045 point 3) */
  desktopSprite?: { file: string; frames: number; fps?: number }
}

/** Desktop art that passed decision 0045's checks, kept as-is for embedding (point 9). */
export interface DesktopSheet {
  /** The PNG file, base64 */
  png: string
  /** One frame's size in pixels; the sheet is `width × frames` wide */
  width: number
  height: number
  frames: number
  /** Its opaque colours as `#rrggbb`, at most 64 */
  colors: string[]
}

export interface Sprite {
  schemaVersion: 1
  width: number
  height: number
  /** `#rrggbbaa` colors; frames index into this */
  palette: string[]
  shinyPalette?: string[]
  /** base64 of width × height palette indexes, one byte each, row by row */
  frames: string[]
}

export type CatcherStyle = (typeof CONTENT.catcher.styles)[number]
export type CatcherBeatName = (typeof CONTENT.catcher.beats)[number]
export type CatcherPlace = (typeof CONTENT.catcher.places)[number]
export type CatcherModsterAction = (typeof CONTENT.catcher.modsterActions)[number]
export type CatcherPath = (typeof CONTENT.catcher.paths)[number]

/** One beat of a throw as the file gives it; missing fields come from the style's preset (decision 0035 point 4). */
export interface CatcherBeat {
  /** Sprite frame indexes, played evenly over the beat */
  frames?: number[]
  place?: CatcherPlace
  modster?: CatcherModsterAction
  /** `throw` only */
  path?: CatcherPath
}

/** A throw animation (decision 0035). Frame 0 of its sprite is the closed catcher. */
export interface Catcher {
  schemaVersion: 1
  id: string
  name: string
  description?: string
  style: CatcherStyle
  /** As a Modster's, without `fps`: beat lengths are fixed (0035 point 5). Optional with a `desktopSprite` (0045 point 2) */
  sprite?: { file: string; frames?: number }
  beats?: Partial<Record<CatcherBeatName, CatcherBeat>>
  glowIndex?: number
  rimIndex?: number
  lidRows?: number
  /** Hi-res art for the Desktop app; colours stand in for palette indexes (decision 0045 point 5) */
  desktopSprite?: { file: string; frames: number; glowColor?: string; rimColor?: string; lidRows?: number }
}

/** User `settings.json` (user folder only). */
export interface UserSettings {
  schemaVersion: 1
  disabledBiomes?: string[]
  disabledModsters?: string[]
}

/**
 * One problem found in a content file. An `error` drops what it names (the
 * whole file, or one biome entry for a missing Modster); a `warning` is
 * reported but the content still loads.
 */
export interface ContentIssue {
  severity: 'error' | 'warning'
  /** The file's path as the loader names it, e.g. `modsters/sproutling/modster.json` */
  file: string
  /** Path to the field, e.g. `modsters[2].rarity`; empty for the file as a whole */
  field: string
  problem: string
}

/** A validator's answer: never thrown, always a list of issues (possibly empty). */
export type Validation<T> =
  | { ok: true; value: T; issues: ContentIssue[] }
  | { ok: false; issues: ContentIssue[] }
