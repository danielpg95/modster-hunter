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
     most 24 KiB. Make it from a reference (the prompt below), as in the
     `add-modster` skill's desktop path: `ref-sprite --desktop` with a crop of
     the whole strip, frames in a scratchpad script (a sway, drifting light),
     saved at full compression. Crop the reference between its tall features
     (trunks, pillars) on both sides, so the seams fall in a quiet gap; line
     the edges up by hand if they still don't meet. Use the reference as a
     whole scene: `--edges none`, so nothing is cut out. Animate it as in
     [Animating a background](#animating-a-background). Check it and look at
     the seams:

     ```bash
     node tools/sprite.mjs desktop.png --frames N --fps F --desktop background --preview preview.html
     ```

     The page tiles it three times side by side; a seam that doesn't line up
     shows there. Open it for the user and wait for approval.
   - **Terminal** (`"background": "background.sprite.json"`): 1–4 frames about
     12 px tall, converted like a Modster's sprite.
   - **Both:** the desktop one first, then reduce the terminal one from it.
6. **Particles: style, and their desktop art** (decisions 0026 and 0046).
   Ask what falls, drifts or rises in this place, with the background: it's
   most of the scene's motion. `particles.style` (`leaf`, `snow`, `sand`,
   `bubble`, `sparkle`) sets how they move, and `density` how many. On desktop,
   `"desktopParticles": { "file": "particles.png", "frames": N }` gives them a
   look of their own; without it they're squares in `particles.color`. See
   [Particle art](#particle-art).
7. **Credit** any art in `plugin/content/CREDITS.md`, one row per file;
   `check:content` fails without the desktop row.
8. **Validate** with `npm run check:content` (prints every biome's odds table)
   and `claude plugin test ./plugin`.

## Desktop background reference prompt

Fill it from the biome's `name`, `description`, `accentColor` and `particles`,
and give it to the contributor. Ask for a wide image; the reduction to at most
192×48 takes out a lot, so some busyness is fine, but a calm scene reads best
behind Modsters.

```
Pixel art game background, a wide side-scrolling strip for a cozy creature
game: a calm <kind of place> scene, side view, about four times wider than tall.

"<Biome name>": <the description, turned into what's seen: landforms, plants,
rocks, water, light>. <Its particles as a hint of motion: falling leaves, sand,
bubbles, snow>.

• Muted, low-contrast colours (<the biome's main colours>) so small creatures
  stand out clearly in front of it. Keep the main tone close to <accentColor>.
• Detailed pixel art with 2–3 shading tones per colour, crisp pixels, no
  blur, no gradients, no glow.
• The left and right edges must continue into each other: the same ground
  height, nothing cut in half at either edge, so the strip repeats
  seamlessly side by side.
• No characters, no animals, no text, no frame or border. Ground along the
  whole bottom edge, the tallest features along the top.
```

Why each line: generators draw characters into scenes unless told not to;
"muted" keeps the Modster readable in front; the seam line saves hand repair;
"crisp pixels" avoids blur that the reduction turns into noise.

## Animating a background

Terminal backgrounds loop a few frames; a desktop one should too, subtle but
alive. What worked for Whispering Forest (P5-48):

- **Move only loose, low things:** ferns, grass, bushes, water, flames. Pick
  them by colour (leaf greens lead red and blue) and move a pixel only onto a
  spot of the same kind, so trunks, ground and rocks hold still.
- **Keep big rooted things still.** Swaying the canopy while its trunks stayed
  fixed looked uncanny: the branches seemed to slide off the trees.
- **1 px, in a rest, lean, rest, lean loop:** 4 frames at the biome's
  `backgroundFps`. Bigger moves look like the scene sliding.
- **Wrap every shift within the tile,** so each frame still tiles.
- **Count the changed pixels:** around 10–20% per frame was subtle but alive.
- **Mind the budget:** frames side by side compress well when they're alike
  (4 frames came to 15 KiB of the 24).

Particles (`particles` in `biome.json`) already drift on top, so the
background's own motion can stay small.

## Particle art

What falls in Whispering Forest is a small leaf that turns and flips as it
falls (P5-48). The same approach suits petals, needles, snowflakes or embers:

- **Draw it in code:** at this size a reference doesn't help. A pointed oval
  with a midrib and a 1-px outline, filled pixel by pixel.
- **Small:** 8×8 per frame (16×16 is the limit). It shows at about 16 CSS px,
  and 12×12 already looked too big over the forest.
- **2–4 frames that tumble:** turn it, then flip it so its paler underside
  shows. The frames step at 8 fps, and each particle starts on its own frame.
- **Colour it from the scene:** take the hue of what it comes from (the
  canopy's blue-green), a step lighter than the background so it still reads
  as motion, with a paler underside.
- **Check it in the scene:** `node tools/sprite.mjs particles.png --frames 4
  --fps 8 --desktop particles` checks the rules. Judge it over the background
  at real size, not alone. Show the user and wait for approval.

