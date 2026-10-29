---
name: add-biome
description: Add a new built-in biome to the Modster Hunter repo's plugin/content/ — theme, biome.json, Modster roster balanced across rarity tiers, an optional desktop or terminal background, credits, and validation. Use when a contributor wants to create or add a biome or area to the built-in content. Not for a player's own biomes in ~/.claude/modster-hunter/content/ (that's the mod's create-modster-content skill).
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
5. **Background (optional): desktop, terminal or both** (decision 0045). Ask
   which; desktop is the default for new built-ins. It's the idle scene,
   tiled left to right above the idle line, so its left and right edges must
   line up. Keep it subtle so the Modster stays readable.
   - **Desktop** (`"desktopBackground": { "file": "desktop.png", "frames": N }`):
     hi-res pixel art up to 192 px wide and 48 tall per frame, 1–4 frames at
     `backgroundFps`, up to 64 colours, every pixel fully opaque or clear, at
     most 24 KiB. Make it as in the `add-modster` skill's desktop path (a
     reference, `ref-sprite --desktop`, frames in a scratchpad script, saved at
     full compression). Check it and look at the seams:

     ```bash
     node tools/sprite.mjs desktop.png --frames N --fps F --desktop background --preview preview.html
     ```

     The page tiles it three times side by side; a seam that doesn't line up
     shows there. Open it for the user and wait for approval.
   - **Terminal** (`"background": "background.sprite.json"`): 1–4 frames about
     12 px tall, converted like a Modster's sprite.
   - **Both:** the desktop one first, then reduce the terminal one from it.
6. **Credit** any art in `plugin/content/CREDITS.md`, one row per file;
   `check:content` fails without the desktop row.
7. **Validate** with `npm run check:content` (prints every biome's odds table)
   and `claude plugin test ./plugin`.
