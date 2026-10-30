# 0048 — On desktop, the encounter pane shows the Modster in front of its biome

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decided by:** @danielpg95

## Context

P5-52 asked what input and layout the Desktop Code tab allows, so the game can
feel made for desktop (asked by @danielpg95, 2026-10-28). It had four ideas:
click a Modster to throw, an encounter scene with the Modster in front of its
biome, a dex grid with a detail card in the Collection tab, and a catch card.

The spike (`spikes/p5-52-desktop-interaction/README.md`) found, in the Code
tab, inline:

- A `Button` reaches the mod in a pane and in the band, beside an `Svg` and
  laid over one with `position: absolute`.
- An `Svg` can't be pressed. An `isInteractive` one runs SMIL `begin="click"`,
  CSS `:hover` and tooltips, but the mod never hears the click.
- A `Markdown` with `onLinkPress` takes the handlers away from every `Button`
  drawn after it in the same tree.
- A pane with 12 animated thumbnails (about 210k characters of `Svg`) works.
  With 35 (678k) the redraw is refused and every `Button` in the pane goes dead.
- `/reload-plugins` with a mod's pane open leaves it blank.
- Two mods can't share the band: the game's band hook doesn't pass it on while
  hunting.
- The terminal is unchanged with the spike installed.

## Options

1. **Encounter scene only.** The encounter pane draws the Modster in front of
   its biome as one `Svg`. Builds on the idle scene (0044, 0046) and the
   desktop sheets (0045); no new input.
2. **Encounter scene plus click-to-throw.** Also lays the Throw `Button` over
   the Modster. Works (spike test D), but adds a second way to throw.
3. **All four ideas.** The most desktop feel, but the dex grid needs paging
   under an unmeasured per-pane `Svg` budget, and the catch card is untested.

## Decision

Option 1.

1. **On the `desktop` surface, the encounter pane draws one scene `Svg`**: the
   biome's idle scene (0044, with its desktop art, 0045 and 0046) as the
   background, and the Modster's desktop sheet, or its terminal sprite when it
   has none (0042), standing in front of it. It is drawn as an image (no
   `isInteractive`), so the embedded PNGs show and SMIL runs (P5-39).
2. **Throw and Run stay `Button`s with their digit hotkeys**, drawn below the
   scene as today. No click on the Modster throws.
3. **The band doesn't change**, and neither does the terminal: keys and text
   stay the simple path.
4. **One `Svg` stays under `DESKTOP.svgMaxChars`.** When the scene would go
   over, the pane draws the Modster alone, as today.
5. **Not now:** click-to-throw, the dex grid with a detail card, and the catch
   card. A later task can pick them up from the spike's findings.
6. **Rules for any desktop tree** (from the spike): no pressable `Markdown`
   above a `Button`, and no pane redraw that carries hundreds of thousands of
   characters of `Svg`.
7. Golden rules 6 and 7 hold: nothing steals keys or opens a pane unasked, and
   nothing goes online.

## Consequences

- Task P5-57 builds the scene in the encounter pane.
- Desktop players see the biome behind every encounter in the pane; the band
  stays compact.
- The pane's scene is one more `Svg` to keep under the limit; point 4 is the
  fallback.
- The spike is throwaway: it stays in `spikes/` until P5-57 is done.
