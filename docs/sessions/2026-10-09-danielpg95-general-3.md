# Session — 2026-10-09 — @danielpg95 — general: run from an encounter

- **Task:** none yet (decision 0020 and task P2-15, claimed in the same PR)
- **Branch:** `claim/p2-15`
- **Status at end:** in-review
- **Last commit:** see `git log` on the branch

## Goal for this session

Turn "the player can decide to flee from an encounter" into a decision and a claimable task.

## Done

- Decision 0020: `2: Run` beside Throw, only while waiting, its own `ran` outcome and `run` stats counter, the usual 4 s card then the normal countdown. Amends 0005, 0012 and 0014 (status lines and index updated).
- Roadmap task P2-15 (S), claimed by @danielpg95 in the same PR.
- `node tools/check-tracking.mjs` passes.
- Also: @danielpg95 ran P2-11 by hand with a real background subagent and it worked (the P2-11 handoff predates that check).

## Decisions made

- @danielpg95 picked the recommended option for each question: control, when, stats, after.
- Drafted by Claude: the outcome name `ran`, the card text `You ran from Sproutling.`, and the compact-layout rule that `2: Run` is left out when the line doesn't fit the band's width (buttons don't truncate; Throw always stays).

## Problems and findings

- Free runs could let a player skip commons to fish for rares; P2-10's playtest watches for it.

## Next steps

1. Merge the claim PR; then on `p2-15-run-from-encounter`, add `run` / `ran` to `plugin/hooks/game/encounter-machine.ts` with fake-clock tests.
2. Stats event and counter (`plugin/hooks/store/`), then the band and pane layouts (`plugin/hooks/render/band-view.ts`, `register.tsx`).

## Open questions

- None.

## Found along the way

- #45 (P2-13) conflicts with `main` in `docs/ROADMAP.md` and `docs/decisions/README.md` since #46; @victor-aguilars needs to merge `main`.
