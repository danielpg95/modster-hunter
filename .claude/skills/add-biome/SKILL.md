---
name: add-biome
description: Add a new built-in biome to the Modster Hunter repo's plugin/content/ — theme, biome.json, Modster roster balanced across rarity tiers, optional background, credits, and validation. Use when a contributor wants to create or add a biome or area to the built-in content. Not for a player's own biomes in ~/.claude/modster-hunter/content/ (that's the mod's create-modster-content skill).
---

# Add a built-in biome

## Steps

1. **Ask the user for the theme, one field at a time:** name, one-line
   description, accent color, encounter pacing (`encounterEverySec`), and its
   Modster roster: existing Modsters to reuse and new ones to create. The user
   decides; you only suggest, with 2–3 options and room for their own answer.
   Never present a finished theme for a yes/no approval.
2. **Check balance** against ROADMAP P2-09: at least one common, one uncommon,
   one rare. Balancing means choosing each Modster's tier (decision 0030): its
   own `rarity`, or a `rarity` on its biome entry. Show the odds table (each
   tier's share and each Modster's, see CONTENT_FORMAT "Encounter odds")
   before writing anything. Keep tiers from getting lopsided: if one tier's
   Modsters each appear less often than a rarer tier's, the check warns.
3. **Create** `plugin/content/biomes/<id>/biome.json` from
   `docs/templates/content/biome.json`.
4. **New Modsters:** run the `add-modster` skill for each.
5. **Background (optional):** a single-frame sprite converted like a Modster's,
   kept subtle so the Modster stays readable.
6. **Credit** any art in `plugin/content/CREDITS.md`.
7. **Validate** with `npm run check:content` (prints every biome's odds table)
   and `claude plugin test ./plugin`.
