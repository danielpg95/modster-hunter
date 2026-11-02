# 0056 — On desktop, every Modster's art fits a set height

- **Status:** Proposed — settled by P5-66 / @danielpg95
- **Date:** 2026-11-02
- **Proposed by:** @danielpg95
- **Amends:** 0045

## Context

0045 draws a desktop sheet at a fixed CSS size per sheet pixel
(`DESKTOP.sheetPaneScale` 1, `sheetCollectionScale` 0.75, `sheetBandScale`
0.5), with no sizes per tier. So a Modster shows as big as its art was drawn,
and its frame's empty margin counts too. @danielpg95 found the Crystal Grotto
Modsters small on the pane: their art is 59–92 px tall, against 94–126 px for
most of Whispering Forest. On the pane the forest sheets are already shrunk to
fit the scene strip (`MOTION.modsterFill` of its 96 px, about 82 px), so the
difference comes from the Grotto's smaller art and its margins.

`heightM` is the Modster's height in its lore. It is shown in the collection
and never sizes the art; @danielpg95 wants to keep it that way.

Each `DesktopSheet` already carries `bounds`, the opaque box across all its
frames, measured once at load.

## Options

1. **Fit the art to a set height.** The renderer scales each sheet so its
   opaque art reaches the same height on each surface. Works for every sheet,
   built-in or a player's. A small sheet is scaled by an uneven amount (like
   1.4×), so its pixels come out slightly uneven.
2. **Redraw the small sheets bigger.** Crisp pixels and 0045 stays, but it is
   new art for six Modsters, and a player's small sheet stays small.
3. **A minimum height only.** Scale up art under a minimum and leave the rest.
   Bigger art keeps its size, so sizes still differ.

## Decision

Option 1, chosen by @danielpg95 on 2026-11-02, for the encounter pane, the
collection and the band. Terminal sprites and terminal surfaces don't change.

1. **The art's height** is `bounds.y1 − bounds.y0 + 1` of the sheet: the
   opaque rows across every frame, so a Modster doesn't change size while it
   animates.
2. **Each surface has a target** in CSS px (`DESKTOP` in `constants.ts`):
   - encounter pane: `paneFitPx` 80;
   - collection detail: `collectionFitPx` 60;
   - band: `bandFitPx` 40.
   The sheet's scale is `target ÷ art height`, applied to the whole frame, so
   the art reaches the target and the margins scale with it.
3. **Caps stay.** The art is never wider than `fitWidthShare` (1.6) × the
   target: a wide sheet scales down until its art fits that width. In the
   scene the art is at most `MOTION.modsterFill` of the strip and the frame at
   most the strip's height, so clear margins may reach the strip's top instead
   of shrinking the art. Outside the scene, in the band, the frame stays within
   `maxRows × rowPx`. A cap lowers the scale and never raises it.
4. **Collection cards** fit the art's box, not the frame, into the thumbnail
   square, so margins don't shrink a card's Modster.
5. **Throws and the caught frame scale with the Modster.** A throw is one
   picture of the Modster and the catcher (0043, 0045 point 9). It is drawn at
   the terminal scale times the Modster's fit factor (its fit scale ÷ the old
   sheet scale), so the Modster keeps its size when the throw starts and the
   catcher lines up. The catcher grows or shrinks with it. The caught last
   frame (0053) uses the same factor. The existing height caps still apply.
6. **`heightM` stays lore only.** It never sizes art.

## Consequences

- Modsters look about the same size on each surface, whatever size their art
  was drawn at. A sheet's size no longer says how big a Modster looks; 0045's
  "up to 128×128 per frame" stays as a limit on the file.
- Small sheets lose some crispness when scaled by an uneven amount.
- A catcher looks a little bigger next to a small Modster than next to a big one.
- The strip still caps the pane's art at about 82 px, and a sheet with a deep
  margin (Echobat's 21 empty rows) stops short of it when its frame fills the strip. Making every Modster clearly
  bigger would need a taller strip; that is a separate change.
- `DESKTOP.sheet*Scale` stop sizing Modsters; they stay where sheets join
  terminal geometry. Task P5-66 does the work.
