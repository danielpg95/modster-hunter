# 0033 — Every Modster's sprite is at most 32 px tall and 48 px wide

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decided by:** @danielpg95
- **Supersedes:** 0021 point 5

## Context

[0021](0021-sprites-up-to-48x48.md) point 5 keeps small as the default:
content guidance recommends ≤ 24×14 so a sprite shows in the band of an
80×24 terminal (7 band rows, 14 px), and suggests bigger sizes only for
Modsters that need them.

The roster doesn't follow it. Of the 26 built-in Modsters on 2026-10-14, only
Sporrow (14 px) is ≤ 14 px tall. The others run 16–32 px, and Shellsprout,
redrawn in P5-19, was briefly 42 px. So in an 80×24 terminal the band already
shows the compact text layout for 25 of 26 Modsters, and the "small default"
mostly exists on paper.

In P5-19, more pixels made a large difference in quality. Shellsprout at 24×22
looked flat; with a bigger canvas and textured shading it held the detail of
its reference image. But size has a cost: a sprite taller than the band never
shows there. At 140×40 the band has 15 rows (30 px). Serpentide and Elderbark
(32 px) only show as pictures in the encounter pane and the collection.

@danielpg95 asked for one standard for every Modster instead of guidance per
tier.

## Options

1. **Keep 0021 point 5 (≤ 24×14 by default).** It keeps the band picture in
   small terminals for the Modsters that follow it, but almost none do, and it
   pushes art toward the low detail that failed in P2-09 and P5-19.
2. **Guidance per tier** (for example commons around 20 px tall, rares and
   legendaries up to 32). It matches the current roster, but it's a sliding
   scale contributors would have to look up, and tier doesn't decide how much
   room a design needs.
3. **One standard for every Modster: at most 32 px tall, width up to 48.**
   It's one rule to remember. 32 px tall is about the most a large terminal's
   band can show (30 px at 140×40) and fits the panes comfortably, and the extra
   width allows long creatures (serpents, beasts) without making them taller.
4. **A fixed 32×32 canvas for every sprite.** It's the most uniform, but every
   existing sprite would have to be padded, and small creatures would float in
   empty space.

## Decision

1. **Every Modster, built-in or user content and any tier, uses a sprite at
   most 32 px tall (even) and at most 48 px wide.** Pick the size the design
   needs within that; there's no default size and no per-tier size.
2. **The technical bounds from 0021 point 1 stay** (8–48 wide, 8–48 tall, even).
   The validator keeps accepting sprites up to 48 px tall so existing user
   content stays valid. This decision is content guidance; it doesn't change
   the validator.
3. **Guidance says where a size shows:** up to 14 px tall in the band of an
   80×24 terminal, up to 30 px at 140×40, and the full 32 px in the encounter
   pane (`/modsters hunt`) and the collection. Taller sprites show the compact
   text layout in the band (0012 points 6–8, unchanged).
4. **Small terminals get a picture through miniatures, not small sprites.**
   P5-09 (sprite miniatures) is the follow-up: when a sprite doesn't fit the
   band, show a miniature instead of the text-only layout.

## Consequences

- The `add-modster` skill, `docs/CONTENT_FORMAT.md` and the player-facing
  `create-modster-content` skill (`SKILL.md` and `reference/format.md`) say "at
  most 32 px tall and 48 wide" instead of recommending ≤ 24×14.
- Every built-in Modster already fits: the tallest are Serpentide, Elderbark
  and (after P5-19) Shellsprout at 32 px. Nothing needs redrawing.
- Until P5-09 lands, most Modsters show as the compact text band in an 80×24
  terminal, as they already do today.
- 0021's status line becomes "Accepted (point 5 superseded by 0033)".
