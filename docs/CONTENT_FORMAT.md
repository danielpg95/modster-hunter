# Content format

How biomes, Modsters and sprites are described on disk. This is the contract
between the game, the built-in content, user content, the editor and the
content skills. Rules come from decisions [0004](decisions/0004-attempts-and-catch-rate.md),
[0007](decisions/0007-content-model.md), [0016](decisions/0016-user-png-sprites.md),
[0017](decisions/0017-modster-dex-fields.md), [0025](decisions/0025-user-content-helper.md),
[0030](decisions/0030-tier-first-encounters.md) and [0035](decisions/0035-catchers.md).

> **Status:** schema version `1`, implemented by the validator in
> `plugin/hooks/content/` (P2-01). Changing a field now needs a new decision
> and a `schemaVersion` bump. Decision 0030 (tiers instead of weights) stayed
> at version `1`, a one-time exception made before there were players.

## Validation

The validator never throws. For each file it returns a list of issues, each
with the file, the field (e.g. `modsters[2].rarity`) and the problem.

- **Errors** skip the file. The exception is a biome entry naming a Modster
  that doesn't exist: only that entry is dropped, and the biome only if no
  entries are left.
- **Warnings** are reported, but the file still loads. Only the "should"
  rules below are warnings: an opaque palette index 0, alpha other than
  `00` or `ff`, and a lopsided biome (see [Encounter odds](#encounter-odds)).
- **Unknown fields are errors**, so typos like `"wieght"` are caught. The
  format is closed; a new field needs a decision.
- Every bound in the tables below is inclusive. `null` is accepted only where
  a table says so.

## Folder layout

The same layout is used for built-in content (`plugin/content/`) and user
content (`~/.claude/modster-hunter/content/`):

```
content/
├── settings.json                  # user folder only (optional)
├── CREDITS.md                     # built-in only: who made each asset, and its license
├── biomes/
│   └── <biome-id>/
│       ├── biome.json
│       ├── background.sprite.json # optional: the idle scene (decision 0026)
│       ├── desktop.png            # optional: the idle scene for the Desktop app (decision 0045)
│       └── particles.png          # optional: the particles' look on the Desktop app (decision 0046)
├── modsters/
│   └── <modster-id>/
│       ├── modster.json
│       ├── sprite.png              # source sheet (built-in: required; user: optional)
│       ├── sprite.sprite.json      # runtime sprite (user: optional when sprite.file is the PNG)
│       └── desktop.png             # optional: hi-res art for the Desktop app (decision 0045)
└── catchers/                       # throw animations (decision 0035)
    └── <catcher-id>/
        ├── catcher.json
        ├── sprite.png              # as for a Modster
        ├── sprite.sprite.json
        └── desktop.png             # optional, as for a Modster
```

## IDs

- Lowercase letters, digits and `-`, 2–32 characters, starting with a letter:
  `^[a-z][a-z0-9-]{1,31}$`.
- The folder name must equal the `id` in the file.
- Biomes, Modsters and catchers each have their own ids: a catcher may share
  an id with a Modster.
- IDs are permanent: the collection is stored by id. Renaming an id loses the
  collection entry, so change `name` instead.

## `biome.json`

```json
{
  "schemaVersion": 1,
  "id": "whispering-forest",
  "name": "Whispering Forest",
  "description": "Tall pines, soft moss, something rustling.",
  "accentColor": "#4caf50",
  "background": "background.sprite.json",
  "backgroundFps": 2,
  "particles": { "style": "leaf", "color": "#a5d6a7", "density": 2 },
  "encounterEverySec": [8, 20],
  "modsters": [
    { "id": "sproutling" },
    { "id": "mossbeast" },
    { "id": "pinewraith", "rarity": "rare", "maxAttempts": 5 }
  ]
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `schemaVersion` | yes | `1` |
| `id` | yes | See IDs |
| `name` | yes | 1–32 chars |
| `description` | no | ≤ 120 chars |
| `accentColor` | no | `#rrggbb`; tints the band's idle line |
| `background` | no | A `.sprite.json` in this folder, 1–4 frames. The idle scene: tiled left to right above the idle line, so its left and right edges should line up. Keep it about 12 px tall (6 rows); it stays on screen all session (decision 0026) |
| `backgroundFps` | no | 1–12 frames per second for the scene. Default 2 |
| `desktopBackground` | no | `{ "file": "desktop.png", "frames": 2 }`: the idle scene for the Desktop app, a PNG sheet of 1–4 frames played at `backgroundFps`. See [Desktop art](#desktop-art) |
| `particles` | no | Single pixels drifting over the scene, or a 3-row strip of them without one: `{ "style", "color", "density" }` |
| `particles.style` | yes | `sparkle` (twinkles in place), `leaf` (falls and drifts right), `sand` (blows right), `bubble` (rises) or `snow` (falls) |
| `particles.color` | no | `#rrggbb`. Default: `accentColor`, else white |
| `particles.density` | no | Integer 1–5. Default 2 |
| `desktopParticles` | no | `{ "file": "particles.png", "frames": 4 }`: what the particles look like on the Desktop app, a PNG sheet of 1–8 frames of at most 16×16, at most 4 KiB. Needs `particles`, whose style still moves them. See [Desktop art](#desktop-art) and decision [0046](decisions/0046-desktop-particle-art.md) |
| `encounterEverySec` | no | `[min, max]` seconds between encounters while a turn runs; 3 ≤ min ≤ max ≤ 600. Default `[10, 30]` |
| `modsters` | yes | 1–50 entries, ids unique within the biome |
| `modsters[].id` | yes | A Modster that exists after merging. A missing id is an error for that entry only |
| `modsters[].rarity` | no | `common`, `uncommon`, `rare` or `legendary`; overrides the Modster's `rarity` in this biome |
| `modsters[].maxAttempts` | no | Integer 1–10; overrides the Modster and the tier default |
| `modsters[].catchRate` | no | 0.01–1.0; overrides the Modster and the tier default |

There is no `weight`: an entry with one is an error (unknown field).

### Encounter odds

An encounter first draws a tier, then one Modster of that tier in the biome,
each equally likely (decision 0030). The tier weights are the same in every
biome; a tier with no Modster in the biome is left out and the others keep
their proportions.

| Tier | Weight | Default throws | Default catch rate |
| --- | --- | --- | --- |
| `common` | 76 | 3 | 0.50 |
| `uncommon` | 19 | 3 | 0.35 |
| `rare` | 4.5 | 4 | 0.20 |
| `legendary` | 0.5 | 5 | 0.08 |

A Modster's tier is its biome entry's `rarity`, else its own. Adding a Modster
only thins its own tier: three commons share 76%, about 25.3% each. When a
tier's Modsters each appear less often than those of a rarer tier in the same
biome (100 commons at 0.8% each next to a lone uncommon at 20%), the check
warns. Throws and catch rate: biome entry, then Modster file, then the tier
default (decision 0004).

## `modster.json`

```json
{
  "schemaVersion": 1,
  "id": "sproutling",
  "name": "Sproutling",
  "description": "A seed that learned to walk. Very proud of it.",
  "rarity": "common",
  "maxAttempts": null,
  "catchRate": null,
  "shinyChance": null,
  "dex": {
    "number": 1,
    "types": ["grass"],
    "category": "Seed Modster",
    "heightM": 0.3,
    "weightKg": 1.2,
    "entry": "It sprouted from a seed that refused to stay buried."
  },
  "sprite": {
    "file": "sprite.sprite.json",
    "fps": 6
  }
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `schemaVersion` | yes | `1` |
| `id` | yes | See IDs |
| `name` | yes | 1–24 chars (it has to fit in the band) |
| `description` | no | ≤ 120 chars; shown in the collection detail view |
| `rarity` | yes | `common`, `uncommon`, `rare` or `legendary`: its tier, unless a biome entry sets another (see [Encounter odds](#encounter-odds)) |
| `maxAttempts` | no | Integer 1–10, or `null` for the tier default |
| `catchRate` | no | 0.01–1.0, or `null` for the tier default |
| `shinyChance` | no | 0–1, or `null` for the default (P5-01) |
| `dex` | no | The dex entry, see below (decision 0017). Built-in Modsters need every field |
| `sprite.file` | yes, unless `desktopSprite` | A `.sprite.json` in this folder. User content may name a `.png` sheet instead (decision 0016). A Modster with only a `desktopSprite` has desktop art only (see [Desktop art](#desktop-art)) |
| `sprite.frames` | with a `.png` | Integer 1–8: how many frames sit side by side in the sheet. Required with a `.png`, an error with a `.sprite.json` |
| `sprite.fps` | no | 1–12. Default 6 |
| `desktopSprite.file` | no | A `.png` sheet in this folder: hi-res art for the Desktop app, built-in or user content. See [Desktop art](#desktop-art) |
| `desktopSprite.frames` | with `desktopSprite` | Integer 2–8: how many frames sit side by side in the sheet |
| `desktopSprite.fps` | no | 1–12. Default 6. Its own, so it can differ from `sprite.fps` |

### `dex`

Shown in the collection's detail view; `???` until the Modster is caught,
except the number. Every field is optional, but built-in Modsters must fill
them all (`npm run check:content` checks this, and that numbers are unique).

| Field | Rules |
| --- | --- |
| `number` | Integer 1–999, shown as `#001`. **Built-in only**: an error in a user file. A user Modster that replaces a built-in keeps its number; other user Modsters show `#—` |
| `types` | A list of 1 or 2 different types; the first is the primary one (decision [0022](decisions/0022-up-to-two-types.md)). Each is one of `normal`, `fire`, `water`, `grass`, `electric`, `steel`, `fighting`, `poison`, `ground`, `flying`, `ice`, `dark`, `psychic`, `bug`, `rock`, `ghost`, `dragon`, `fairy`. Flavor only: no effect on odds. Badge colors are in `MODSTER_TYPES` (`plugin/hooks/constants.ts`). The old `type` field is an error |
| `category` | 1–24 chars, e.g. `"Seed Modster"` |
| `heightM` | Meters, 0.01–100 |
| `weightKg` | Kilograms, 0.01–10,000. Not the biome entry's `weight`, which sets encounter odds |
| `entry` | 1–240 chars; the dex text. `description` stays the short line |

Habitat isn't a field: it comes from the biomes that list the Modster.

## `catcher.json`

A catcher is what a throw plays: it flies in, takes the Modster, rocks, and
clicks shut or breaks (decision [0035](decisions/0035-catchers.md)). The player
picks one in `/modsters`; it only changes how a throw looks.

```json
{
  "schemaVersion": 1,
  "id": "firefly-jar",
  "name": "Firefly Jar",
  "description": "Glows with whatever it holds.",
  "style": "contain",
  "sprite": { "file": "sprite.sprite.json" },
  "beats": {
    "take": { "frames": [1] },
    "rock": { "frames": [2, 0, 3, 0] }
  },
  "glowIndex": 5,
  "lidRows": 4
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `schemaVersion` | yes | `1` |
| `id` | yes | See IDs |
| `name` | yes | 1–32 chars |
| `description` | no | ≤ 120 chars; shown in the Catchers tab |
| `style` | yes | `contain`, `cover` or `custom` (see [Styles](#styles)) |
| `sprite.file` | yes, unless `desktopSprite` | A `.sprite.json` in this folder. User content may name a `.png` sheet instead, as for a Modster. Without it the catcher has desktop art only |
| `sprite.frames` | with a `.png` | Integer 1–16, as for a Modster. Required with a `.png`, an error with a `.sprite.json` |
| `beats` | with `custom` | An object with any of the six beats below. With `contain` or `cover`, only what differs from the preset |
| `glowIndex` | no | Integer 1–63: a palette index painted in the Modster's most common bright color while the Modster is inside, in beats where its `modster` is `hidden`. Otherwise it shows its own color, so draw it as the empty catcher. Must be inside the sprite's palette |
| `rimIndex` | no | Integer 1–63: a palette index for the edge of a `stretch` shape. Must be inside the sprite's palette. Without it, a `stretch` shape has no edge |
| `lidRows` | no | Integer 1–31: the closed frame's top rows that lift to open and fly off on a break, when those beats have no frames of their own. Must be less than the sprite's height |
| `desktopSprite.file` | no | A `.png` sheet in this folder: hi-res art for the Desktop app. See [Desktop art](#desktop-art) |
| `desktopSprite.frames` | with `desktopSprite` | Integer 1–16. Every beat's frames must be inside it too |
| `desktopSprite.glowColor` | no | A colour like `"#ffd54f"` from the sheet: `glowIndex` for the desktop, since a PNG has no palette |
| `desktopSprite.rimColor` | no | A colour from the sheet: `rimIndex` for the desktop |
| `desktopSprite.lidRows` | no | Integer 1–95: `lidRows` for the desktop, in rows of the sheet. Must be less than its height |

The sprite follows the [`.sprite.json`](#spritejson) rules, but a catcher's is
at most 32×32 px and may have up to 16 frames. **Frame 0 is the closed
catcher**; every other frame is used only where a beat names it. A catcher that
doesn't fit a Modster's sprite area isn't drawn there: the dot count plays
instead (0035 point 8).

### Beats

A throw plays `throw`, `take`, `settle`, `rock` once per rock, then `caught` or
`broken`. Their lengths are fixed (0035 point 5); a catcher sets only what
they show. Each beat is an object with these fields, all optional except
`modster` in a `custom` catcher:

| Field | Rules |
| --- | --- |
| `frames` | A list of 1–16 frame indexes, played evenly over the beat (each rock plays the whole list). Each must be a frame of the sprite |
| `place` | `over`: anchored at the bottom center of the Modster's area, in front of it. `behind`: the same, behind it. `stretch`: frame tiled over the Modster's outline |
| `modster` | What the Modster does: `visible`, `hidden`, `dim`, `shake`, `shrink-in` (shrinks into the catcher's opening, flashing white), `shrink`, `hop-out` or `pop-out` (grows back out of the opening) |
| `path` | `throw` only: `arc`, `drop` (falls from the top) or `none` (appears in place). An error on any other beat |

### Styles

`contain` and `cover` are presets: a beat the file doesn't give, and any field
a given beat leaves out, comes from the table. A `custom` catcher has no preset:
every beat must be given with its `modster`; `frames` defaults to `[0]`,
`place` to `over` and `path` to `arc`.

| Beat | `contain` | `cover` |
| --- | --- | --- |
| `throw` | `over`, `visible`, `arc` | `stretch`, `visible`, `arc` |
| `take` | `over`, `shrink-in`; the lid lifts | `stretch`, `visible`; drops over it |
| `settle` | `over`, `hidden` | `stretch`, `visible` |
| `rock` | `over`, `hidden`; frame 0 tilts left and right | `stretch`, `shake` |
| `caught` | `over`, `hidden`; sparkles | `stretch`, `shrink`; sparkles |
| `broken` | `over`, `pop-out`; the lid flies off | `stretch`, `hop-out`; tears open |

Where a preset beat has no `frames`, they're made from frame 0 as the table
says: tilted for `rock`, with the top `lidRows` rows lifted for `take` or
flying off for `broken` (no lid moves without `lidRows`).

## `.sprite.json`

```json
{
  "schemaVersion": 1,
  "width": 16,
  "height": 12,
  "palette": ["#00000000", "#2e7d32ff", "#a5d6a7ff"],
  "shinyPalette": ["#00000000", "#6a1b9aff", "#ce93d8ff"],
  "frames": [
    "base64 of width*height palette indexes, one byte each, row by row"
  ]
}
```

| Field | Rules |
| --- | --- |
| `width`, `height` | `width` 8–48; `height` 8–48 and even (two pixels per cell). See [0021](decisions/0021-sprites-up-to-48x48.md). A sprite shows wherever it fits; elsewhere the band and pane show the compact text layout ([0012](decisions/0012-sprite-size-and-band-layout.md) points 6–8). Keep sprites at most 32 px tall and 48 wide ([0033](decisions/0033-standard-sprite-size.md)); the validator still accepts up to 48 tall. Up to 14 px tall fits the band of an 80×24 terminal, up to 30 px at 140×40 |
| `palette` | 1–64 colors, `#rrggbbaa`. Index 0 should be fully transparent |
| `shinyPalette` | Optional; same length as `palette` (P5-01) |
| `frames` | 1–8 frames, each exactly `width × height` bytes after base64 decoding; every byte < palette length |

Alpha is either `00` (transparent) or `ff` (opaque); anything in between is
rounded at conversion time, because terminal cells can't blend.

## Desktop art

Modsters, catchers and biomes may also carry hi-res pixel art for the Desktop
app (decision [0045](decisions/0045-desktop-sprites.md)): a PNG sheet in the
same folder, its frames side by side, embedded as-is and drawn pixelated. It's
allowed in built-in and user content.

| Art | Field | Each frame | Frames | File size |
| --- | --- | --- | --- | --- |
| Modster | `desktopSprite` | up to 128×128 px | 2–8 | at most 48 KiB |
| Biome idle scene | `desktopBackground` | up to 192 px wide, 48 tall; edges that tile | 1–4 | at most 24 KiB |
| Catcher | `desktopSprite` | up to 96×96 px | 1–16 | at most 24 KiB |
| Biome particles | `desktopParticles` | up to 16×16 px | 1–8 | at most 4 KiB |

- The sheet's width must split into exactly `frames` equal frames.
- At most 64 opaque colours across all frames.
- Every pixel is fully opaque or fully clear: the desktop draws the file as it
  is, so a half-transparent pixel would blend.
- Desktop art that breaks a rule is left out with a content issue. What names it
  still loads with its terminal art.
- With both, the terminal and desktop art are the same design, but each has its
  own size, frames and fps.
- A Modster or catcher needs a terminal `sprite`, a `desktopSprite`, or both.
  A biome's `background` and `desktopBackground` are both optional.
- Content with desktop art only still plays on the terminal (decision 0045
  point 10): a Modster shows as text, a biome shows its idle line, and a
  catcher is replaced by the default catcher. On the desktop it shows the same
  way until desktop art is drawn there (P5-46 to P5-48).
- A `sprite` that's named but doesn't load still skips the Modster or catcher,
  even when it has desktop art.

## User PNG sheets

A user Modster can name its PNG sheet in `sprite.file` (with `sprite.frames`)
instead of a `.sprite.json`. The mod converts it on load, with the same rules
as `tools/sprite.mjs`, and caches the result in
`~/.claude/modster-hunter/cache/sprites/` (decision 0016).

- Every valid PNG works: grayscale, RGB, palette and alpha, at any bit depth,
  interlaced or not (decision 0025). 16-bit samples are scaled to 8 bits.
- Each frame must fit the `.sprite.json` bounds above; at most 63 opaque colors.

## User `settings.json` (user folder only)

```json
{
  "schemaVersion": 1,
  "disabledBiomes": ["volcano"],
  "disabledModsters": ["mossbeast"]
}
```

Built-in on/off is the plugin option `includeBuiltins`, not this file.

`o` in the collection pane's Collection and Biomes tabs adds or removes an id
here (decision 0032). Disabled items stay listed in the pane, dimmed, and a
biome entry naming a disabled Modster is dropped without an issue.

## Plugin options (`userConfig`)

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `autoStart` | boolean | `true` | Run the game. Off: nothing draws outside `/modsters`. `/modsters hunt` turns it on, `/modsters stop` turns it off (decisions 0038, 0041) |
| `includeBuiltins` | boolean | `true` | Load the biomes and Modsters that ship with the mod. Built-in catchers load either way (decision 0035) |
| `encounterIdleTimeoutSec` | number | `90` | Seconds without a throw before an encounter's Modster wanders off |
| `showIdleLine` | boolean | `true` | Show the current biome in the band between encounters |
| `showIdleScene` | boolean | `true` | Draw the biome's scene between encounters when the biome has one and it fits: in the band above the idle line (decision 0026), or in the encounter pane above its idle text (0027). It moves only while Claude works |
| `showInBand` | boolean | `true` | Draw the game in the band. Off: one row (Throw, Run) during encounters only, nothing between them (decision 0023) |
| `encounterPane` | `off`, `when-opened`, `always` | `when-opened` | When the encounter pane opens, while `autoStart` is on: never (`/modsters pane` says it's off), after `/modsters pane` until closed by hand (0019), or every session (0023; 0038) |
| `showInSpinner` | boolean | `true` | Name the Modster in the spinner line while Claude works (0023) |
| `showInStatusLine` | boolean | `true` | Show the encounter in the status line while one is up; cleared between encounters (0023) |
| `sounds` | boolean | `false` | Play sounds (P5-02) |

Players change these in the game with `/modsters settings` (every option but `sounds`, decision 0040), or in `/config`. A change from `/config` reloads the mod, which ends an encounter in progress (decision 0005); a change in the Settings tab applies at once.
