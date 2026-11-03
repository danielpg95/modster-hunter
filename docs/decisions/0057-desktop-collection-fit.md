# 0057 — On desktop, the collection fits every Modster to Kingbolt's height

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decided by:** @danielpg95
- **Amends:** 0056

## Context

0056 fits a desktop sheet's art to `collectionFitPx` (60 px) in the
collection detail, and leaves terminal sprites alone. A terminal sprite there
is drawn at `DESKTOP.collectionScale` (3) per pixel, so its art is as tall as
it was drawn: Kingbolt, Scorchion, Cactoad and most of the desert and coast
reach 90–96 px, Flopple and Twiggle 81, Dunebun 60. Every desktop sheet is 60.

@danielpg95 finds Kingbolt's size right for the collection and wants the others
to match it.

## Options

1. **Fit every Modster to 96 px.** Sheets and terminal sprites alike, with
   0056's width cap. Every Modster in the collection reads the same size.
   Terminal sprites scale by uneven amounts, as small sheets already do.
2. **Fit only sheets to 96 px.** Terminal sprites keep their 3×. Most match,
   but Dunebun, Flopple and Twiggle stay smaller.

## Decision

Option 1, chosen by @danielpg95 on 2026-11-02, for the collection detail only.

1. **The collection's target** is `DESKTOP.collectionFitPx` 96: Kingbolt's
   art height at the old 3×.
2. **Terminal sprites fit too.** Their art height is the opaque rows across
   every frame, as for a sheet (0056 point 1), and the same width cap applies
   (`fitWidthShare` × the target).
3. **Unchanged:** the pane, the band, collection cards and the Catchers tab's
   preview. Terminal surfaces don't change.

## Consequences

- Every Modster in the collection detail is about 96 px tall, whatever kind of
  art it has. A desktop sheet is 60% bigger there than with 0056.
- The widest frames reach about 154 px (Cactoad 141, Echobat's frame 138),
  which still fits a narrow dock.
- Small terminal sprites, like Dunebun, lose some crispness when scaled up.
- Task P5-67 does the work. @danielpg95 checked 0.1.29 in the Code tab on
  2026-11-02: the collection's Modsters look the same size and fit the dock.
