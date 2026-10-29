---
name: add-modster
description: Add a new built-in Modster (creature) to the Modster Hunter repo's plugin/content/ — design, desktop art, a terminal sprite or both, modster.json, credits, and validation. Use when a contributor wants to create, draw or add a Modster to the built-in content. Not for a player's own Modsters in ~/.claude/modster-hunter/content/ (that's the mod's create-modster-content skill).
---

# Add a built-in Modster

Built-in content lives in `plugin/content/`. Follow `docs/CONTENT_FORMAT.md` and
`.claude/rules/content.md`. (Players adding their *own* Modsters use the
mod's `create-modster-content` skill in `plugin/skills/`.)

## Desktop, terminal or both

A Modster can have desktop art (`desktopSprite`), a terminal sprite (`sprite`),
or both (decision 0045). Ask the user which, before the design:

- **Desktop** (the default for new built-ins): hi-res pixel art for the Desktop
  app, up to 128×128 per frame, up to 64 colours, 2–8 frames, at most 48 KiB.
  On the terminal it shows as text. Since Saltbreeze Bay was filled (P5-21),
  built-in art is made this way.
- **Terminal:** today's sprite, at most 48×32 and 24 colours (0033, 0034). On
  desktop it's drawn as vectors at the same size.
- **Both:** make the desktop sheet first, then reduce the terminal sprite from
  it. Never draw the terminal one first and blow it up: they must be the same
  design, and the detail lives in the desktop one.

The steps below say which parts belong to which. [Desktop art from a reference
image](#desktop-art-from-a-reference-image) is the desktop path;
[From a reference image](#from-a-reference-image) is the terminal one.

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
   - Look: color scheme, size, and the idle animation.
     - **Desktop:** up to 128×128 per frame, up to 64 colours, 2–8 frames at
       its own fps. It shows at 1 CSS px per pixel in the pane, 0.75 in the
       Collection and 0.5 in the band, so a 128 px Modster is as big on screen
       as a 32 px terminal one is today. Use the room for detail: shading,
       texture, a readable face.
     - **Terminal:** ≤ 24 colors (decision 0034) and a 2–4 frame idle. Every
       Modster, any tier, is at most 32 px tall (even) and 48 px wide (decision
       0033). Pick the size the design needs within that. Tell the user where
       each size shows: up to 14 px tall in the band of an 80×24 terminal, up
       to 30 px at 140×40, and the full 32 px in the encounter pane (`/modsters
       hunt`) and the collection. Taller than the band shows the compact text
       band there.

   Check `plugin/content/modsters/` so the id and look are new. A reference
   the contributor made themselves (drawn or generated) can be converted as
   is, see [From a reference image](#from-a-reference-image). Any other image
   (an existing game's creature, someone else's art) is for ideas only: the
   art must be original and not recognizable as an existing creature.
2. **Create the folder** `plugin/content/modsters/<id>/`.
3. **Make the art.** For desktop (or both, first), follow [Desktop art from a
   reference image](#desktop-art-from-a-reference-image), which ends with
   `desktop.png` checked and previewed; for desktop only, skip on to step 5.
   For a terminal sprite, read on. **Make the sprite sheet** `sprite.png`: frames side by side, equal size,
   transparent background. Prefer [From a reference image](#from-a-reference-image):
   it gives the most detail and keeps the roster's style consistent. Draw from
   scratch only for small, simple Modsters or when the contributor has no
   reference. If you draw it programmatically, write the drawing script to the
   scratchpad, not the repo. Look at the result (open the PNG,
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
4. **Convert** the terminal sprite: `npm run sprite -- plugin/content/modsters/<id>/sprite.png --frames N`.
   Never hand-edit the output.
5. **Write `modster.json`** from `docs/templates/content/modster.json`, with
   `"sprite": { "file": "sprite.sprite.json", "fps": … }` for terminal art and
   `"desktopSprite": { "file": "desktop.png", "frames": N, "fps": … }` for
   desktop art; desktop only leaves `sprite` out. Leave
   `rarity` to the intended tier (required, decision 0030). Leave `maxAttempts`
   and `catchRate` as `null` unless the user asks for an override (decision 0004). Fill in every `dex` field; `dex.number` is the
   next free number among the official built-in Modsters (decision 0017).
   Placeholder Modsters use numbers from 901 up.
6. **Add it to a biome:** an entry `{ "id": "<id>" }` in that biome's
   `biome.json`, with its own `"rarity"` only if it belongs to another tier
   there. Show the user the biome's resulting odds table (tier share and
   percent per Modster).
7. **Credit it** in `plugin/content/CREDITS.md`: one row per file
   (`sprite.png`, `desktop.png`). `check:content` fails without the desktop row.
8. **Validate:** `npm run check:content` (prints the biome's odds table) and
   `claude plugin test ./plugin`.
9. **Preview in the game:** the band only draws in an interactive session.
   For terminal art, ask the user to run `claude --plugin-dir ./plugin` (the
   biome is random; restart until it's the right one, or use `/modsters
   hunt`). For desktop art, it's the Desktop app's Code tab: offer to point
   their install at this checkout (`claude plugin marketplace add <repo>`,
   then `/reload-plugins`) and switch it back after. Adjust colors that read
   poorly on a dark or light background.
10. **Show it in the PR:** the PR description needs a preview of every new or
    changed Modster: its art enlarged, every frame, on a dark and a light
    background (the PR template's "Content and art" checklist). Commit the
    preview image to `docs/previews/<id>.png` (or `.gif`) and embed it with a
    raw GitHub link pinned to the commit:
    `![<id>](https://raw.githubusercontent.com/danielpg95/modster-hunter/<sha>/docs/previews/<id>.png)`.

## From a reference image

The contributor makes a detailed reference of their own design (drawing or
image generator), `npm run ref-sprite` shrinks it to sprite size, and you
finish the parts that don't survive the shrink by hand (P5-22). This is how the
P5-19 Whispering Forest roster was made.

1. **Write the reference prompt** from the agreed design, in the house style,
   and give it to the contributor. Fill every slot from the design the user
   approved in step 1; don't invent features they didn't pick. Draw on all of
   its fields, so the art matches what the game says about the Modster:
   - **Concept and look:** body, colors, size, view, the 2–3 bold features.
   - **`description` and `dex.entry`:** visible details and personality they
     mention (Acornsprite's wings "glow when it hums", Shellsprout's sprout
     that "waves when it's happy"). Turn behavior into a pose or expression.
   - **`dex.types`:** palette hints (grass greens, rock greys, fairy pinks) and
     what the creature is made of.
   - **`dex.category`, height and weight:** proportions and heft (a "Moss Bear"
     is round and heavy; a 0.15 m fairy is tiny and light).
   - **The biome** (`name`, `description`, `accentColor` in its `biome.json`):
     context that shapes the Modster itself. A mole with a crystal on its head
     is mossy and leafy in the Whispering Forest, but pale with glowing pink
     crystal in the Crystal Grotto. Use the first biome if it's in several.
     It's design context only: no scenery in the image.

   ```
   Pixel art game sprite, very low resolution: a tiny game sprite scaled up,
   drawn on a grid of big chunky square blocks — about 30 blocks tall and at
   most 46 blocks wide (wider than tall is fine). Every detail is single
   blocks or 2×2 clusters; nothing smaller than one block. No anti-aliasing,
   no gradients, no glows or reflections. Each part has at most two tones:
   one lit, one shadow.

   "<Name>", <concept in one line>, <view: front, or three-quarter / side
   facing left or right>, <pose>.
   It lives in <biome name> (<biome description>), so <how its home shows on
   the creature: materials, textures, colors, adaptations>.
   <Body: shape, main colors, texture (fur, bark, scales, moss)>.
   <2–3 bold features that make it this Modster: what they are, their colors>.
   <Face: eye shape and color, nose, mouth, expression>.
   <Props or accessories, if any: what, where, how they're held>.

   • Sizes in blocks: outline exactly 1 block thick, eyes at least 3 blocks
     wide, patterns (scales, spots, facets, crystals) at least 4 blocks across.
   • Colours: 24 at most, not counting the background.
   • Background: one flat, solid light-grey colour — no pattern, checkerboard,
     gradient, glow or shadow. Full body visible, centered, with space around
     it; nothing touches the edges.
   ```

   Keep the technical setup first and the spec lines last (P5-26). A
   reference drawn on a grid close to sprite size shrinks almost pixel for
   pixel; one drawn with fine detail turns to noise. Saying "48 × 32" alone
   isn't enough: generators don't count pixels, so describe the look (big
   chunky blocks) and give minimum sizes in blocks. Ask for a little under
   the 48 × 32 limit, since generators tend to overshoot. Keep the minimum
   sizes even though they look large: references never land exactly on the
   grid, and tiny features are the first thing a shrink destroys. Ask for a
   flat background, not a transparent one: some generators can't save
   transparency and paint a checkerboard into a JPEG instead. Describe
   features as what they are (crystals, scales), not as "colour blocks", or
   the generator draws blocks.

   Rules that make the reference convert well:
   - **Keep the dark outline and the space around it.** The cut-out follows the
     outline; anything touching the image edge leaks.
   - **Big head, big eyes, a clear face.** At 32 px tall a face gets about
     8–12 px; small faces turn to mush and have to be redrawn.
   - **Compact shapes.** Very long parts (a long log, a wide canopy) force the
     sprite to shrink to fit 48 px wide. Ask for a shorter version.
   - **Few thin parts.** Needles, whiskers, thin swords and legs vanish at
     sprite size; expect to redraw them, or ask for chunkier ones.
   - **Name every color that matters** (eye color, accent, the color a part
     must not share with another), so the palette comes out right.
   - **One clear body shape.** Coils piled on coils, or a busy pattern over
     the whole body, merge into a lump at 32 px. A long creature reads better
     as a close-up (neck and head) or a curve that never overlaps itself.
   - **If a regenerated reference gets worse, keep what worked.** Combining
     the current sprite's body with the new reference's best part (Amethowl's
     crystal wings) can beat both.

   Two P5-19 prompts as examples. A creature:

   ```
   Pixel art game sprite of "Hollowmask", a raccoon creature peeking out of
   a hollow log, side view of the log with the open end facing the viewer
   on the left. The raccoon's head and front paws come out of the log's
   round opening (pale wood ring around a dark hollow). Its face looks
   straight at the viewer: grey fur, pointed ears with dark insides, and
   instead of a normal raccoon mask it wears a dark green leaf as a bandit
   mask across its eyes, with pointed leaf tips sticking out past both
   sides of its head. Big clear ice-blue eyes inside the leaf mask, a white
   muzzle, a small dark nose and a cat-like "w" mouth.
   A bushy tail comes out of the back of the log and curls up, ringed in
   light grey and the same dark leaf green as the mask.
   The log is brown bark with grain lines and knots; moss grows only on the
   front half of the log's top, near the raccoon.
   Clean dark outline around everything, flat pixel shading, readable at
   small size. Whole log and tail visible, centered, with space around it.
   Simple soft background.
   ```

   A character with a prop:

   ```
   Pixel art game sprite of "Musketail", a small brave mouse swordsman,
   three-quarter view facing left, standing on its hind legs. Grey-brown
   fur with a cream belly, a pointed snout with a pink nose, big round
   ears with pink insides (one ear visible above the hat), one big shiny
   dark eye.
   It wears a dark brown musketeer hat with a wide brim and a long cream
   feather sweeping back. Over its shoulders hangs a cape made from a big
   red autumn leaf: draped with soft folds, a lighter center vein, and the
   leaf's pointed tip at the hem.
   In its raised paw it holds a sword made from a long green pine needle,
   with an acorn cap as the hand guard, held up and to the side with a
   proud pose. A thin pink tail curls behind it.
   Clean dark outline around the whole character, flat pixel shading,
   readable at small size. Full body visible, centered, with space around
   it, nothing touching the edges. Simple soft background.
   ```

   What happened with these: Hollowmask's log was long, so the sprite came
   out width-limited and its face small; the log was shortened and the face
   redrawn. Musketail's thin pine-needle sword vanished and was redrawn by
   hand. Both are the expected finishing work.
2. **Keep the reference out of the repo.** Save it outside the repo (Downloads,
   the scratchpad). Credits name the contributor as the artist; don't name the
   tool they used.
3. **Convert it to PNG** if needed (`sips -s format png ref.jpeg --out ref.png`
   on macOS, or any image editor), look at it, and pick a crop with a margin
   around the subject.
4. **Shrink it:**

   ```bash
   npm run ref-sprite -- ref.png --crop X,Y,W,H --size WxH --colors 24 --grid --out base.png
   ```

   Choose `--size` so the subject is at most 32 px tall and 48 wide (0033);
   wide subjects are limited by width. If the subject touches an edge of the
   reference, leave that edge out: `--edges left,right,bottom`. Raise or lower
   `--dark` (default 70) if the cut-out leaks into the subject or keeps
   background. Show the result enlarged on dark and light.
5. **Finish by hand.** The shrink keeps outlines, big shapes, textures and
   palette; it loses small things. Expect to redraw:
   - **Faces:** eyes (2×2 to 3×3 with a shine, high contrast against what's
     around them), nose, mouth. Never let a muzzle and a body part of the same
     color touch without an edge between them.
   - **Thin parts:** swords, stems, needles, legs, antennae.
   - **Strays:** background specks, ground under the feet.
   - **Parts that crowd the face** when the canvas is small.

   Edit `base.grid.txt` (one letter per pixel) and rebuild with
   `npm run ref-sprite -- --from-grid base.grid.txt`, or draw over `base.png`
   in a script or pixel editor. Keep ≤ 24 colors (0034).
6. **Animate.** Build the 2–4 frames from the finished base. Move whole parts
   1–2 px (a head peek, a cape hem, a sword poke), rotate parts around a joint
   for wings or arms instead of sliding them, and keep a blink. Redraw
   outlines after moving a part so they stay closed.
7. Continue with step 4 (convert) above.

## Desktop art from a reference image

The desktop path (decision 0045), worked out on Shellsprout (P5-46). The
contributor makes a detailed reference of their own design, `ref-sprite`
reduces it, and you clean it up and animate it. Show the user every pass and
wait for their approval before it goes in.

1. **Ask for a reference.** The same prompt rules as for terminal art above
   (house style, every design field, the biome as context only), with the
   desktop's room: detailed pixel art about 100–120 pixels tall, full
   shading and texture, a clear dark outline, a big readable face, up to 64
   colours, the whole body visible with space around it. A busy scene is fine
   if the creature has a clear outline: the tools cut it out.
2. **Convert and crop:** turn it into a PNG (`sips -s format png ref.jpg --out
   ref.png` on macOS), look at it, and pick a crop around the subject with a
   little margin.
3. **Reduce it:**

   ```bash
   npm run ref-sprite -- ref.png --crop X,Y,W,H --size WxH --desktop --out base.png
   ```

   Keep the crop's aspect for `--size`, at most 128 on each side; 48 colours
   is the default (`--colors`, up to 64). Look at it enlarged on dark and
   light. Background the outline didn't stop shows up as stray sky or ground:
   - `--clear "#8fd3f0,#6b4a2b"` clears pixels near those colours that reach
     the outside (sky between leaves, dirt under the feet). Sample the
     colours from the reference. Enclosed matches stay; they're usually
     highlights.
   - `--trim-edges 190` clears pale specks left on the outer edge.

   Repeat with other values until the cut-out is clean.
4. **Animate** in a scratchpad script (never the repo) on `base.png`: 2–8
   frames side by side, all the same size. Small, readable moves at this
   size: a part swaying 1 px, a blink (paint the eyes in the face colour and
   draw a closed-eye curve), a bob. Keep every pixel fully opaque or fully
   clear. Write the sheet with pngjs at `{ deflateLevel: 9, deflateStrategy: 1 }`;
   default compression made Shellsprout's 4 frames 49 KiB, maximum made them 12.
5. **Check and preview:**

   ```bash
   node tools/sprite.mjs desktop.png --frames N --fps F --desktop modster --preview preview.html
   ```

   It checks every 0045 rule (size, frames, colours, crisp alpha, 48 KiB) and
   writes a page with the frames enlarged and the mod's own Svg at pane,
   Collection and band size, plus the uncaught silhouette. Open the page for
   the user, unasked, and wait for approval.
6. **Save it** as `plugin/content/modsters/<id>/desktop.png`. For both
   versions, make the terminal sprite now from a frame of the desktop sheet:
   `npm run ref-sprite -- desktop.png --crop 0,0,W,H --size …` (no
   `--desktop`: at most 48×32 and 24 colours), then finish it by hand as in
   [From a reference image](#from-a-reference-image) step 5. It keeps the
   design, not the frame count: give it its own 2–4 frame idle.
7. Continue with step 5 (`modster.json`) above.

