---
name: create-modster-content
description: Create your own Modsters, biomes and catchers for the Modster Hunter mod, pixel art included, written to ~/.claude/modster-hunter/content/. Use when someone playing Modster Hunter wants to make, draw, import (PNG or GIF) or change their own Modster, biome or catcher (the throw animation that catches a Modster), add a Modster to a biome, delete one of their own, or hide built-in ones. Not for contributing built-in content to the Modster Hunter repo.
---

# Create Modster Hunter content

You help the player make their own Modsters (creatures), biomes (areas) and
catchers (the animation a throw plays).
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
  `modsters/`, `biomes/` and `catchers/`, so new ids are new and you know what
  exists.
- **Scratch files** (grids, previews, drawing scripts) go in a temporary
  folder, never in the content folder.
- **Access.** The content folder is outside the player's project, so the first
  read or write there asks them for permission. Say what it's for when it
  comes up.

## Rules

- **The player decides; you suggest.** Ask one field at a time, with 2–3
  suggestions and room for their own idea. Never present a finished design for
  a yes/no.
- **Never overwrite without asking.** If `modsters/<id>/`, `biomes/<id>/` or
  `catchers/<id>/` already exists in the content folder, show what's there and
  ask.
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
- **Delete only the player's own items**, one at a time, after they confirm
  ([Delete your own](#delete-your-own)). Never delete built-in content.

## Make a Modster

1. **Design**, one question at a time:
   - Concept, and which biome it lives in (see step 4).
   - `name` (≤ 24 characters, must fit the band) and a one-line
     `description` (≤ 120).
   - Dex: one or two `types` (the first is the main one), a `category` like
     "Seed Modster", `heightM`, `weightKg`, and the dex `entry` (≤ 240).
   - `rarity`: how rare it is, `common`, `uncommon`, `rare` or `legendary`
     (required; suggest one and let them choose). Leave `maxAttempts`,
     `catchRate` and `shinyChance` as `null` unless they ask.
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
   at it, and fix colors that vanish on dark or light. After every render,
   first pass included, post the preview's full path in chat on its own line
   so the player can open it, then wait for their reply before asking whether
   to keep it.
4. **Put it in a biome.** A Modster only appears in a biome that lists it:
   - **Their own biome:** add `{ "id": "<id>" }` to its `modsters`. Add
     `"rarity"` to the entry only to give it another tier in that biome.
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

## Make a catcher

A catcher is the animation a throw plays: it flies in, takes the Modster,
rocks, then clicks shut or breaks. The rocks hint at the result (3 means a
catch). The player picks the one in use in `/modsters`, tab `4: Catchers`. It
only changes looks, never the odds. Format: [reference/format.md](reference/format.md).

1. **Design**, one question at a time:
   - The idea, `name` (≤ 32) and a one-line `description` (≤ 120).
   - `style`. Explain the three, and suggest one from the idea:
     - `contain`: the Modster shrinks in and the catcher closes, like the
       built-in glass jar, seed pod and lantern.
     - `cover`: a pattern stretched over the Modster, which stays in view and
       struggles, like the net.
     - `custom`: the player sets every beat.
2. **For `custom`, settle how it holds the Modster first.** Only two ways
   work. A Modster is almost always bigger than its catcher, so an anchored
   catcher that keeps it at full size overflows. Suggest one of these:
   - **Stretched over it:** `"place": "stretch"`, like the net, which is
     bigger than the Modster.
   - **Caught completely inside:** `"modster": "shrink-in"` on `take`, then
     `hidden`, like the jar, or the seed pod, whose husk opens, takes the whole
     Modster in and snaps shut.

   Then ask about each beat in turn: `throw` (`path`), `take`, `settle`,
   `rock`, `caught` and `broken`. For each, ask what the Modster does and where
   the catcher sits. Explain each choice in a few words.
3. **Size and colors.** For `contain` and `custom`, keep the catcher at most
   20 px tall and 22 wide, the size of the smallest built-in Modster (Dunebun),
   so it shows on every Modster. A bigger one still works, but on smaller
   Modsters the throw shows as a dot count instead. For `cover`, the art is a
   tile about 8×8 that repeats over the Modster. Leave gaps so the Modster
   shows through, and use a dark color for knots or edges: `rimIndex` points
   at it. Use ≤ 24 colors.
4. **Draw the closed frame first** (frame 0). Write a grid as in
   [Drawing](#drawing), then
   `draw <tmp>/grid.json --out ~/.claude/modster-hunter/content/catchers/<id>/sprite.png --catcher`.
   - `lidRows`: for a lid that lifts and flies off, the top rows of frame 0
     that are the lid.
   - `glowIndex`: for a part that lights up with the Modster's color once it's
     inside (the jar's contents, the pod's seam, the lantern's flame). Draw it
     in its empty color. A small white shine drawn beside it keeps it bright.
   - Add more frames (up to 16) only when the player wants them, for example an
     open lid or a drawn tilt. Name them in that beat's `frames`. Without them,
     the preset makes the motion from frame 0.
5. **Write `catcher.json`**, then preview it:
   `preview-catcher ~/.claude/modster-hunter/content/catchers/<id> --out <tmp>/catcher.html`.
   It plays a catch and both kinds of miss on Elderbark (large) and Dunebun
   (small), on dark and light, and says where the catcher is too big. Open the
   page, post its full path in chat on its own line, and wait for the
   player's reply. Fix colors that vanish on either background. For a
   `custom` catcher, always look at it on a large Modster before finishing,
   and if the Modster pokes out of the catcher, go back to step 2.
6. **Check** and finish (see [Check and finish](#check-and-finish)). Tell the
   player to run `/modsters reload`, open `/modsters`, press `4`, select it with
   `j`/`k` and press `u`. The next throw plays it.

## Odds

An encounter first picks a tier, then one Modster of that tier in the biome,
each equally likely. A Modster's tier is the `rarity` on its biome entry, else
its own. The tier also sets how hard it is to catch:

| Tier | Tier share | Throws | Catch chance |
| --- | --- | --- | --- |
| common | 76% | 3 | 50% |
| uncommon | 19% | 3 | 35% |
| rare | 4.5% | 4 | 20% |
| legendary | 0.5% | 5 | 8% |

A tier with no Modster in the biome is left out, and the others grow to fill
100% in the same proportions. Each Modster's chance is its tier's share split
evenly: three commons get about 25.3% each. Adding a Modster only thins its
own tier. If one tier's Modsters each appear less often than a rarer tier's,
`check` warns: suggest moving some to another tier.

Show a table of each tier's share and each Modster's percent whenever tiers or
rosters change.

## Drawing

1. Agree on size and colors first. Keep it at most 32 px tall and 48 wide (the
   game accepts up to 48 tall, but 32 is the standard); the height must be even.
   Match the built-ins: read the `width` and `height` of a few built-in
   `.sprite.json` files. Most are 16–33 px wide and 14–32 tall, and the
   biggest are rares and legendaries. Sizes of 16×14 or less leave little room
   for detail. Tell the player that up to 14 px tall shows in the band of an
   80×24 terminal; taller sprites show in full in bigger terminals or the
   encounter pane (`/modsters hunt`), and as text there. Use ≤ 24 colors and a
   4-frame idle animation.
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
4. Preview, look, post the path, and adjust. What reads at this size:
   - One identifier feature that makes the Modster recognizable (a glowing
     cap, a crystal claw), plus 1–2 supporting ones. Keep the face small and
     simple unless it is the identifier.
   - Big, simple shapes: each main part 8 px or more across, so it has room
     for three tones.
   - Three tones per color, lit from the top left, and a dark outline.
   - Draw thin parts (limbs, spikes, feathers, fingers) with the outline
     outside the shape; an outline inside eats a 2–3 px part. Give separate
     parts (each crystal, each feather) their own outline so they read apart.
   - Animation moves of 1–2 pixels: a bob, a blink, a glint, a glow that
     pulses.
   - When the player is choosing between colors or poses, render the options
     into one side-by-side image so they can compare.
   - Drawing programmatically (shapes in a script that writes the grid) is
     easier to adjust than typing grids by hand; keep the script in the
     scratch folder.
   - After a few passes that still don't read, suggest a pixel editor
     (Aseprite, LibreSprite, Piskel) and importing a PNG sheet.

## Hide built-ins

The player can press `o` on a biome or Modster in `/modsters` (Collection or
Biomes tab) to turn it off or back on. That writes `settings.json` in the
content folder, which can also be edited by hand to list ids to switch off
without deleting anything:

```json
{ "schemaVersion": 1, "disabledBiomes": ["saltbreeze-bay"], "disabledModsters": ["mossbeast"] }
```

To turn off all built-in content, the player sets **Include built-in content**
off in `/config` for Modster Hunter. Then run `check` with `--without-builtins`.

## Delete your own

The pane can't delete files, so for a player's own item it says to ask you:
"delete my Modster <id>", "delete my biome <id>" or "delete my catcher <id>"
(decision 0032).

1. Check `modsters/<id>/`, `biomes/<id>/` or `catchers/<id>/` exists in the
   content folder. If the id is only built in, say it can't be deleted: a
   Modster or biome can be turned off (`o` in `/modsters`), and a catcher just
   not picked. If the player's item replaces a built-in, say the built-in comes
   back after the delete. If the catcher is the one in use, throws go back to
   the glass jar.
2. List the files you'll remove, and for a Modster any of the player's biomes
   that list it (those entries will be dropped, and a biome left with none
   won't load). Ask the player to confirm. Do nothing without a yes.
3. Remove only that folder. Remove the id from `settings.json` if it's there.
   Offer to remove the dropped entries from the player's biomes too.
4. Their caught record stays in the collection's save, so making the same id
   again brings it back.
5. Tell them to run `/modsters reload` (or start a new session).

## Check and finish

1. Run `check` (it reads `~/.claude/modster-hunter/content/` by default and
   writes nothing). Fix every error and run it again until it says
   `0 errors`. Warnings are fine, but mention them.
2. Tell the player:
   - which files you wrote, and the odds of each changed biome;
   - for a catcher: pick it in `/modsters` → `4: Catchers` with `u`;
   - `/modsters reload` loads their changes now (an encounter in progress
     finishes first); the Settings tab (`/modsters`, then `5`) lists any
     problems;
   - each session picks one biome at random, so a new biome may take a few
     sessions to come up.

## Without Node

- A PNG sheet still works: the mod reads it directly (`"file": "sprite.png"`,
  `"frames": N`).
- A GIF can't be converted: ask for a PNG sheet instead (most pixel editors
  export one).
- Drawing needs the helper. Offer a PNG from a pixel editor, or installing
  Node 22.18+.
- A catcher works the same way: a PNG sheet with `"frames": N`. Its preview
  needs the helper, so check it in a throw after `/modsters reload`.
- Check by hand against [reference/format.md](reference/format.md), field by
  field. A file with an error is skipped without a message in the game, so be
  careful.
