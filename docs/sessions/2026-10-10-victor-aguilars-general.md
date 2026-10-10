# Session — 2026-10-10 — @victor-aguilars — general (legendary sprite test, decision 0021)

- **Task:** none claimed. Proposes decision 0021 and task P2-16. The content work is P2-09 (PR #52).
- **Branch:** `p2-16-bigger-sprites`
- **Status at end:** in-review (0021 is Proposed for @danielpg95)
- **Last commit:** see `git log` on the branch

## Goal for this session

Test the limits of what a Modster can look like by designing a legendary, then act on what the test showed.

## Done

- Designed Sunmane with @victor-aguilars, field by field: a legendary desert lion, fire type, "Sun Lion Modster", 3.2 m, 640 kg, the "Sunrise" entry, golden sun colors and a mane flicker. It was not added as content.
- Sprite versions (scripts and previews in @victor-aguilars's untracked `art-previews/`):
  - 24×12, side view, with busy and calm flicker variants. Read as "horrible", "doesn't look like a lion".
  - 24×12, front-facing. Read as "a dog, nothing legendary".
  - 32×24, front-facing (v1–v4). Read as a lion. v4 fixed the eyes: a golden iris and slit pupil instead of the "high" look of a dim amber iris with dark under-eye bags.
  - 32×24, three-quarter pose: a striking mane, but the head melted into it.
  - 32×24 v5, front-facing with a rising flame mane: the best result.
- Wrote decision 0021 (Proposed) with the 24×12 and 32×24 previews as evidence in `docs/decisions/0021/`, and added roadmap task P2-16.

## Decisions made

- @victor-aguilars chose to propose bigger sprites: first up to 32×24, then raised to 48×48 ("I don't want to limit creativity"). Where a sprite doesn't fit, the compact text band shows. Any Modster may use them.
- @victor-aguilars picked the three-quarter pose version of Sunmane as the one to use, not the front-facing v5.
- Claude drafted the rest of 0021:
  - Only 0012 point 5's bounds change, because points 6–8 already choose a layout by fit.
  - No second sprite per Modster.
  - The skill still recommends ≤ 24×12 by default.
  - `schemaVersion` stays 1.

## Problems and findings

- At 24×12, small and squat creatures work. Big or majestic ones don't, because the face gets about 6 rows.
- At 32×24, generated parts (the flame mane) plus hand-drawn parts (the face) work well. The hand-drawn face and body come out stiff, though. Claude's drawing is a second bottleneck; a human pixel artist would do better.
- Light terminals are harder: pale flames blend into a cream background, and per-pixel flicker turns into noise.

## Next steps

1. @danielpg95: accept, amend or reject 0021 (PR for P2-16's proposal).
2. If accepted, claim P2-16 and implement it. Then Sunmane can go in as Dustwind Expanse's legendary at 32×24 (P2-09). It needs a fix first: shrink the mane so it doesn't hit the canvas edges, and keep the tail visible.

## Open questions

- Does 0021 hold up? — @danielpg95

## Found along the way

- None.
