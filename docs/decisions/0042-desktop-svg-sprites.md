# 0042 — On the desktop app, sprites are one animated Svg each

- **Status:** Proposed — settled by @danielpg95 when reviewing the P5-06 PR
- **Date:** 2026-10-27
- **Proposed by:** @victor-aguilars

## Context

P5-06 brings the game to the Desktop app's Code tab. The P5-06 spike found:

- The desktop surface draws `Svg` but not `Raster` or `Image` (0001, 0012).
- `$.ui.blit` only repaints a `Raster` or an `Image`, so the terminal's way of
  animating (one blit per frame, 0001 point 3) doesn't work on desktop.
- A surface module (`Client`) can't draw `Svg` either: its element table is the
  terminal's without `Client`, `Raster` and `Image`.
- `Svg` with `isInteractive: true` is drawn in a script-less sandboxed frame
  where SMIL animation runs. Its `source` is at most 131072 characters.
- Sizes on desktop are CSS pixels, but the band's limit (`maxRows`, golden
  rule 6) is in rows. The mod isn't told how tall a desktop row is.

## Options

1. **One Svg per sprite, every frame inside, looped by SMIL.** One render per
   Modster; the surface animates it. Costs one `isInteractive` frame per sprite.
2. **Re-render on every frame** with `$.ui.invalidate`. Works with a static
   `Svg`, but redraws the whole band or pane 2–12 times a second.
3. **A static first frame only.** Simplest, but Modsters don't move on desktop.

## Decision

1. **On the `desktop` surface, a Modster is drawn as one `Svg`** built by the
   pure `pixelsToSvg` (`render/pixels-to-svg.ts`). Each frame is a group, and
   SMIL shows one at a time at the Modster's `sprite.fps`, looping. The `Svg` is
   `isInteractive` so the animation runs.
2. **One `<path>` per colour per frame**, one box per run of a colour along a
   row. It keeps the largest built-in sprite (Geodon, 46×32, 4 frames) at about
   40k characters, under the 131072 limit.
3. **Sizes** (`DESKTOP` in `constants.ts`): the encounter pane draws the sprite
   at 4 CSS px per sprite pixel (`paneScale`). The band draws it at 2
   (`bandScale`), beside the compact text, scaled down when needed so its
   height stays within `maxRows × rowPx`. `rowPx` (20) is an estimate of a
   desktop row until we can measure one.
4. **For now, desktop shows text** for the catch animation, the collection's
   sprites, the catcher preview and the biome idle scenes. Task P5-38 covers
   them.

## Consequences

- Band and encounter pane show the Modster in the Code tab with no extra timers.
- Catch frames on desktop aren't animated: the throw shows its dots as text,
  next to the idle sprite.
- If `rowPx` is wrong, the band's sprite may look too small or crowd the band.
  Measure it in the Code tab and update `DESKTOP.rowPx`.
- 0001 and 0012 stay as they are for the terminal.
