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
  /** A subagent counts as work time for at most this long after its start, in case its stop event is lost (0018 point 3, `AGENT_WORK_MAX_MIN` = 30) */
  agentWorkMaxMs: 30 * 60 * 1000,
} as const

/** Band layout, decision 0012: the full layout needs sprite + gap + text block in the band's width. */
export const BAND = {
  gapColumns: 2,
  textColumns: 24,
  /** How often the encounter machine is stepped (timers resolve to within this) */
  tickMs: 250,
  /** After the name of a Modster already in the collection (P5-10) */
  caughtMark: '●',
} as const

/**
 * The biome idle scene, decision 0026. Particle speeds are pixels per tick at
 * `particleFps`; `sway` is how far a particle rocks sideways, in pixels.
 */
export const SCENE = {
  defaultFps: 2,
  defaultDensity: 2,
  defaultParticleColor: '#ffffff',
  particleFps: 8,
  /** The strip a biome with particles and no background gets (0026 point 4) */
  particleOnlyRows: 3,
  /** One particle per this many pixels at density 1 */
  pixelsPerParticle: 240,
  /** A sparkle shows for `on` ticks out of every `period` */
  sparkleTicks: { on: 3, period: 12 },
  motion: {
    sparkle: { dx: 0, dy: 0, sway: 0 },
    leaf: { dx: 0.4, dy: 0.2, sway: 1 },
    sand: { dx: 1.2, dy: 0.05, sway: 0 },
    bubble: { dx: 0, dy: -0.3, sway: 0.5 },
    snow: { dx: 0, dy: 0.25, sway: 1 },
  },
} as const

/** Where the game shows, decision 0023 point 1: the `userConfig` defaults and the pane picker's values. */
export const DISPLAY = {
  encounterPaneModes: ['off', 'when-opened', 'always'],
  defaults: {
    showInBand: true,
    encounterPane: 'when-opened',
    showInSpinner: true,
    showInStatusLine: true,
  },
} as const

/** The collection pane, decision 0002 and P3-01: its tab row is plain Buttons `1`–`4`, this far apart. */
export const COLLECTION = {
  tabGapColumns: 2,
  /** P3-02's list: `▸ #001 Sproutling      ×3 legendary`; names past `nameColumns` are cut */
  listColumns: 36,
  nameColumns: 14,
  /** Between the list and the detail, and between the sprite and the text beside it */
  gapColumns: 2,
  /** The detail's text needs this much room beside the list, else it goes under the list */
  detailMinColumns: 24,
  /** The detail's text always takes this many rows, so the layout holds still while scrolling; a long dex entry is cut */
  detailRows: 9,
  /** An uncaught Modster's still silhouette: one gray that reads on dark and light terminals */
  silhouetteColor: '#5a5a5a',
  /** P3-03's biome list: `▸ Whispering Forest 2/5 here`; names past `biomeNameColumns` are cut */
  biomeListColumns: 30,
  biomeNameColumns: 17,
  /** P3-03's odds rows: `#001 Sproutling     40.0%  legendary ×3` */
  oddsColumns: 44,
  /** A biome list under nothing but the odds (a narrow dock) shows at most this many rows */
  biomeStackRows: 3,
  /** The selected biome's scene shows only when the list still gets this many rows (0028 point 3) */
  biomeSceneListRows: 3,
} as const

/** Content file bounds: docs/CONTENT_FORMAT.md (schema version 1), decisions 0004, 0007 and 0012. */
export const CONTENT = {
  schemaVersion: 1,
  idPattern: /^[a-z][a-z0-9-]{1,31}$/,
  /** A file name with no folder part, ending in `.sprite.json` (CONTENT_FORMAT "in this folder"). */
  spriteFilePattern: /^[^/\\]+\.sprite\.json$/,
  /** A PNG sheet in the Modster's folder; user content only (decision 0016). */
  pngFilePattern: /^[^/\\]+\.png$/,
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
    // Decision 0026 points 1 and 3: the idle scene and its particles
    backgroundFramesMax: 4,
    backgroundFpsMin: 1,
    backgroundFpsMax: 12,
    particleStyles: ['sparkle', 'leaf', 'sand', 'bubble', 'snow'],
    particleDensityMin: 1,
    particleDensityMax: 5,
  },
  modster: {
    // Has to fit in the band
    nameMaxChars: 24,
    fpsMin: 1,
    fpsMax: 12,
    defaultFps: 6,
  },
  // Decision 0017 point 1
  dex: {
    numberMin: 1,
    numberMax: 999,
    categoryMaxChars: 24,
    heightMMin: 0.01,
    heightMMax: 100,
    weightKgMin: 0.01,
    weightKgMax: 10_000,
    entryMaxChars: 240,
    // Decision 0022: one or two types, the first one primary
    typesMin: 1,
    typesMax: 2,
  },
  // Decision 0004 point 5
  maxAttemptsMin: 1,
  maxAttemptsMax: 10,
  catchRateMin: 0.01,
  catchRateMax: 1,
  sprite: {
    // Decision 0021 (amends 0012 point 5). Where a sprite doesn't fit, the band and
    // the pane show the compact layout (0012 points 6–8)
    widthMin: 8,
    widthMax: 48,
    heightMin: 8,
    heightMax: 48,
    paletteMin: 1,
    paletteMax: 64,
    framesMin: 1,
    framesMax: 8,
  },
} as const

/** Modster types and their badge colors, decision 0017 point 2. Flavor only: no effect on odds. */
export const MODSTER_TYPES = {
  normal: '#9e9e8e',
  fire: '#f4511e',
  water: '#2196f3',
  grass: '#4caf50',
  electric: '#fdd835',
  steel: '#90a4ae',
  fighting: '#c62828',
  poison: '#9c27b0',
  ground: '#c49a5a',
  flying: '#90a4ff',
  ice: '#80deea',
  dark: '#6d5d4b',
  psychic: '#ec407a',
  bug: '#9ccc65',
  rock: '#a1887f',
  ghost: '#6a5acd',
  dragon: '#5c6bc0',
  fairy: '#f8a5c2',
} as const

/** Where user content and the decoded-PNG cache live, under the home folder (decisions 0007, 0016). */
export const USER_CONTENT = {
  contentFolder: '.claude/modster-hunter/content',
  spriteCacheFolder: '.claude/modster-hunter/cache/sprites',
  spriteCacheVersion: 1,
} as const
