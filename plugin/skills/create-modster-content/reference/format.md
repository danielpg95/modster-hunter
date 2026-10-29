# Content format for user content

The rules for files in `~/.claude/modster-hunter/content/`. This is the part
of the repo's `docs/CONTENT_FORMAT.md` (schema version 1) that user content
needs; keep the two in step. Every bound is inclusive. Unknown fields are
errors, and a file with an error is skipped.

## Folders

```
~/.claude/modster-hunter/content/
├── settings.json                 # optional
├── biomes/
│   └── <biome-id>/
│       ├── biome.json
│       └── background.sprite.json   # optional
├── modsters/
│   └── <modster-id>/
│       ├── modster.json
│       ├── sprite.png            # a PNG sheet, or…
│       └── sprite.sprite.json    # …a converted sprite
└── catchers/
    └── <catcher-id>/
        ├── catcher.json
        ├── sprite.png            # as for a Modster
        └── sprite.sprite.json
```

## Ids

- Lowercase letters, digits and `-`, 2–32 characters, starting with a letter:
  `^[a-z][a-z0-9-]{1,31}$`.
- The folder name must equal the `id` in the file.
- A user id equal to a built-in id replaces the built-in entirely.
- Biomes, Modsters and catchers have their own ids: a catcher may share an id
  with a Modster.
- Ids are permanent; change `name` instead.

## `biome.json`

```json
{
  "schemaVersion": 1,
  "id": "glow-caves",
  "name": "Glow Caves",
  "description": "Dripping stone and soft blue light.",
  "accentColor": "#4fc3f7",
  "encounterEverySec": [10, 30],
  "modsters": [
    { "id": "blobby" },
    { "id": "sproutling", "rarity": "uncommon" },
    { "id": "glimmerbat", "maxAttempts": 5 }
  ]
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `schemaVersion` | yes | `1` |
| `id` | yes | See Ids |
| `name` | yes | 1–32 chars |
| `description` | no | ≤ 120 chars |
| `accentColor` | no | `#rrggbb` |
| `background` | no | A `.sprite.json` in this folder with 1–4 frames (convert a PNG with the helper). Shown as a scene above the idle line, tiled left to right |
| `backgroundFps` | no | 1–12. Default 2 |
| `particles` | no | `{ "style": "sparkle" \| "leaf" \| "sand" \| "bubble" \| "snow", "color": "#rrggbb", "density": 1–5 }`; only `style` is required |
| `encounterEverySec` | no | `[min, max]` seconds between encounters while Claude works; 3 ≤ min ≤ max ≤ 600. Default `[10, 30]` |
| `modsters` | yes | 1–50 entries, ids unique within the biome |
| `modsters[].id` | yes | A Modster that exists (built-in or user). A missing one drops only that entry |
| `modsters[].rarity` | no | `common`, `uncommon`, `rare` or `legendary`; overrides the Modster's own in this biome |
| `modsters[].maxAttempts` | no | Integer 1–10; overrides the Modster and its tier |
| `modsters[].catchRate` | no | 0.01–1.0; overrides the Modster and its tier |

## `modster.json`

```json
{
  "schemaVersion": 1,
  "id": "blobby",
  "name": "Blobby",
  "description": "A wobbly green blob that hums when happy.",
  "rarity": "common",
  "maxAttempts": null,
  "catchRate": null,
  "shinyChance": null,
  "dex": {
    "types": ["grass", "water"],
    "category": "Blob Modster",
    "heightM": 0.4,
    "weightKg": 3.5,
    "entry": "It soaks up morning dew and wobbles off before noon."
  },
  "sprite": { "file": "sprite.png", "frames": 2, "fps": 4 }
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `schemaVersion` | yes | `1` |
| `id` | yes | See Ids |
| `name` | yes | 1–24 chars |
| `description` | no | ≤ 120 chars |
| `rarity` | yes | `common`, `uncommon`, `rare` or `legendary`. A biome entry may set another |
| `maxAttempts` | no | Integer 1–10, or `null` for the tier default |
| `catchRate` | no | 0.01–1.0, or `null` for the tier default |
| `shinyChance` | no | 0–1, or `null` |
| `dex` | no | See below; every field optional |
| `sprite.file` | yes | `sprite.png` (a PNG sheet) or a `.sprite.json`, in the Modster's folder |
| `sprite.frames` | with a `.png` | Integer 1–8: frames side by side in the sheet. An error with a `.sprite.json` |
| `sprite.fps` | no | 1–12. Default 6 |

### `dex`

| Field | Rules |
| --- | --- |
| `number` | **Not allowed** in user files (built-in only) |
| `types` | 1 or 2 different types, first is primary: `normal`, `fire`, `water`, `grass`, `electric`, `steel`, `fighting`, `poison`, `ground`, `flying`, `ice`, `dark`, `psychic`, `bug`, `rock`, `ghost`, `dragon`, `fairy` |
| `category` | 1–24 chars, e.g. `"Seed Modster"` |
| `heightM` | Meters, 0.01–100 |
| `weightKg` | Kilograms, 0.01–10,000 |
| `entry` | 1–240 chars |

## Sprites

- **PNG sheet:** frames side by side, all the same size. Any valid PNG works.
  At most 63 opaque colors in the sheet.
- **Frame size:** width 8–48 px, height 8–48 px and even. Keep it at most
  32 px tall and 48 wide, like the built-ins. Up to 14 px tall shows in the
  band of an 80×24 terminal and up to 30 px at 140×40; taller shows as text
  there, and in full in the encounter pane and the collection.
- **Transparency:** alpha below 128 is transparent, 128 and up is opaque.
- **GIFs** aren't read by the mod: convert them to a `.sprite.json` with the
  helper, or export a PNG sheet.

## `catcher.json`

A catcher is what a throw plays: it flies in, takes the Modster, rocks, and
clicks shut or breaks. The player picks one in `/modsters`, tab `4: Catchers`.
It only changes how a throw looks, never the odds.

```json
{
  "schemaVersion": 1,
  "id": "firefly-jar",
  "name": "Firefly Jar",
  "description": "Glows with whatever it holds.",
  "style": "contain",
  "sprite": { "file": "sprite.png", "frames": 2 },
  "beats": { "take": { "frames": [1] } },
  "glowIndex": 5,
  "lidRows": 4
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `schemaVersion` | yes | `1` |
| `id` | yes | See Ids |
| `name` | yes | 1–32 chars |
| `description` | no | ≤ 120 chars; shown in the Catchers tab |
| `style` | yes | `contain`, `cover` or `custom` (below) |
| `sprite.file` | yes | `sprite.png` (a PNG sheet) or a `.sprite.json`, in the catcher's folder |
| `sprite.frames` | with a `.png` | Integer 1–16. An error with a `.sprite.json` |
| `beats` | with `custom` | Any of the six beats below; with `contain` or `cover`, only what differs |
| `glowIndex` | no | Integer 1–63, a palette index inside the sprite's palette. It shows its own color while the catcher is empty, and the Modster's most common bright color while the Modster is inside (beats where `modster` is `hidden`) |
| `rimIndex` | no | Integer 1–63, inside the palette: the edge of a `stretch` shape. The color must appear in the art, or it's left out of the palette |
| `lidRows` | no | Integer 1–31, less than the sprite's height: the top rows of frame 0 that lift to open and fly off on a break |

**The sprite:** at most 32×32 px, with up to 16 frames, and the usual sprite
rules. **Frame 0 is the closed catcher**; other frames are used only where a
beat names them. A catcher bigger than a Modster's sprite area isn't drawn on
that Modster: the text shows the throw as a dot count instead.

### Beats

A throw plays `throw`, `take`, `settle`, `rock` once per rock (3 for a catch,
1–2 for a miss), then `caught` or `broken`. Their lengths are fixed. Each beat
is an object with these fields:

| Field | Rules |
| --- | --- |
| `frames` | 1–16 frame indexes inside the sprite, played evenly over the beat (each rock plays the whole list) |
| `place` | `over`: at the bottom center of the Modster's area, in front of it. `behind`: the same, behind it. `stretch`: the frame tiled over the Modster's outline |
| `modster` | `visible`, `hidden`, `dim`, `shake`, `shrink-in` (shrinks into the opening, flashing white), `shrink`, `hop-out` or `pop-out` (grows back out of the opening) |
| `path` | `throw` only: `arc`, `drop` (falls from the top) or `none` |

### Styles

`contain` and `cover` are presets: a beat the file leaves out, and any field a
given beat leaves out, comes from the table. In a `custom` catcher every beat
must be given with its `modster`; `frames` defaults to `[0]`, `place` to
`over` and `path` to `arc`.

| Beat | `contain` (jar, seed pod, lantern) | `cover` (net) |
| --- | --- | --- |
| `throw` | `over`, `visible`, `arc` | `stretch`, `visible`, `arc` |
| `take` | `over`, `shrink-in`; the lid lifts | `stretch`, `visible`; drops over it |
| `settle` | `over`, `hidden` | `stretch`, `visible` |
| `rock` | `over`, `hidden`; frame 0 tilts | `stretch`, `shake` |
| `caught` | `over`, `hidden`; sparkles | `stretch`, `shrink`; sparkles |
| `broken` | `over`, `pop-out`; the lid flies off | `stretch`, `hop-out`; tears open |

Where a preset beat has no `frames`, they're made from frame 0: tilted for
`rock`, with the top `lidRows` rows lifting for `take` and flying off for
`broken`.

## Rarity tiers

An encounter picks a tier by its share, then one Modster of that tier in the
biome, each equally likely. A Modster's tier is its biome entry's `rarity`,
else its own. Tiers with no Modster in the biome are left out; the others keep
their proportions. Biome entries have no `weight` (it's an error).

| Tier | Tier share | Default throws | Default catch rate |
| --- | --- | --- | --- |
| common | 76% | 3 | 0.50 |
| uncommon | 19% | 3 | 0.35 |
| rare | 4.5% | 4 | 0.20 |
| legendary | 0.5% | 5 | 0.08 |

`check` warns when a tier's Modsters each appear less often than a rarer
tier's in the same biome.

Precedence, highest first: biome entry → Modster file → tier default.

## `settings.json`

```json
{ "schemaVersion": 1, "disabledBiomes": ["saltbreeze-bay"], "disabledModsters": ["mossbeast"] }
```

Turning all built-ins off is the **Include built-in content** option in
`/config`, not this file.

## Desktop art

Optional hi-res art for the Desktop app (decisions 0045 and 0046). Each is a
PNG sheet in the item's folder, frames side by side, every pixel fully opaque
or fully clear, at most 64 colours. Art that breaks a rule is left out with a
content issue, and the item still loads with its terminal art.

| Field | In | Each frame | Frames | File size |
| --- | --- | --- | --- | --- |
| `desktopSprite: { file, frames, fps? }` | `modster.json` | up to 128×128 | 2–8 | at most 48 KiB |
| `desktopBackground: { file, frames }` | `biome.json` | up to 192×48, edges that tile | 1–4, at `backgroundFps` | at most 24 KiB |
| `desktopParticles: { file, frames }` | `biome.json`, with `particles` | up to 16×16 | 1–8 | at most 4 KiB |
| `desktopSprite: { file, frames, glowColor?, rimColor?, lidRows? }` | `catcher.json` | up to 96×96 | 1–16 | at most 24 KiB |

- A Modster or catcher needs `sprite`, `desktopSprite`, or both. With
  `desktopSprite` only, the terminal shows a Modster as text, and plays the
  glass jar for a catcher.
- A catcher's `glowColor` and `rimColor` are `#rrggbb` colours from its sheet;
  its `lidRows` counts the sheet's rows; every frame its beats name must be in
  the sheet.
- With both, they're the same design, but each has its own frames and fps.

