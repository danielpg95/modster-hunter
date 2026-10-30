# 0049 — On desktop, the band and the encounter pane show the Modster in front of its biome

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decided by:** @danielpg95
- **Supersedes:** 0048

## Context

Decision 0048 put the encounter scene (the Modster in front of its moving
biome strip) in the desktop encounter pane only, and kept the band unchanged
(its point 3). That was a scope limit, not a spike finding: the spike found
nothing that stops the band from drawing it.

Most players see encounters in the band; the pane only shows for people who
open it. Between turns the desktop band already draws the biome strip (0044),
and when a Modster appeared, the strip was swapped for the Modster alone.
@danielpg95 asked for the band to keep the strip, with the Modster in front of
it, in the same task (P5-57).

## Options

1. **Keep 0048 as it is.** The band stays compact; only the pane shows the scene.
2. **The band draws the scene too, when it fits.** The encounter's text and
   buttons on the left, the strip filling the rest of the band with the
   Modster standing in it; the Modster alone when the scene doesn't fit.
3. **The band draws the scene, with the text laid over it.** The strip fills
   the whole band. The text is harder to read over busy art, and only Buttons
   over an Svg were tried in the spike.

## Decision

Option 2. 0048 stands, except its point 3:

1. Every point of 0048 holds for the encounter pane.
2. **On the `desktop` surface, the band draws the encounter in front of its
   scene**: the encounter's lines (name, Throw and Run, the throw's dots, the
   result) on the left as today, and the biome's strip, moving, filling the
   rest of the band and cropped at its edge, as the idle strip is (0044). The
   Modster (or its throw) stands in the middle of the part the band shows.
3. **It stays inside `maxRows`.** The scene is drawn at `DESKTOP.bandScale` CSS
   pixels per strip pixel, or a smaller whole scale so it fits
   `maxRows × rowPx`. Below 1, or over `DESKTOP.svgMaxChars`, the band draws
   the Modster alone, as before.
4. The one-row band (`showInBand` off) and the terminal are unchanged: keys
   and text stay the simple path.

## Consequences

- P5-57 builds the scene in the band too.
- Desktop players see the biome behind every encounter, in the band and in the pane.
- The band's encounter Svg is bigger than the Modster alone; point 3 is the fallback.
