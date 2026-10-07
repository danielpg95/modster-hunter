---
paths:
  - "plugin/content/**"
  - "plugin/skills/**"
---

# Rules for game content (biomes, Modsters, sprites)

- **Follow `docs/CONTENT_FORMAT.md` exactly.** If something you need isn't in
  the format, stop and propose a format change; don't invent fields.
- **IDs are permanent.** Never rename an existing `id`; change `name`.
- **Folder name = id**, lowercase kebab-case.
- **Original art only.** No sprites traced from, or recognizable as, existing
  games, franchises or characters (Pokémon, Digimon, etc.), even "inspired by".
  Modsters should be clearly their own designs.
- **Every built-in asset is credited** in `plugin/content/CREDITS.md`: asset path,
  author (GitHub handle), license (CC BY 4.0 by default, decision 0011).
- **Sprites:** commit both the source PNG sheet and the converted
  `.sprite.json`. Regenerate the JSON with the converter; never hand-edit it.
- **Readability at terminal size:** strong outline, ≤ 16 colors per Modster,
  recognizable silhouette (the collection shows silhouettes for uncaught ones).
- **Balance:** each built-in biome follows the tier mix in ROADMAP P2-09. Check
  the computed odds table before committing weights.
- **Text fits the band:** names ≤ 24 chars, descriptions ≤ 120, friendly and
  family-safe.
- Use the `add-modster` / `add-biome` skills; they run the validator.
