# 0047 — On desktop, the idle line is a name tag in the scene that fades

- **Status:** Accepted
- **Date:** 2026-10-28
- **Decided by:** @danielpg95 (P5-54)
- **Amends:** 0026 point 4 and 0044 point 1, on the desktop surface only

## Context

Between encounters the band draws the biome's scene with an idle line under
it: "Whispering Forest · listening for Modsters" (0026). On desktop the scene
is detailed art (0045, 0046), and that text line under a picture reads like a
terminal. @danielpg95 asked for the name to be part of the scene instead.

## Options

1. **A name tag in the scene that stays,** with a dot that pulses while Claude
   works.
2. **A tag that fades when the biome has been shown,** and comes back when it
   comes back into view.
3. **No text at all,** with the name only in `/modsters`.

## Decision

Option 2.

1. **The tag.** On desktop, the idle line becomes a small tag at the
   bottom-left of the scene strip:
   - the biome's name in its `accentColor`, on a rounded, translucent dark
     backing, as text inside the scene's Svg;
   - a dot before the name that pulses while Claude works (hunting is live)
     and rests dim between turns.
   The text row under the scene goes away, so the band is a row shorter.
2. **When it shows.** The tag shows when the biome comes into view: at
   session start, and when an encounter ends and the scene returns. It
   stays `IDLE_TAG.showMs`, fades out over `IDLE_TAG.fadeMs`, and then the
   scene stands alone. The mod times this with redraws, since an image
   restarts its animation whenever the band redraws (P5-47). Turns that start
   and end in between don't bring the tag back.
3. **A biome with no scene** (no background, no particles) shows the tag alone
   in the band, with the same timing. After the fade the band is empty
   between encounters.
4. **Unchanged:**
   - the terminal, which keeps 0026's idle line;
   - `showIdleLine: false`, which drops the tag as it drops the line;
   - `showIdleScene: false`, which leaves the tag alone, as for a biome with
     no scene;
   - `showInBand: false`, which draws nothing between encounters.

## Consequences

- The desktop band shows the place itself. The name is a short greeting each
  time the biome comes into view, not a status line.
- The cue that hunting is live is the moving scene, plus the pulsing dot while
  the tag shows.
- Two timers and three redraws per appearance: show, fade, gone.
