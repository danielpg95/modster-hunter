# Session — 2026-10-22 — @victor-aguilars — general: opt-in hunting (decision 0038)

- **Task:** none (proposes decision 0038 and adds task P5-35)
- **Branch:** `decision-0038-opt-in-hunt`
- **Status at end:** in-review
- **Last commit:** see the PR

## Goal for this session

Think through what a new player sees after installing, and fix the worry that
nobody can close the band from inside the game.

## Done

- Traced the first run from the code: no welcome. The band shows
  `<biome> · listening for Modsters` right away, and the first Modster comes
  after 10–30 s of Claude's work time (0014). `1` throws only from an empty
  prompt.
- Confirmed nothing in the game fully turns it off: `showInBand: false` still
  draws one row per encounter (0023 point 3). Only disabling the plugin stops it.
- `docs/decisions/0038-opt-in-hunting.md` (Proposed) and its index row.
- `docs/ROADMAP.md`: P5-35 "Opt-in hunting and a welcome toast", listed in the
  workboard's "Up next" as waiting for 0038.
- Verified with `node tools/check-tracking.mjs`.

## Decisions made

- @victor-aguilars: the game is off until `/modsters hunt`, and stays on across
  sessions until `/modsters stop`.
- @victor-aguilars: once on, the game draws in the band as today. The encounter
  pane moves to its own subcommand (`/modsters pane` in the draft).
- @victor-aguilars: the welcome toast shows on the first session only.
- @victor-aguilars: a setting in `/config` controls auto start. It's the single
  switch: `/modsters hunt` and `/modsters stop` flip it through `$.config.set`,
  so there's no hidden stored flag.
- @victor-aguilars: the encounter pane command is `/modsters pane`.
- @victor-aguilars: add `/modsters help`, a typeahead hint listing the
  subcommands, and a help reply for unknown subcommands instead of silently
  opening the collection.
- Claude's additions in the draft, for @danielpg95 to confirm: players who
  already played get `autoStart` set to on once after the update (0038 point 2),
  plus a one-time toast about `/modsters stop`. `/modsters pane` also turns
  `autoStart` on.

## Problems and findings

- `/modsters hunt` is tied into 0015, 0019, 0023 and 0024, so moving the pane to
  `/modsters pane` amends all four. Their status lines change only once 0038 is
  accepted.

## Next steps

1. @danielpg95 reviews the 0038 PR: accept, change or reject it.
2. Once accepted, someone claims P5-35 and builds it, starting with the
   `autoStart` field in `plugin.json` and the `prefs:welcomed` helper in
   `plugin/hooks/store/`.

## Open questions

- Should returning players really stay on, or start off like everyone else? — @danielpg95.

## Found along the way

- `/modsters` isn't registered as `immediate`, so it probably waits until
  Claude's turn ends. That's awkward for a game played while Claude works.
  Check it in a real session, then propose a fix.

- A quicker first Modster after `/modsters hunt` could help new players. It
  would change 0014, so it's left out of 0038.
