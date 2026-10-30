# 0050 — On desktop, the scene slides aside for the encounter's buttons

- **Status:** Superseded by 0051
- **Date:** 2026-10-30
- **Decided by:** @danielpg95
- **Supersedes:** 0049

## Context

0049 drew the desktop encounter as the Modster in front of a strip that grew to
its height, with the encounter's lines and buttons beside it in the band and
below it in the pane. @danielpg95 asked for a cleaner look (P5-58): the biome
always the same size, only a slight cue when a Modster appears, the details
subtle in the scenery, and a click on the Modster to throw, while the 1 and 2
keys keep working.

The P5-58 spike (`spikes/p5-58-encounter-overlay/`) found, in the Code tab:

- A `Client` laid over the scene `Svg` (`position: absolute`) that draws only
  blank rows leaves the scene visible and hears clicks with the cell they land
  in. A desktop column is about 8.8 px. An empty `Box` collapses to its border,
  so the region needs blank rows to get its height.
- The `Client` doesn't hear the 1 and 2 keys, even after a click gives it the
  focus. On desktop only a `Button` can own a hotkey, and a `Button` always
  draws its native chrome.

## Options

1. **Everything in the scene.** Tags for the details and Run, a click on the
   Modster to throw, no buttons. The keys would need a separate row or setting,
   Run as a tag is hard to discover, and hit tests work on ~9 × 20 px cells.
2. **The scene slides aside.** The scene keeps its size. When a Modster appears
   it flashes and slides right inside its frame, uncovering a strip on the left
   with the Throw and Run buttons (keys included). It slides back when the
   encounter ends. A click on the Modster throws too, and the details are tags
   in the scene.

## Decision

Option 2, on the `desktop` surface, in the band and the encounter pane:

1. **The scene keeps its idle size.** The Modster (or its throw) is scaled down
   to stand inside the strip, feet on the ground. Nothing changes size when an
   encounter starts or ends.
2. **Arrival:** the scene flashes briefly, then slides right inside its own
   frame, cropped at its right edge, uncovering a strip at its left.
3. **Controls:** Throw and Run are `Button`s with their 1 and 2 hotkeys, laid in
   that strip (`position: absolute`, as spike test D), only during an encounter.
4. **Click to throw:** a `Client` laid over the Modster's part of the scene,
   drawing blank rows, throws on a click that lands on the Modster.
5. **Details are tags in the scene**, like the idle tag (0047): the name, the
   caught mark and the tier, then the result (caught, broke free, wandered off).
   No text lines beside or below the scene.
6. **Departure:** when the encounter ends the scene slides back and the strip
   and its buttons go.
7. **Redraws don't replay the motion.** The surface restarts an image `Svg`'s
   animation on every redraw, so the slide and flash start at the time already
   elapsed, as a throw resumes (0043).
8. Unchanged: the terminal, the one-row band, `showIdleScene` off (the Modster
   alone, as before 0048), and golden rules 6 and 7.

## Consequences

- P5-58 builds it, after a Code tab check of the slide, the buttons in the
  strip and the click on the Modster together.
- The desktop encounter has no text lines; the tags carry what they said.
- 0048's pane scene and 0049's band layout are replaced on desktop.
