---
name: create-modster-content
description: Create your own Modsters and biomes for the Modster Hunter mod, pixel art included, written to ~/.claude/modster-hunter/content/. Use when someone playing Modster Hunter wants to make, draw, import (PNG or GIF) or change their own Modster or biome, add a Modster to a biome, or hide built-in ones. Not for contributing built-in content to the Modster Hunter repo.
---

# Create Modster Hunter content

You help the player make their own Modsters (creatures) and biomes (areas).
Everything goes in their content folder, `~/.claude/modster-hunter/content/`,
which the mod loads at the start of every session next to the built-in content.

## Before you start

- **The helper.** `scripts/modster-content.mjs` in this skill's base directory
  (the folder holding this SKILL.md) converts, draws, previews and checks.
  Run it as `node "<base>/scripts/modster-content.mjs" <command> …`. Built-in
  content is at `<base>/../../content/`.
- **Node.** Run `node --version`. The helper needs 22.18 or newer. Without it,
  follow [Without Node](#without-node) and tell the player once what that
  limits.
- **Look first.** List `~/.claude/modster-hunter/content/` and the built-in
  `modsters/` and `biomes/`, so new ids are new and you know what exists.
- **Scratch files** (grids, previews) go in a temporary folder, never in the
  content folder.

## Rules

- **The player decides; you suggest.** Ask one field at a time, with 2–3
  suggestions and room for their own idea. Never present a finished design for
  a yes/no.
- **Never overwrite without asking.** If `modsters/<id>/` or `biomes/<id>/`
  already exists in the content folder, show what's there and ask.
- **Reusing a built-in id replaces that built-in entirely** (no field merge).
  Say so before doing it, and that the copy won't get later updates to the
  built-in. To hide a built-in instead, use `settings.json` (below).
- **Ids are permanent**: the collection is stored by id. To rename, change
  `name`, never `id`.
- **Original art only.** Don't draw characters from games, shows or brands,
  even "inspired by". Take ideas from a reference, not its look.
- **Friendly text.** Names, descriptions and dex entries stay short,
  playful and family-safe.
- **Follow the format exactly**: [reference/format.md](reference/format.md).
  Unknown fields are errors. User Modsters have no `dex.number`.
- **Write only in the content folder**, and only the files below.

## Make a Modster

1. **Design**, one question at a time:
   - Concept, and which biome it lives in (see step 4).
   - `name` (≤ 24 characters, must fit the band) and a one-line
     `description` (≤ 120).
   - Dex: one or two `types` (the first is the main one), a `category` like
     "Seed Modster", `heightM`, `weightKg`, and the dex `entry` (≤ 240).
   - Leave `rarity`, `maxAttempts`, `catchRate` and `shinyChance` as `null`
     unless they ask. Rarity then comes from the biome weights.
2. **Sprite.** Make `modsters/<id>/` and pick one way in:
   - **They have a PNG sheet** (frames side by side, same size each): copy it
     in as `sprite.png`, and ask how many frames it holds.
     Use `"sprite": { "file": "sprite.png", "frames": N }`.
   - **They have a GIF**: `convert <file.gif> --out modsters/<id>/sprite.sprite.json`,
     then use `"sprite": { "file": "sprite.sprite.json" }` (no `frames`).
   - **You draw it**: see [Drawing](#drawing). It ends in `sprite.png` plus
     `frames`.
   - Optional `"fps"` 1–12 (default 6).
3. **Preview** every sprite before going on:
   `preview <sprite> [--frames N] --out <tmp>/preview.png`. Open the PNG to look
   at it, show the player, and fix colors that vanish on dark or light.
4. **Put it in a biome.** A Modster only appears in a biome that lists it:
   - **Their own biome:** add `{ "id": "<id>", "weight": W }` to its `modsters`.
   - **A built-in biome:** copy its `biome.json` into
     `biomes/<biome-id>/biome.json` in the content folder and add the entry.
     That copy replaces the built-in biome (say so, see Rules).
   - Show the odds table before writing (see [Odds](#odds)).
5. **Write `modster.json`** (format in [reference/format.md](reference/format.md)).
6. **Check** and finish (see [Check and finish](#check-and-finish)).

## Make a biome

1. Ask, one at a time: `name` (≤ 32), `description` (≤ 120), `accentColor`
   (`#rrggbb`, tints the idle line), pacing `encounterEverySec` `[min, max]`
   seconds (default `[10, 30]`), and the roster: existing Modsters to reuse
   (built-in or theirs) and new ones to make.
2. Suggest a mix of at least one common, one uncommon and one rare Modster, and
   show the odds table before writing.
3. Write `biomes/<id>/biome.json`. Make new Modsters with the steps above.
   An optional background is a one-frame sprite: `convert bg.png --frames 1
   --out biomes/<id>/background.sprite.json`, kept subtle so Modsters stay
   readable, and `"background": "background.sprite.json"`.
4. Check and finish.

## Odds

The chance of each Modster is `weight ÷ sum of the biome's weights`. Unless the
Modster sets `rarity`, its share gives its tier, which sets how hard it is to
catch:

| Tier | Share | Throws | Catch chance |
| --- | --- | --- | --- |
| common | ≥ 20% | 3 | 50% |
| uncommon | 5% to < 20% | 3 | 35% |
| rare | 1% to < 5% | 4 | 20% |
| legendary | < 1% | 5 | 8% |

Show a table of each Modster's percent and tier whenever weights change.

## Drawing

1. Agree on size and colors first. Up to 48×48 px; the height must be even.
   Up to 14 px tall shows in the band of an 80×24 terminal. Bigger sprites
   show in full in bigger terminals or the encounter pane (`/modsters hunt`),
   and as text elsewhere. Suggest about 24×14 unless it needs room. Use ≤ 16 colors
   and a 2–4 frame idle animation.
2. Write a grid file in the scratch folder: one character per pixel, every row
   and frame the same size.
   ```json
   {
     "palette": { ".": "transparent", "k": "#1b1b1b", "g": "#4caf50", "l": "#a5d6a7", "w": "#ffffff" },
     "frames": [
       ["..kkkk..", ".kllggk.", "kgwkgwgk", "kggggggk", "kggggggk", ".kggggk.", "..kkkk..", "........"],
       ["........", "..kkkk..", ".kllggk.", "kgwkgwgk", "kggggggk", "kggggggk", ".kkkkkk.", "........"]
     ]
   }
   ```
3. `draw <tmp>/grid.json --out ~/.claude/modster-hunter/content/modsters/<id>/sprite.png`.
   It refuses a grid that wouldn't make a valid sprite, and prints the
   `"sprite"` line for `modster.json`.
4. Preview, look, show the player, and adjust. What reads at this size:
   - 2–3 bold features; a big head, small body, big eyes with a shine pixel.
   - A dark outline outside; three tones per color, lit from the top left.
   - Animation moves of 1–2 pixels: a bob, a blink, an ear flick.
   - After a few passes that still don't read, suggest a pixel editor
     (Aseprite, LibreSprite, Piskel) and importing a PNG sheet.

## Hide built-ins

`settings.json` in the content folder can list ids to switch off without
deleting anything:

```json
{ "schemaVersion": 1, "disabledBiomes": ["saltbreeze-bay"], "disabledModsters": ["mossbeast"] }
```

To turn off all built-in content, the player sets **Include built-in content**
off in `/config` for Modster Hunter. Then run `check` with `--without-builtins`.

## Check and finish

1. Run `check` (it reads `~/.claude/modster-hunter/content/` by default and
   writes nothing). Fix every error and run it again until it says
   `0 errors`. Warnings are fine, but mention them.
2. Tell the player:
   - which files you wrote, and the odds of each changed biome;
   - content loads when a session starts, so their changes show from their
     next session;
   - each session picks one biome at random, so a new biome may take a few
     sessions to come up.

## Without Node

- A PNG sheet still works: the mod reads it directly (`"file": "sprite.png"`,
  `"frames": N`).
- A GIF can't be converted: ask for a PNG sheet instead (most pixel editors
  export one).
- Drawing needs the helper. Offer a PNG from a pixel editor, or installing
  Node 22.18+.
- Check by hand against [reference/format.md](reference/format.md), field by
  field. A file with an error is skipped without a message in the game, so be
  careful.
