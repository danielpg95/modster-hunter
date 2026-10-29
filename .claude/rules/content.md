---
paths:
  - "plugin/content/**"
  - "plugin/skills/**"
---

# Rules for game content (biomes, Modsters, catchers, art)

- **Follow `docs/CONTENT_FORMAT.md` exactly.** If something you need isn't in
  the format, stop and propose a format change; don't invent fields.
- **IDs are permanent.** Never rename an existing `id`; change `name`.
- **Folder name = id**, lowercase kebab-case.
- **Original art only.** No sprites traced from, or recognizable as, existing
  games, franchises or characters (Pokémon, Digimon, etc.), even "inspired by".
  Modsters should be clearly their own designs.
- **Every built-in asset is credited** in `plugin/content/CREDITS.md`: asset path,
  author (GitHub handle), license (CC BY 4.0 by default, decision 0011).
- **Desktop first** (decision 0045): new built-in art is desktop art
  (`desktopSprite`, `desktopBackground`); terminal art is optional. With both,
  they're the same design, and the terminal one is reduced from the desktop one.
- **Terminal sprites:** commit both the source PNG sheet and the converted
  `.sprite.json`. Regenerate the JSON with the converter; never hand-edit it.
  Strong outline, ≤ 24 colors (decision 0034), at most 48×32 (0033).
- **Desktop sheets:** commit the PNG only; the desktop draws it as-is. Hi-res
  pixel art within 0045's bounds (Modster 128×128 and 48 KiB, background
  192×48 and 24 KiB, catcher 96×96 and 24 KiB; ≤ 64 colors; every pixel fully
  opaque or clear), saved fully compressed. Check it with
  `node tools/sprite.mjs <png> --frames N --desktop <kind> --preview page.html`.
- **Readable silhouettes:** the collection shows uncaught Modsters as a
  silhouette, so the outline alone must read.
- **Balance:** each built-in biome follows the tier mix in ROADMAP P2-09. Check
  the odds table before committing tier changes (decision 0030).
- **Text fits the band:** names ≤ 24 chars, descriptions ≤ 120, friendly and
  family-safe.
- Use the `add-modster` / `add-biome` / `add-catcher` skills; they run the validator.
