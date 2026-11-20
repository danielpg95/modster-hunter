# 0061 — A Collection card embeds its sheet's first frame only

- **Status:** Accepted (amends 0045 point 9 for the Collection tab's cards)
- **Date:** 2026-11-20
- **Decided by:** @danielpg95 (drafted by Claude)

## Context

0045 point 9 embeds a desktop sheet's PNG as-is, and paints an uncaught
Modster's silhouette with the same sheet through a gray filter. A Collection
card (0054 point 5) shows only frame 0, still, yet carried the whole sheet,
every frame. With 66 sheets every 12-card page came to 171k–380k characters,
past `cardSvgCharsMax` (150k), so each page showed `?` on every card (P5-81).
0054 point 6, amended, now says a card's Svg holds only the frame it shows.

Measured on the built-in roster: frame 0 as its own PNG brings a page to about
85k–155k characters. Frame 0 as vector paths is tiny in one gray (at most 7k a
card) but 3–8 times too big in colour. The plugin can decode a PNG but has no
encoder.

## Options

1. **Frame 0 as a PNG for every card.** Needs a small pure PNG encoder. One way
   to draw both looks; the silhouette keeps 0045's gray filter.
2. **Vector paths for silhouettes, a frame-0 PNG for caught cards.** Smallest
   silhouettes, but two ways to draw a card, and the encoder is needed anyway.
3. **Vector paths for silhouettes only.** No encoder, but caught cards keep the
   whole sheet, so pages of caught Modsters still show `?`.

## Decision

Option 1 (@danielpg95, 2026-11-20):

1. **A Collection card's Svg embeds a PNG of its sheet's frame 0 only**, the
   frame's full size, so the card's fit (0056 point 4) doesn't change. An
   uncaught card draws that PNG through 0045's gray filter.
2. **The PNG is re-encoded by the plugin**, with a pure encoder in
   `plugin/hooks/vendor/` (no `$`, no Node APIs): indexed colour, since a sheet
   has at most 64 opaque colours, and deflate.
3. **It is made once per sheet** and kept as long as the sheet is.
4. **Everywhere else stays as 0045 point 9 says**: the detail above the grid,
   the pane, the band, the idle scene and the catch still embed the sheet as-is.

## Consequences

- A page of 12 cards fits the budget on today's roster; 0054 point 6 drops
  the cards that still don't fit, one by one.
- The plugin carries a PNG encoder, tested by decoding what it writes.
- Other places that show one still frame could use the same encoder later.
