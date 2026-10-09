# Content format

How biomes, Modsters and sprites are described on disk. This is the contract
between the game, the built-in content, user content, the editor and the
content skills. Rules come from decisions [0004](decisions/0004-attempts-and-catch-rate.md),
[0007](decisions/0007-content-model.md) and [0016](decisions/0016-user-png-sprites.md).

> **Status:** schema version `1`, implemented by the validator in
> `plugin/hooks/content/` (P2-01). Changing a field now needs a new decision
> and a `schemaVersion` bump.

## Validation

The validator never throws. For each file it returns a list of issues, each
with the file, the field (e.g. `modsters[2].weight`) and the problem.

- **Errors** skip the file. The exception is a biome entry naming a Modster
  that doesn't exist: only that entry is dropped, and the biome only if no
  entries are left.
- **Warnings** are reported, but the file still loads. Only the "should"
  rules below are warnings: an opaque palette index 0, and alpha other than
  `00` or `ff`.
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
│       └── background.sprite.json # optional
└── modsters/
    └── <modster-id>/
        ├── modster.json
        ├── sprite.png              # source sheet (built-in: required; user: optional)
        └── sprite.sprite.json      # runtime sprite (user: optional when sprite.file is the PNG)
```

## IDs

- Lowercase letters, digits and `-`, 2–32 characters, starting with a letter:
  `^[a-z][a-z0-9-]{1,31}$`.
- The folder name must equal the `id` in the file.
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
  "encounterEverySec": [8, 20],
  "modsters": [
    { "id": "sproutling", "weight": 60 },
    { "id": "mossbeast", "weight": 15 },
    { "id": "pinewraith", "weight": 4, "maxAttempts": 5 }
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
| `background` | no | A `.sprite.json` in this folder; single frame |
| `encounterEverySec` | no | `[min, max]` seconds between encounters while a turn runs; 3 ≤ min ≤ max ≤ 600. Default `[10, 30]` |
| `modsters` | yes | 1–50 entries, ids unique within the biome |
| `modsters[].id` | yes | A Modster that exists after merging. A missing id is an error for that entry only |
| `modsters[].weight` | yes | Integer 1–10,000. Chance = weight ÷ sum of weights |
| `modsters[].maxAttempts` | no | Integer 1–10; overrides the Modster and the tier default |
| `modsters[].catchRate` | no | 0.01–1.0; overrides the Modster and the tier default |

## `modster.json`

```json
{
  "schemaVersion": 1,
  "id": "sproutling",
  "name": "Sproutling",
  "description": "A seed that learned to walk. Very proud of it.",
  "rarity": null,
  "maxAttempts": null,
  "catchRate": null,
  "shinyChance": null,
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
| `rarity` | no | `common`, `uncommon`, `rare`, `legendary`, or `null` to compute it from weight (decision 0004) |
| `maxAttempts` | no | Integer 1–10, or `null` for the tier default |
| `catchRate` | no | 0.01–1.0, or `null` for the tier default |
| `shinyChance` | no | 0–1, or `null` for the default (P5-01) |
| `sprite.file` | yes | A `.sprite.json` in this folder. User content may name a `.png` sheet instead (decision 0016) |
| `sprite.frames` | with a `.png` | Integer 1–8: how many frames sit side by side in the sheet. Required with a `.png`, an error with a `.sprite.json` |
| `sprite.fps` | no | 1–12. Default 6 |

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
| `width`, `height` | `width` 8–24; `height` 8–12 and even (two pixels per cell). See [0012](decisions/0012-sprite-size-and-band-layout.md) |
| `palette` | 1–64 colors, `#rrggbbaa`. Index 0 should be fully transparent |
| `shinyPalette` | Optional; same length as `palette` (P5-01) |
| `frames` | 1–8 frames, each exactly `width × height` bytes after base64 decoding; every byte < palette length |

Alpha is either `00` (transparent) or `ff` (opaque); anything in between is
rounded at conversion time, because terminal cells can't blend.

## User PNG sheets

A user Modster can name its PNG sheet in `sprite.file` (with `sprite.frames`)
instead of a `.sprite.json`. The mod converts it on load, with the same rules
as `tools/sprite.mjs`, and caches the result in
`~/.claude/modster-hunter/cache/sprites/` (decision 0016).

- Supported: non-interlaced RGB or RGBA at 8 bits, and palette PNGs at 1, 2, 4
  or 8 bits. For any other PNG, convert it with `tools/sprite.mjs`.
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

## Plugin options (`userConfig`)

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `includeBuiltins` | boolean | `true` | Load the content that ships with the mod |
| `encounterIdleTimeoutSec` | number | `90` | Seconds without a throw before an encounter's Modster wanders off |
| `showIdleLine` | boolean | `true` | Show the current biome in the band between encounters |
| `sounds` | boolean | `false` | Play sounds (P5-02) |
