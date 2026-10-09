# 0001 — Terminal first; sprites drawn as half-block `Raster` cells

- **Status:** Superseded by 0012
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
  set by the constraint below.
- **Size constraint (measured in P1-02, Claude Code v2.1.295).** The band's
  `maxRows` gives a sprite height of `2 × maxRows` pixels. A `Raster` of exactly
  `maxRows` rows drew with no scrolling:

  | Terminal | `maxRows` | Largest sprite (pixels) |
  | --- | --- | --- |
  | 80×24 | 7 | 14 tall, 61 wide beside a 14-column button block |
  | 120×40 | 15 | 30 tall, 101 wide beside a 14-column button block |
  | 60×15 | 2 | 4 tall (from P1-01) |

  Author Modster sprites at **12×12 pixels or smaller** (6 rows): that fits
  every terminal of 80×24 and up and leaves one spare row. Larger sprites need a
  smaller variant or a compact mode below 80×24. Never size from a fixed
  constant; read `maxRows` and `bodyColumns` at draw time.
- A transparent top half is drawn as `▄` (foreground = bottom pixel, background
  = default) and two transparent halves as a space. Using `▀` with a default
  foreground would paint the terminal's text color. Checked in the terminal
  escape codes: such cells emit no background color, so the terminal's own
  background (light or dark) shows through.
- A Desktop renderer (P5) can turn the same pixels into `Svg` rectangles.
