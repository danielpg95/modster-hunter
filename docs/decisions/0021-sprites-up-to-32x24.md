# 0021 — Sprites up to 32×24; the compact band shows when they don't fit

- **Status:** Proposed — settled by @danielpg95 (amends 0012 point 5)
- **Date:** 2026-10-10
- **Proposed by:** @victor-aguilars (after testing a legendary in P2-09; details drafted by Claude)

## Context

[0012](0012-sprite-size-and-band-layout.md) caps sprites at 24×12 so every
Modster fits the band of an 80×24 terminal (7 rows) with a row to spare.

While making the official roster (P2-09), small creatures worked well at that
size: Dunebun, Hootlet and Crabbit read clearly. Large or majestic ones didn't.
A legendary lion, Sunmane, went through five versions at 24×12. Each one read
as "a dog", because a 12-pixel height leaves about 6 rows for a face. The same
lion at 32×24 read as a lion, with a flame mane that animates well
([24×12](0021/sunmane-24x12.png), [32×24](0021/sunmane-32x24.png)). An earlier
attempt (Cragmaw, a large armored beast) failed at 24×12 for the same reason.

Two things make a bigger limit cheap now:

- 0012 already picks the band layout by fit at draw time (points 6–8). A sprite
  taller than the band falls back to the compact text layout; no new layout is
  needed.
- The encounter pane ([0015](0015-encounter-pane.md)) and the collection pane
  (phase 3) have more room than the band.

## Options

Size:

1. **32×24.** Tested with Sunmane. 12 terminal rows, fits the full band from
   about 120×40.
2. **32×32.** Room for tall creatures, but 16 rows, more than most panes show.
3. **48×24.** Very wide creatures, but 48 columns plus the text block rarely
   fits beside it.

Where a big sprite doesn't fit:

1. **The compact text band from 0012 point 7.** No extra art. The sprite shows
   in the encounter pane and the collection.
2. **An optional small sprite** (≤ 24×12) for the band. Better look, but a
   second sprite field and more art.
3. **A required small sprite.** Always a picture in the band, but double the
   art for every big Modster.

Who may use them: any Modster, built-in only, or built-in legendaries only.

## Decision

1. **Sprites may be 8–32 px wide and 8–24 px tall, height even.** This replaces
   the bounds in 0012 point 5. A 24 px sprite uses 12 terminal rows.
2. **Layouts are unchanged.** 0012 points 6–8 choose by fit at every draw: the
   full layout when `ceil(height / 2) ≤ maxRows` and the sprite, the gap and the
   text block fit the width; otherwise the compact text layout. In an 80×24 band
   (7 rows), a sprite taller than 14 px shows the compact layout. The encounter
   pane uses the same rule (0015 point 1).
3. **Any Modster may use the bigger size,** built-in or user content, with the
   same rules. User PNG sheets (0016) follow the same bounds.
4. **No second sprite.** A Modster has one sprite; where it doesn't fit, the
   compact text layout shows.
5. **Small stays the default.** Content guidance (the `add-modster` skill)
   recommends ≤ 24×12 so the sprite shows in the band of an 80×24 terminal, and
   the bigger size for Modsters that need it, such as legendaries.
6. `schemaVersion` stays `1`: every existing sprite stays valid.

## Consequences

- New roadmap task P2-16: `CONTENT.sprite` bounds, which drive the validator,
  the converter (`tools/sprite.mjs`) and the PNG decoder (0016). It adds tests
  for a 32×24 sprite: valid, converted, the compact band at `maxRows` 7, the
  full band at 15, and full size in the encounter pane. CONTENT_FORMAT.md and
  the `add-modster` skill change too.
- In small terminals, a big Modster shows no picture in the band. Players who
  want to see it can open the encounter pane (`/modsters hunt`).
- If accepted, 0012's status line becomes "Accepted (amended by 0021)".
