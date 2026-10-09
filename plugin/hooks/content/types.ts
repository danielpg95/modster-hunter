// Shapes of the content files in docs/CONTENT_FORMAT.md (schema version 1).
// A value of these types has passed its validator; fields keep the file's own
// shape, and defaults (e.g. `encounterEverySec`) are applied by the code that reads them.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface BiomeModsterEntry {
  id: string
  weight: number
  maxAttempts?: number
  catchRate?: number
}

export interface Biome {
  schemaVersion: 1
  id: string
  name: string
  description?: string
  accentColor?: string
  background?: string
  encounterEverySec?: [number, number]
  modsters: BiomeModsterEntry[]
}

export interface Modster {
  schemaVersion: 1
  id: string
  name: string
  description?: string
  rarity?: Rarity | null
  maxAttempts?: number | null
  catchRate?: number | null
  shinyChance?: number | null
  /** `file` is a `.png` only in user content, and then `frames` is set (decision 0016) */
  sprite: { file: string; frames?: number; fps?: number }
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
  /** Path to the field, e.g. `modsters[2].weight`; empty for the file as a whole */
  field: string
  problem: string
}

/** A validator's answer: never thrown, always a list of issues (possibly empty). */
export type Validation<T> =
  | { ok: true; value: T; issues: ContentIssue[] }
  | { ok: false; issues: ContentIssue[] }
