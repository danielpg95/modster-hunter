# 0043 — On the desktop app, a throw plays as one vector Svg

- **Status:** Proposed — settled by @danielpg95 when reviewing the P5-38 PR
- **Date:** 2026-10-27
- **Proposed by:** @victor-aguilars

## Context

P5-38 brings the catch animation (decision 0035) to the Desktop app's Code tab.
Decision 0042 point 4 left it as text there. The facts:

- Desktop draws `Svg` but has no `Raster`, `Image` or `$.ui.blit` (0042), so
  the terminal's way (a new frame blitted 12 times a second) doesn't work.
- An `isInteractive` `Svg` runs SMIL. Its `source` is at most 131072 characters.
- A throw lasts about 3.1 s for a catch with 3 rocks, which is 38 frames at
  `CATCH.fps` (12). The Modster keeps animating inside the catcher, so few
  frames repeat.
- Measured on 2026-10-27 over every built-in catcher, Modster and outcome (350
  throws): drawing every frame into one Svg, as 0042 does for idles, is up to
  413k characters. 132 throws go over the limit at 12 fps, 81 with repeated
  frames merged, and 25 even at 6 fps.
- The browser can rotate, scale and fade for real. The terminal can't blend,
  so `catch-frame.ts` fakes fades with motion and colour mixing.

## Options

1. **One Svg of pixel frames.** Over the limit for many throws. Rejected.
2. **Redraw a static Svg each frame** with `$.ui.invalidate`. Small, but it
   redraws the band or pane 12 times a second during a throw, may flicker, and
   doesn't use what desktop is good at.
3. **One vector Svg per throw.** Draw the art once and move it with SMIL. Small
   and smooth, but it needs a second renderer that must stay in step with
   `catch-frame.ts`.

## Decision

Option 3.

1. **On the `desktop` surface, a throw is one `Svg`**, built by the pure
   `catchSvg` (`render/catch-svg.ts`) from the same `CatchArt` the terminal
   uses. It plays once: SMIL `dur` is the throw's length plus, for a catch, the
   `caught` beat, with `fill="freeze"`. It is `isInteractive` so SMIL runs.
2. **The art is drawn once**, as `<path>`s the way `pixelsToSvg` draws them:
   - the Modster's frames, looped at its `sprite.fps` as in 0042;
   - the catcher's frames, and the lit frames when it has a `glowIndex`. A beat's
     frames are shown with SMIL `visibility`;
   - with `lidRows`, the lid rows and the body rows as two groups, so the lid can
     move alone.
3. **Motion comes from `catch-frame.ts`.** Its pose and motion functions
   (`modsterPose`, `anchoredMotion`, `stretchMotion`) are exported unchanged.
   `catchSvg` samples them every `DESKTOP.catchSampleMs` (1000 / 24) and writes
   the values as SMIL `values` with `calcMode="linear"`. The terminal and desktop
   play the same throw, and a change to a beat reaches both.
4. **What desktop draws better:**
   - tilt, spin and shrink are real `rotate` and `scale` transforms (no
     resampling);
   - the white flash (`shrink-in`, `pop-out`, a catch, a break) is a white copy
     of the art with animated `opacity`;
   - `dim` is a black copy at `CATCH.dimAmount` opacity.
5. **`stretch` catchers** (`cover`): the dome is an ellipse `clipPath` with
   animated `cx`, `cy`, `rx` and `ry`, filled with a `<pattern>` of the beat's
   frame. `rimIndex` is the ellipse's stroke. A break's tear is two halves,
   each clipped to one side and moved apart and down.
6. **Sparkles** are small paths in `CATCH.sparkleCore` and `CATCH.sparkleArms`,
   moved and faded with SMIL.
7. **Starting and ending.** `Svg` has no key, so the source carries the throw:
   its root gets `data-throw="<throwAt>"`. A new source is a new box, so its SMIL
   clock starts at 0, even when the last throw drew the same art. The mod calls
   `$.ui.invalidate('ui.render')` once when a throw starts and once when it ends,
   never per frame. On the terminal nothing changes.
8. **Size.** The band and pane draw it at the scale 0042 sets for the
   Modster. If `catchSvg` comes out over the 131072-character limit, or the
   catcher doesn't fit (`fits`, 0035 point 8), the idle Svg and the dots stay,
   as they are now, and one debug line says why.

## Consequences

- Desktop throws look smoother than the terminal's, and no frames are
  re-sent while one plays.
- `catch-frame.ts` gains exports but no behaviour change. Its tests must still
  pass as they are.
- Two renderers draw from one motion source. A new beat or motion must be
  drawn in both. The tests compare their timings: what's visible when, and
  where it is, sampled at the same moments.
- SMIL timing starts when the surface inserts the element, not on the mod's
  clock, so the end may be off by a frame. The result text comes from the
  machine either way.
- 0042 point 4 no longer applies to the catch animation. The collection's
  sprites, the catcher preview and the biome scenes stay with P5-38 under 0042.
