# 0026 — Between encounters the band shows the biome as an animated scene with particles

- **Status:** Accepted (point 7 amended by 0027)
- **Date:** 2026-10-12
- **Decided by:** @danielpg95 (choices made in the P5-13 planning session; details drafted by Claude)

## Context

Between encounters the band draws one line, the biome name and
`· listening for Modsters` (P2-07, `showIdleLine`). @danielpg95 wants the
biome to feel like a place instead: a small animated scene.

What already exists and limits the choice:

- `biome.json` has an optional `background`: a single-frame `.sprite.json` in
  the biome folder. The loader validates it (`load-content.ts`), but nothing
  draws it and no built-in biome has one.
- The band is shared and short (0002); its tree never exceeds `maxRows` (0012:
  7 rows at 80×24, 2 at 60×15). Sprites go up to 48×48 (0021), and the full
  layout is used when `ceil(height / 2) ≤ maxRows`.
- `Raster` is terminal only (0012; desktop is P5-06). Text can't be drawn over
  a `Raster`, so anything moving across the art must be part of its cells.
- Sprite frames are repainted in place with `$.ui.blit`, skipping a tick while
  the last blit is in flight (P1-03).
- The mod stays quiet (golden rule 7): no work it doesn't need.

## Options

What to draw:

1. **Scene strip.** A short, wide pixel-art landscape per biome, a few frames.
   Needs art for every biome.
2. **Ambient particles.** Procedural sparkles, leaves, sand or bubbles drifting
   across a few rows. No art; less sense of place.
3. **Wandering silhouette.** A random Modster's silhouette walks across. Uses
   existing sprites; gives away the roster.
4. **Scene and particles.** Scene art with particles drifting over it. The most
   atmosphere and the most work.

How tall: 1–2 rows; up to 3 rows; or as tall as the art, like sprites.
When to animate: only while Claude works, or always.
How to turn it off: a new toggle, or reuse `showIdleLine`.

## Decision

Option 4, as tall as the art (the sprite rule), animated only while Claude
works, with a new toggle.

1. **Scene art.** `background` stays the field name and still names a
   `.sprite.json` in the biome folder, now with **1–4 frames** (it was exactly
   one). Size bounds are a sprite's (0021: up to 48×48, even height). A new
   optional `backgroundFps` (1–12, default 2) sets its speed. Both changes are
   additive, so `schemaVersion` stays 1. Guidance, not a rule: keep scenes
   about 12 px tall (6 rows), since the scene stays on screen all session.
2. **Tiling.** The scene repeats left to right to fill the band's width, cut
   at the right edge. Art should line up at its left and right edges.
3. **Particles.** A new optional `particles` object in `biome.json`:
   - `style`: `sparkle`, `leaf`, `sand`, `bubble` or `snow`. Each style fixes
     how particles move (drift down, sideways, up, twinkle in place) in code.
   - `color`: `#rrggbb`. Default: the biome's `accentColor`, else white.
   - `density`: integer 1–5, default 2.
   Particles are single pixels composited into the scene's cells before they
   become half-block cells; they are never text. Motion is pure: a function of
   the tick and an injected random source.
4. **Layout.** On the terminal, between encounters, the band draws the scene
   rows (`ceil(height / 2)`) with the idle line below them, when
   `rows + 1 ≤ maxRows`. A biome with `particles` and no `background` gets a
   3-row strip of particles. If it doesn't fit, or the biome has neither, or
   the surface isn't the terminal, the band draws today's single idle line.
   With `maxRows` 0, nothing (0012).
5. **When it moves.** The scene and particles animate only while a turn runs,
   using the same work signal as the spawn countdown, so background agents
   count (0018). Between turns the band holds a still frame (frame 0, particles
   where they stopped) and no timer runs. The timer also stops when an
   encounter starts and on module reload. One timer drives both the scene's
   frames and the particles, at the faster of `backgroundFps` and the particle
   rate, with the P1-03 skip-if-blit-in-flight rule.
6. **Setting.** A new `userConfig` option `showIdleScene` (boolean, default
   `true`). `false` gives today's idle line. `showIdleLine: false` or
   `showInBand: false` (0023 point 3) still draw nothing between encounters.
7. **Encounters win.** When an encounter starts, the encounter layout replaces
   the scene. While the encounter pane is shown the band steps aside (0015),
   so no scene shows. The pane's own idle text doesn't change.

## Consequences

- P5-13 builds it: a pure scene compositor in `plugin/hooks/render/`, a scene
  view in `bandView`, validator changes for `background`, `backgroundFps` and
  `particles`, the setting, and the timer in `register.tsx`.
- P5-14 adds scenes and particles to the four built-in biomes, with credits.
- `docs/CONTENT_FORMAT.md` (biome table, `userConfig` table) and
  `docs/ARCHITECTURE.md` change in P5-13.
- A wide `Raster` blitted on every particle tick hasn't been checked in a real
  terminal; P5-13 checks it by hand.
- At 140×40 a 24 px-tall scene takes 12 of 15 band rows all session. Authors
  are steered toward short scenes; the person can turn it off.
- The user content skill and helper don't know about scenes yet. Teaching them
  is a later task.
