# Phase 2 review — Core loop with built-in content — 2026-10-12

- **Reviewed by:** @danielpg95
- **Tasks:** P2-01 … P2-18 (all `[x]`)
- **Contributors:** @victor-aguilars, @danielpg95

## What shipped

A complete encounter loop with starter content, in `plugin/`.

- **P2-01** (PR #18): content schema, types and validator.
- **P2-02** (PR #26): `tools/sprite.mjs`, the sprite converter.
- **P2-03** (PR #22): built-in content loader.
- **P2-04** (PR #28): one random biome per session.
- **P2-05** (PR #20): rarity tiers, attempts and catch-rate resolution.
- **P2-06** (PR #31): the encounter state machine.
- **P2-07** (PR #33): the band encounter UI; `spikes/` removed.
- **P2-08** (PR #37): collection storage, one `$.store` key per Modster.
- **P2-09** (PRs #29, #52, #71, #72, #81): Whispering Forest, Dustwind Expanse and Saltbreeze Bay, with official Modsters; forest weights 100/20/4/1.
- **P2-10** (this review): playtest closed.
- **P2-11** (PR #48): background subagents count as work time.
- **P2-12** (PR #39, #43): the opt-in encounter pane, `/modsters hunt`.
- **P2-13** (PR #45): Modster dex fields.
- **P2-14** (PR #61): the encounter pane reopens for people who opened it.
- **P2-15** (PR #51): `2: Run` from an encounter.
- **P2-16** (PRs #55, #80): sprites up to 48×48.
- **P2-17** (PR #57): up to two types per Modster.
- **P2-18** (PR #70): encounter pane focus and hints.

## What changed from the plan

- Added mid-phase from play and feedback: P2-11 to P2-18 (pane, reopen, run, dex fields, bigger sprites, two types, pane focus).
- Sprite bounds grew from 24×12 (0012) to 48×48 (0021); the compact band shows when they don't fit.
- P4-01, P4-04, P4-06, P5-08 and P5-10 to P5-14 started and finished while Phase 2 was still open, since their own dependencies were done.

## Decisions made in this phase

- 0013 — All `$` calls live in `register.ts`; pure modules reach the host through plain ports
- 0014 — Encounter timings, a work-time spawn countdown, and no throws outside "waiting"
- 0015 — An opt-in encounter pane, with the band stepping aside while it shows
- 0017 — Modsters carry a dex entry
- 0018 — Background subagents count as work time for the spawn countdown
- 0019 — The encounter pane reopens for people who opened it
- 0020 — The player can run from an encounter with `2: Run`
- 0021 — Sprites up to 48×48
- 0022 — A Modster has one or two types
- 0024 — `/modsters hunt` gives the encounter pane the keys

## Playtest notes

- @danielpg95 and @victor-aguilars played the mod during their own work sessions across the phase. On 2026-10-12 the maintainer judged the feedback enough to close P2-10; no separate playtest log was kept.
- That feedback already landed as tasks P2-11 to P2-18 and P5-10 to P5-14.
- Tier defaults in 0004 stay as they are; no numbers changed, so no new decision.
- Open watch item from 2026-10-09: free runs (0020) could let a player skip commons to fish for rares. Not reported as a problem.

## Debt and follow-ups

- No written per-player playtest notes. If tier numbers need tuning later, record the numbers in a new decision amending 0004.

## Next phase adjustments

- None. Phase 3 tasks P3-01 … P3-05 stay as written; P3-01 can now be claimed.
