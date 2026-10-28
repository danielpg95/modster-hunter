# 0044 — On the desktop app, a biome's idle scene is one vector Svg

- **Status:** Proposed — settled by @danielpg95 when reviewing the P5-38 PR
- **Date:** 2026-10-27
- **Proposed by:** @victor-aguilars

## Context

P5-38 brings the biome idle scene (decision 0026) and the Biomes tab's scene
(0028) to the Desktop app's Code tab. Decision 0042 point 4 left them as text.

- Desktop draws `Svg` but has no `Raster` or `$.ui.blit` (0042). An
  `isInteractive` `Svg` runs SMIL, and its `source` is at most 131072
  characters. Its `width` and `height` are CSS pixels.
- The terminal tiles the scene across `bodyColumns` cells, one sprite pixel per
  column and two per row. The mod isn't told how wide or tall a desktop column
  or row is. `DESKTOP.rowPx` (20) is already an estimate (0042 point 3).
- Particle motion is pure (`particlePixel` in `render/idle-scene.ts`): a steady
  drift per tick, a sideways sway `sway × sin(tick / 4 + phase)`, wrapped at the
  strip's edges. Sparkles show for 3 ticks out of 12. Ticks run at
  `SCENE.particleFps` (8).
- 0026 point 5: the scene moves only while Claude works, and holds still
  between turns. 0028: the Biomes tab's scene moves while the tab shows.
- Decision 0043 already draws throws as vector Svg with SMIL.

## Options

1. **Vector Svg: the art tiled by a pattern, each particle a square moved by
   SMIL.** Small (a few hundred characters per particle), and smooth. Needs a
   pixel estimate for a column as well as a row.
2. **Redraw a static Svg every tick** with `$.ui.invalidate`. Simple, but
   redraws the band 8 times a second for as long as Claude works.
3. **Keep the idle line on desktop.** Nothing to build, but desktop players
   never see a biome.

## Decision

Option 1.

1. **On the `desktop` surface, the idle scene is one `Svg`**, built by the pure
   `sceneSvg` (`render/scene-svg.ts`) from the same `IdleScene` and particles
   the terminal uses. It is `isInteractive` so SMIL runs.
2. **Size.** The strip is `bodyColumns × DESKTOP.columnPx` CSS pixels wide.
   `DESKTOP.columnPx` (8) is an estimate, like `rowPx`. The scale is
   `columnPx` CSS pixels per sprite pixel, made smaller when needed so that in
   the band the strip and the idle line fit `maxRows × rowPx`. The strip is
   then as many sprite pixels wide as it takes to fill that width. With
   `maxRows` too small for a 1-pixel-scale strip and a line, the band draws the
   idle line alone, as on the terminal.
3. **Background.** The art is a `<pattern>` tiled from the left and cut at the
   right edge (0026 point 2). Its frames loop at `backgroundFps` as in 0042.
   A particle-only biome gets a transparent strip `SCENE.particleOnlyRows × 2`
   pixels tall.
4. **Particles.** The same count and start positions as the terminal
   (`makeParticles`). Each is a 1-pixel square in the particle colour:
   - drift is a linear `translate` across one strip width (or height) that
     repeats, with a second copy one width (or height) behind, so a particle
     leaving one edge comes in at the other;
   - sway is a second `translate`, sampled over one period of the sine;
   - a sparkle's twinkle is a discrete `display` on for 3 ticks in 12, shifted
     by its `phase`.
   Motion is smooth, not snapped to whole pixels.
5. **When it moves.** Between turns the band draws a still Svg: frame 0, and
   particles at their start. While Claude works it draws the moving Svg. The
   mod already redraws the band when a turn starts and ends, so no timer runs on
   desktop. The Biomes tab's scene always moves while the tab shows (0028).
6. **Settings.** `showIdleScene: false`, `showIdleLine: false` and
   `showInBand: false` keep their meaning (0026 point 6, 0023 point 3). An
   encounter replaces the scene (0026 point 7).
7. **Size limit.** If `sceneSvg` comes out over the 131072-character limit, the
   band draws the idle line alone, with one debug line.

## Consequences

- Desktop players see their biome between encounters, with smoother particles
  than the terminal.
- Two estimates, `columnPx` and `rowPx`, decide how big the scene is. P5-38's
  last item measures both in the Code tab and notes them in 0042 and here.
- **Checked 2026-10-27 (P5-38),** by eye in the Code tab on 0.1.8, from a
  screenshot of Whispering Forest in the band: the 48 px tile repeats every
  ~382 CSS px (8 per sprite pixel, so no shrinking), the strip fills the band's
  width with no gap, and the 12 px strip (96 CSS px) and the idle line fit the
  band. `columnPx` 8 and `rowPx` 20 stay. Whether the surface trims a slightly
  wider strip can't be told without the desktop's real `bodyColumns`.
- If the band is wider than `bodyColumns × columnPx`, the scene stops short of
  the right edge; if it's narrower, the surface cuts it.
- The particles' start positions match the terminal's, but on desktop they
  restart each turn instead of resuming where they stopped.
- 0042 point 4 no longer applies to the biome scenes.
