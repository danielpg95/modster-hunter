// Tunable numbers, in one place. Each group names the decision or doc it comes from.

/**
 * Rarity tiers, decision 0004 point 1, checked in this order. A Modster whose
 * share of its biome's total weight is at least `minPercent` gets the tier;
 * the defaults apply unless the biome entry or the Modster overrides them.
 */
export const TIERS = [
  { tier: 'common', minPercent: 20, maxAttempts: 3, catchRate: 0.5 },
  { tier: 'uncommon', minPercent: 5, maxAttempts: 3, catchRate: 0.35 },
  { tier: 'rare', minPercent: 1, maxAttempts: 4, catchRate: 0.2 },
  { tier: 'legendary', minPercent: 0, maxAttempts: 5, catchRate: 0.08 },
] as const

/** Encounter phase lengths, decision 0014. The idle timeout is the `encounterIdleTimeoutSec` user option. */
export const ENCOUNTER = {
  appearingMs: 1000,
  throwingMs: 1500,
  resultMs: 4000,
} as const

/** Content file bounds: docs/CONTENT_FORMAT.md (schema version 1), decisions 0004, 0007 and 0012. */
export const CONTENT = {
  schemaVersion: 1,
  idPattern: /^[a-z][a-z0-9-]{1,31}$/,
  /** A file name with no folder part, ending in `.sprite.json` (CONTENT_FORMAT "in this folder"). */
  spriteFilePattern: /^[^/\\]+\.sprite\.json$/,
  rgbColorPattern: /^#[0-9a-fA-F]{6}$/,
  rgbaColorPattern: /^#[0-9a-fA-F]{8}$/,
  descriptionMaxChars: 120,
  biome: {
    nameMaxChars: 32,
    encounterEverySecMin: 3,
    encounterEverySecMax: 600,
    defaultEncounterEverySec: [10, 30] as const,
    modstersMin: 1,
    modstersMax: 50,
    weightMin: 1,
    weightMax: 10_000,
  },
  modster: {
    // Has to fit in the band
    nameMaxChars: 24,
    fpsMin: 1,
    fpsMax: 12,
    defaultFps: 6,
  },
  // Decision 0004 point 5
  maxAttemptsMin: 1,
  maxAttemptsMax: 10,
  catchRateMin: 0.01,
  catchRateMax: 1,
  sprite: {
    // Decision 0012 point 5: fits an 80×24 band with a row to spare
    widthMin: 8,
    widthMax: 24,
    heightMin: 8,
    heightMax: 12,
    paletteMin: 1,
    paletteMax: 64,
    framesMin: 1,
    framesMax: 8,
  },
} as const
