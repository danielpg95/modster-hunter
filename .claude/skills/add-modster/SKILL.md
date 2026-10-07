---
name: add-modster
description: Add a new built-in Modster (creature) to Modster Hunter — design, pixel-art sprite sheet, modster.json, conversion, credits, and validation. Use when a contributor wants to create, draw or add a Modster to the built-in content.
---

# Add a built-in Modster

Built-in content lives in `plugin/content/`. Follow `docs/CONTENT_FORMAT.md` and
`.claude/rules/content.md`. (Users adding their *own* Modsters use the
user-facing skill in `plugin/skills/`, phase 4.)

## Steps

1. **Agree on the design with the user before drawing:** name, one-line
   personality, color scheme (≤ 16 colors), size (default 24×24 px, see the
   limits in CONTENT_FORMAT.md), 2–4 frame idle animation idea, which biome(s),
   intended tier. Check `plugin/content/modsters/` so the id and look are new.
2. **Create the folder** `plugin/content/modsters/<id>/`.
3. **Make the sprite sheet** `sprite.png`: frames side by side, equal size,
   transparent background, strong dark outline. If you draw it programmatically,
   write the drawing script to the scratchpad, not the repo. Look at the result
   (open the PNG, enlarged) before continuing.
4. **Convert:** `node tools/sprite.mjs plugin/content/modsters/<id>/sprite.png --frames N`
   *(available from P2-02)*. Never hand-edit the output.
5. **Write `modster.json`** from `docs/templates/content/modster.json`. Leave
   `rarity`, `maxAttempts`, `catchRate` as `null` unless the user asks for an
   override (decision 0004).
6. **Add it to a biome:** an entry with a `weight` in that biome's `biome.json`.
   Show the user the biome's resulting odds table (percent per Modster).
7. **Credit it** in `plugin/content/CREDITS.md`.
8. **Validate:** the content check (from P2-01) and `claude plugin test ./plugin`.
9. **Preview** in `claude --plugin-dir ./plugin` if possible, and adjust colors
   that read poorly on a dark or light background.
