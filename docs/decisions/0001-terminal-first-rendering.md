# 0001 — Terminal first; sprites drawn as half-block `Raster` cells

- **Status:** Accepted
- **Date:** 2026-10-07
- **Decided by:** @danielpg95

## Context

Mods draw in the Claude Code terminal and in the Desktop app's Code tab, but the
two support different elements:

- `Raster` (a grid of colored character cells, up to 512×256) is terminal only.
- `Image` (PNG or RGBA pixels) is terminal only, and shows pixels only in
  terminals with a graphics protocol (kitty, Ghostty). Elsewhere it shows its
  `alt` text.
- `Svg` is Desktop only.

## Decision

1. Target the terminal first. The Desktop app is a later, optional phase.
2. Draw every sprite as a `Raster` using the upper-half-block character `▀`:
   the cell's foreground color is the top pixel and its background color is the
   bottom pixel. One cell = 1×2 pixels, so a 24×24 sprite takes 24 columns ×
   12 rows.
3. Animate by repainting the keyed `Raster` with `$.ui.blit`, not by
   re-running `ui.render`.
4. `Image` is an optional enhancement for kitty/Ghostty users, behind a setting,
   fed the same decoded pixels. It is never the only way to see a sprite.
5. Transparent pixels use the terminal's default color (`0x01000000`).

## Consequences

- Every renderer works from one in-memory format: frames of RGBA pixels.
- Sprites must stay small enough for the band (see 0002). Max sprite size is
  settled by spike task P1-02.
- A Desktop renderer (P5) can turn the same pixels into `Svg` rectangles.
