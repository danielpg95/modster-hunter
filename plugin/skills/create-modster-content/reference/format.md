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
└── modsters/
    └── <modster-id>/
        ├── modster.json
        ├── sprite.png            # a PNG sheet, or…
        └── sprite.sprite.json    # …a converted sprite
```

## Ids

- Lowercase letters, digits and `-`, 2–32 characters, starting with a letter:
  `^[a-z][a-z0-9-]{1,31}$`.
- The folder name must equal the `id` in the file.
- A user id equal to a built-in id replaces the built-in entirely.
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
- **Frame size:** width 8–48 px, height 8–48 px and even. Up to 14 px tall
  shows in the band of an 80×24 terminal; taller shows as text there.
- **Transparency:** alpha below 128 is transparent, 128 and up is opaque.
- **GIFs** aren't read by the mod: convert them to a `.sprite.json` with the
  helper, or export a PNG sheet.

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
