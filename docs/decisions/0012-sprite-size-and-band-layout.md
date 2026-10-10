# 0012 — Half-block `Raster` sprites up to 24×12; text-only band when they don't fit

- **Status:** Accepted, amended by 0020 (the full and compact layouts gain `2: Run`)
- **Date:** 2026-10-08
- **Decided by:** @danielpg95
- **Supersedes:** 0001

## Context

Phase 1 spikes (see `docs/sessions/2026-10-08-phase-1-review.md`) measured
what 0001 left open:

- The band's `maxRows` is 15 at 140×40, 15 at 120×40, 10 at 100×30, 7 at 80×24
  and 2 at 60×15 (P1-01, P1-02). A `Raster` of exactly `maxRows` rows draws
  without scrolling; one row more and the band scrolls and digit hotkeys stop.
- Half-block cells (`▀`/`▄`) draw crisp pixel art; transparent halves show the
  terminal background in light and dark themes (P1-02).
- `$.ui.blit` animates a keyed `Raster` at 6–12 fps without flicker (P1-03).
- `Image` looks blurrier than `Raster` in Ghostty and shows only its `alt` text
  in iTerm (P1-04). P5-04, the optional `Image` renderer, is deleted.
- CONTENT_FORMAT allowed sprites of 8–48 px, which don't fit an 80×24 band.

## Options

1. **8–24 wide, 8–12 tall** — always fits 80×24 and up with a spare row; wide
   creatures are still possible.
2. **Exactly 12×12** — simplest rule, but no room for wide creatures.
3. **Up to 24×24 plus a 12×12 variant** — big art in tall terminals, but every
   Modster needs two sprites.

For short terminals: a text-only band, a sprite downscaled 2×, or no game.

## Decision

1. **Terminal first.** The Desktop app is a later, optional phase.
2. **Sprites are `Raster` cells**, one cell = 1×2 pixels: `▀` with foreground =
   top pixel and background = bottom pixel; `▄` when only the top pixel is
   transparent; a space when both are. Transparent pixels (alpha < 128) use the
   terminal default color `0x01000000`. Alpha is never blended.
3. **Animation** repaints the keyed `Raster` with `$.ui.blit`, never by
   re-running `ui.render`. A tick is skipped while the previous blit is in
   flight.
4. **No `Image` element.** `Raster` is the only sprite renderer.
5. **Sprite size:** width 8–24 px, height 8–12 px and even. A 12 px sprite uses
   6 rows, which fits every terminal of 80×24 and up with one row spare.
6. **Full band layout** (when `ceil(height / 2) ≤ maxRows` and the sprite plus
   a 2-column gap plus a 24-column text block fit in the band's width): sprite
   on the left; on the right, one line each: `Name · tier`, attempts left, and
   the `1: Throw` button. Then the result card in place of those lines.
7. **Compact band** (otherwise): no sprite, at most 2 rows of text:
   `A wild Mossling appeared! (common)` and `1: Throw · 3 left`. With
   `maxRows` 1, a single line: `Mossling (common) · 1: Throw · 3 left`. With
   `maxRows` 0, draw nothing.
8. Read `maxRows` and the available width at every draw; never size from a
   fixed constant.

## Consequences

- CONTENT_FORMAT's `.sprite.json` bounds change to width 8–24, height 8–12
  (even); the validator (P2-01) enforces them and the converter (P2-02) rejects
  larger sheets with a hint.
- P2-07 implements both band layouts and tests each against `maxRows` values
  0, 1, 2, 5, 6 and 7.
- A Desktop renderer (later phase) can turn the same pixels into `Svg`
  rectangles.
- P5-04 is removed from the roadmap.
