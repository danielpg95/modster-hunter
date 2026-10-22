# 0036 — A fifth built-in catcher, the Puzzle Cube

- **Status:** Accepted (amends 0035 point 13)
- **Date:** 2026-10-22
- **Decided by:** @danielpg95 (in the 2026-10-22 P5-31 session; drafted by Claude)

## Context

[0035](0035-catchers.md) point 13 names exactly four built-in catchers: `jar`,
`pod`, `lantern` and `net`. While trying out P5-31, @danielpg95 made a catcher
through the content skill: a scrambled puzzle cube that shuffles on each rock
and comes out solved on a catch. They asked to ship it as a built-in in the
P5-31 PR.

## Options

1. **Ship it as a fifth built-in** in P5-31 — every player gets it, and it
   shows a `contain` catcher using extra frames for `rock` and `caught`, which
   none of the four does. One more catcher to keep valid.
2. **Keep four built-ins** and show the cube only as a preview in the P5-31 PR
   — no new content, but players never see it.

## Decision

Option 1. Point 13 of 0035 gains a fifth built-in catcher:

- `puzzle-cube` (Puzzle Cube, `contain`): a 19×20 cube in 3/4 view, 5 frames.
  Frame 0 is the closed, scrambled cube; `rock` plays frames 1–3 (other
  scrambles), and `caught` shows frame 4, the solved cube. The top 9 rows are
  the lid (`lidRows: 9`). It has no glow.

The glass jar stays the default (0035 point 10). Like the others, it fits
Dunebun's sprite area and is credited in `plugin/content/CREDITS.md`.

## Consequences

- P5-31 ships `plugin/content/catchers/puzzle-cube/` and
  `docs/previews/catchers/puzzle-cube.gif`.
- The Catchers tab lists five built-ins.
