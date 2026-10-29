// Tunable numbers, in one place. Each group names the decision or doc it comes from.

/**
 * Rarity tiers, most common first. An encounter draws a tier by `weight`, the
 * same in every biome (decision 0030 point 2); the catch defaults apply unless
 * the biome entry or the Modster overrides them (decision 0004).
 */
export const TIERS = [
  { tier: 'common', weight: 76, maxAttempts: 3, catchRate: 0.5 },
  { tier: 'uncommon', weight: 19, maxAttempts: 3, catchRate: 0.35 },
  { tier: 'rare', weight: 4.5, maxAttempts: 4, catchRate: 0.2 },
  { tier: 'legendary', weight: 0.5, maxAttempts: 5, catchRate: 0.08 },
] as const

/**
 * Encounter phase lengths, decision 0014. A throw lasts as long as its catch
 * animation (decision 0035, `CATCH`). The idle timeout is the
 * `encounterIdleTimeoutSec` user option.
 */
export const ENCOUNTER = {
  appearingMs: 1000,
  resultMs: 4000,
  /** A subagent counts as work time for at most this long after its start, in case its stop event is lost (0018 point 3, `AGENT_WORK_MAX_MIN` = 30) */
  agentWorkMaxMs: 30 * 60 * 1000,
} as const

/**
 * The catch animation, decision 0035 point 5: beat lengths are the same for
 * every catcher. `caught` plays at the start of the result card. The rest
 * tune how frames made from a catcher's frame 0 move (CONTENT_FORMAT "Styles").
 */
export const CATCH = {
  fps: 12,
  beatMs: { throw: 350, take: 400, settle: 150, rock: 500, caught: 700, broken: 450 },
  /** A catch rocks this many times; a miss 1 to one fewer (0035 point 6) */
  rocksToCatch: 3,
  /** How far frame 0 tilts at the top of a rock */
  tiltRadians: 0.26,
  /** How far the lid rises while the Modster goes in */
  lidLiftPx: 4,
  /** A `shrink` (a cover catcher cinching) ends at this scale */
  shrinkScale: 0.65,
  /** How high a `hop-out` jumps */
  hopPx: 3,
  /** A `dim` Modster's colors are mixed this far toward black */
  dimAmount: 0.5,
  /** A `stretch` shape reaches this far past the Modster's outline, within its area */
  stretchMarginPx: 2,
  /** Past this share of a `stretch` shape's radius, `rimIndex` draws the edge */
  rimFrom: 0.82,
  /** A catch's sparkles: a white center that glints on dark terminals, deep gold arms that show on light ones */
  sparkleCore: '#ffffff',
  sparkleArms: '#e0a800',
  /** The Catchers tab's preview loops a catch, then holds still this long before the next */
  previewPauseMs: 800,
  /** Played when `prefs:catcher` is missing or names a catcher that didn't load (0035 point 10) */
  defaultCatcher: 'jar',
  /** `glowIndex` takes the Modster's most common color with summed RGB over this (half of full brightness) */
  glowMinBrightness: 384,
} as const

/**
 * The welcome toast (decision 0038 point 9) stays this long: it shows at session
 * start, when the person may be looking elsewhere, and the 4 s default went by
 * unread in the hand check. The pointer over it holds it; a click takes it off.
 */
export const WELCOME_TOAST_MS = 15_000

/** The Settings tab's option rows (decision 0040). */
export const SETTINGS = {
  /** What `o` steps the idle timeout through, wrapping (0040 point 2) */
  idleTimeoutChoicesSec: [30, 60, 90, 180, 300],
  /** Columns a row's label is padded to, so the values line up */
  labelColumns: 24,
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
 * Desktop Code tab (P5-06): sprites drawn as `Svg`, sized in CSS pixels per sprite pixel.
 * `rowPx` is an estimate of one band row, used to keep the band's sprite inside `maxRows`.
 */
export const DESKTOP = {
  paneScale: 4,
  bandScale: 2,
  rowPx: 20,
  /** An estimate of one desktop column, for the idle scene's width (0044 point 2); measured in P5-38 */
  columnPx: 8,
  /** A particle's sway is drawn from this many samples of one period of its sine (0044 point 4) */
  swaySamples: 16,
  /** The collection's Modster and the Catchers tab's preview (P5-38): a little under the pane's 4, to fit a narrow dock */
  collectionScale: 3,
  /** A throw's motion is sampled this often for its SMIL values, which blend between samples (0043 point 3) */
  catchSampleMs: 1000 / 24,
  /** The most an `Svg` source may hold; a bigger throw keeps the idle Svg and dots (0043 point 8) */
  svgMaxChars: 131072,
  // Desktop sheets (0045 point 9) are 4× finer than terminal sprites, so a quarter of the scales above
  sheetPaneScale: 1,
  sheetCollectionScale: 0.75,
  sheetBandScale: 0.5,
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
  /** P5-30's catcher list, as wide as the Collection tab's: `▸ Glass jar          ✓ in use`; names past this are cut */
  catcherNameColumns: 18,
  /** Rows the Catchers tab's text under or beside the preview takes: the description and the delete hint */
  catcherDetailRows: 4,
  /** P3-03's odds rows: `#001 Sproutling     40.0%  legendary ×3` */
  oddsColumns: 44,
  /** A biome list under nothing but the odds (a narrow dock) shows at most this many rows */
  biomeStackRows: 3,
  /** The selected biome's scene shows only when the list still gets this many rows (0028 point 3) */
  biomeSceneListRows: 3,
  /** P3-04's per-biome table: each count right-aligned in this many columns */
  statColumns: 7,
} as const

/** Stats compaction, decision 0029: a session's `stats:` key idle this long folds into `stats:total`. */
export const STATS = {
  compactAfterMs: 24 * 60 * 60 * 1000,
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
  // Decision 0035 points 2–4: a catcher's file and its beats
  catcher: {
    nameMaxChars: 32,
    styles: ['contain', 'cover', 'custom'],
    beats: ['throw', 'take', 'settle', 'rock', 'caught', 'broken'],
    places: ['over', 'behind', 'stretch'],
    modsterActions: ['visible', 'hidden', 'dim', 'shake', 'shrink-in', 'shrink', 'hop-out', 'pop-out'],
    paths: ['arc', 'drop', 'none'],
    widthMax: 32,
    heightMax: 32,
    framesMax: 16,
    beatFramesMax: 16,
    paletteIndexMin: 1,
    paletteIndexMax: 63,
    lidRowsMin: 1,
    lidRowsMax: 31,
  },
  // Decision 0045: desktop art, a PNG sheet embedded as-is, frames side by side
  desktop: {
    /** Opaque colours across all frames (point 6) */
    colorsMax: 64,
    modster: { widthMax: 128, heightMax: 128, framesMin: 2, framesMax: 8, bytesMax: 48 * 1024 },
    // 0045 sets no width: 192 is the terminal's 48 at the desktop's 4× finer pixels (point 9)
    background: { widthMax: 192, heightMax: 48, framesMin: 1, framesMax: 4, bytesMax: 24 * 1024 },
    catcher: { widthMax: 96, heightMax: 96, framesMin: 1, framesMax: 16, bytesMax: 24 * 1024, lidRowsMax: 95 },
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
