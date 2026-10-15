---
name: add-modster
description: Add a new built-in Modster (creature) to the Modster Hunter repo's plugin/content/ — design, pixel-art sprite sheet, modster.json, conversion, credits, and validation. Use when a contributor wants to create, draw or add a Modster to the built-in content. Not for a player's own Modsters in ~/.claude/modster-hunter/content/ (that's the mod's create-modster-content skill).
---

# Add a built-in Modster

Built-in content lives in `plugin/content/`. Follow `docs/CONTENT_FORMAT.md` and
`.claude/rules/content.md`. (Players adding their *own* Modsters use the
mod's `create-modster-content` skill in `plugin/skills/`.)

## Before you start

- The repo tools need Node 22.18+. If `node --version` is older, use a newer
  one (`nvm use 22`, or put it first on `PATH`) for `npm run sprite` and
  `npm run check:content`.
- The Modster's biome must exist. If it doesn't, run the `add-biome` skill
  first for its theme, then come back here.
- `check:content` requires each biome to have a common, an uncommon and a
  rare Modster (P2-09). A biome's first Modsters can't pass it alone: keep
  them on the task branch until the biome's mix is complete, then open the PR.

## Steps

1. **Ask the user for the design, one field at a time, before drawing.** The
   user decides; you only suggest. For each field, ask a question with 2–3
   suggestions and room for their own answer. Never present a finished design
   for a yes/no approval.
   - Concept, biome(s) and intended tier.
   - Name and the one-line `description` (≤ 120 chars).
   - Dex: one or two types (from the 18 in decision 0017; the first is the
     primary one, decision 0022), category ("Seed Modster"),
     height, weight, and the entry text (≤ 240 chars).
   - Look: color scheme (≤ 24 colors, decision 0034), size, and a 2–4 frame idle animation.
     Every Modster, any tier, is at most 32 px tall (even) and 48 px wide
     (decision 0033). Pick the size the design needs within that. Tell the
     user where each size shows: up to 14 px tall in the band of an 80×24
     terminal, up to 30 px at 140×40, and the full 32 px in the encounter pane
     (`/modsters hunt`) and the collection. Taller than the band shows the
     compact text band there.

   Check `plugin/content/modsters/` so the id and look are new. If the user
   shares a reference image, take ideas from it, not its look: the art must be
   original and not recognizable as an existing game's creature.
2. **Create the folder** `plugin/content/modsters/<id>/`.
3. **Make the sprite sheet** `sprite.png`: frames side by side, equal size,
   transparent background. If you draw it programmatically, write the drawing
   script to the scratchpad, not the repo. Look at the result (open the PNG,
   enlarged, on a dark and a light background) and show it to the user before
   continuing. What reads at this size:
   - A concept with 2–3 bold features. Small canvases (under ~20 px tall)
     leave little room for a face; give detailed designs the room, up to 32 tall.
   - For round bodies, build from shaded ellipses (lit from the top left, with
     an automatic outline) and place eyes and details by hand; typing big
     shapes pixel by pixel comes out stiff.
   - A three-quarter view, big head and small body, big eyes with a shine pixel.
   - Three tones per color (shadow, base, highlight), lit from the top left.
     A dark outline outside; a darker shade of the fill inside.
   - Animation moves of 1–2 pixels (an ear flick, a blink, a bob). Subtler
     changes don't show.

   If a few passes still don't read well, say so and suggest a human artist
   in a pixel editor (Aseprite, LibreSprite, Piskel) rather than iterating.
4. **Convert:** `npm run sprite -- plugin/content/modsters/<id>/sprite.png --frames N`.
   Never hand-edit the output.
5. **Write `modster.json`** from `docs/templates/content/modster.json`. Leave
   `rarity` to the intended tier (required, decision 0030). Leave `maxAttempts`
   and `catchRate` as `null` unless the user asks for an override (decision 0004). Fill in every `dex` field; `dex.number` is the
   next free number among the official built-in Modsters (decision 0017).
   Placeholder Modsters use numbers from 901 up.
6. **Add it to a biome:** an entry `{ "id": "<id>" }` in that biome's
   `biome.json`, with its own `"rarity"` only if it belongs to another tier
   there. Show the user the biome's resulting odds table (tier share and
   percent per Modster).
7. **Credit it** in `plugin/content/CREDITS.md`.
8. **Validate:** `npm run check:content` (prints the biome's odds table) and
   `claude plugin test ./plugin`.
9. **Preview:** the band only draws in an interactive session, so ask the
   user to run `claude --plugin-dir ./plugin` (the biome is random; restart
   until it's the right one, or use `/modsters hunt`). Adjust colors that read
   poorly on a dark or light background.
10. **Show it in the PR:** the PR description needs a preview of every new or
    changed Modster: its sprite enlarged, every frame, on a dark and a light
    background (the PR template's "Content and art" checklist). Save the
    preview from step 3 and ask the user to attach it to the description, or
    attach it yourself if you can upload images.
