# 0045 — Desktop first: new built-in art is hi-res pixel art for the Desktop app

- **Status:** Accepted
- **Date:** 2026-10-28
- **Decided by:** @danielpg95 (P5-43). First proposed by @victor-aguilars on
  2026-10-27 as an optional 2× or 3× copy of the terminal sprite; reworked
  before it was accepted.

## Context

Desktop support is done (0042, 0043, 0044). It draws the terminal art, which is
held to terminal limits: sprites at most 48×32 (0033) and 24 colours (0034),
backgrounds about 12 px tall (0026), because a terminal cell holds two pixels.

The P5-39 spike (`spikes/p5-39-desktop-art/`, checked in the Desktop Code tab on
2026-10-27) found:

- An embedded PNG (`<image href="data:image/png;base64,…">`) is blank in an
  `isInteractive` Svg (the sandboxed frame), but **shows in an Svg drawn as an
  image** (no `isInteractive`). **SMIL runs there too**: frames switched by
  `visibility`, a sprite sheet stepped by animating `x`, and `animateTransform`.
- A detailed 144×91, 4-frame idle as one sprite-sheet PNG is 3,657 characters.
  As paths (0042) it is 315,007, over the 131072-character Svg limit.

So the desktop can show far more detail than the terminal. The project moves to
the Desktop app first (asked by @danielpg95, 2026-10-28). The desktop quality
bar is set from scratch, not from terminal sizes. Only the spike's technical
findings carry over.

## Options

1. **A desktop sprite as an optional 2× or 3× copy of a required terminal
   sprite** (the first draft of this decision). The terminal sprite still sets
   the size, frames and design, so the new art keeps the terminal's limits.
2. **Desktop first: desktop art is the main art, with its own bounds, and
   terminal art is optional.** New built-in content needs no terminal sprite.
   Terminal players see less art for new content.
3. **No desktop art.** Nothing to build, but detailed designs stay out.

## Decision

Option 2.

1. **The cut.** Once Saltbreeze Bay is filled (P5-21), built-in Modsters, biomes
   and catchers are made as desktop art. Built-in terminal art stops there:
   Inkspector and Tidecrown still get terminal sprites, and later built-ins
   don't need them. Terminal art stays welcome from the community, and the
   content skills offer desktop, terminal or both. 0033 and 0034 now apply only
   to terminal sprites.
2. **Each piece of content has desktop art, terminal art or both.**
   - A Modster needs at least one of `sprite` and `desktopSprite`.
   - A catcher needs at least one of `sprite` and `desktopSprite`.
   - A biome's `background` and `desktopBackground` are both optional (a
     particle-only biome stays valid).
   - With both, they are the same design (silhouette, colours, props, poses),
     but each has its own size, frames and fps. A built-in's PR shows both side
     by side.
   - On desktop, desktop art wins when there is some. The terminal never reads
     it.
3. **Desktop Modster** (`desktopSprite` in `modster.json`): hi-res pixel art, a
   PNG sheet with its frames side by side.
   - Up to 128×128 per frame, any size that fits. No per-tier sizes.
   - 2–8 hand-drawn frames, played at the sheet's own `fps`.
   - At most 48 KiB.
4. **Desktop biome background** (`desktopBackground` in `biome.json`): a PNG
   sheet tiled left to right, so its left and right edges line up.
   - Up to 48 px tall.
   - 1–4 frames, played at `backgroundFps`.
   - At most 24 KiB.
5. **Desktop catcher** (`desktopSprite` in `catcher.json`): a PNG sheet.
   - Up to 96×96 per frame.
   - At most 24 KiB.
   - Beats, `place` and `style` work as 0035 says, with frames from the sheet.
   - Palette indexes don't exist in a PNG, so the desktop sprite names colours
     instead: `glowColor` and `rimColor` are `#rrggbb` colours from the sheet,
     painted as `glowIndex` and `rimIndex` are today. `lidRows` counts rows of
     the desktop sheet.
6. **Pixels, for all desktop art.**
   - At most 64 opaque colours across all frames.
   - Every pixel is fully opaque or fully clear (alpha cut at 128, as
     `.sprite.json`), so edges stay crisp when drawn pixelated.
7. **Why these budgets.** During a throw, one Svg embeds the Modster's and the
   catcher's sheets, and base64 adds a third to each. 48 KiB and 24 KiB come to
   about 65,500 and 32,800 characters, leaving about 32,800 of the 131072 for the
   throw's own markup. Typical pixel art is 5–20 KiB, so these are safety caps.
8. **Validation.** Desktop art that breaks a rule is dropped with a content
   issue. The content still loads with its terminal art, or with the fallback in
   point 10.
9. **Drawing on desktop.** Desktop art is one Svg **drawn as an image** (no
   `isInteractive`), with the PNG embedded as-is, stepped frame by frame by SMIL
   behind a frame-sized window, with `image-rendering: pixelated`.
   - **Scale:** desktop art is 4 times finer than terminal art, so it draws at a
     quarter of the terminal scale (`DESKTOP`), and shows at today's size:
     - the pane: 1 CSS px per pixel;
     - the Collection tab and the catcher preview: 0.75;
     - the band: 0.5, made smaller when needed to fit `maxRows × rowPx`;
     - the idle scene: `columnPx / 4` (2), made smaller to fit as 0044 says.
   - **The Collection tab** paints an uncaught Modster's silhouette with the
     same sheet through a gray filter.
   - **The catch** (0043) draws both desktop sheets. It must be checked in the
     Code tab first that its SMIL motion and filters run in an image-mode Svg.
     If a throw would pass the Svg limit, 0043 point 8 applies.
10. **What a terminal player sees** for content with desktop art only:
    - a Modster shows the compact text layout (0012 points 6–8);
    - a biome shows the idle line alone;
    - a catcher is replaced by the default built-in catcher.

## Consequences

- Desktop players see detailed, animated art for a few thousand characters each.
- New built-in content has less art on the terminal: text instead of a sprite.
  P5-09 (terminal miniatures) loses priority.
- Content made for both surfaces has two sheets to draw and keep the same design.
- Shiny variants (P5-01) need a desktop shiny too; P5-01 decides how.
- Tasks: P5-44 (format, loader, validator; `CONTENT_FORMAT.md` gains the desktop
  fields there, not before), P5-45 (terminal fallbacks), P5-46 (drawing Modster
  sheets), P5-47 (the catch), P5-48 (backgrounds), P5-49 and P5-50 (the
  skills), P5-51 (the first desktop art set).
- The README and the marketplace description no longer say the game lives in
  your terminal.
