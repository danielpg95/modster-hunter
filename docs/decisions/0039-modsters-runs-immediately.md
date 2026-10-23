# 0039 — `/modsters` runs at once, even while Claude works

- **Status:** Proposed — settled by @danielpg95 in the P5-35 PR review
- **Date:** 2026-10-22
- **Proposed by:** @victor-aguilars (drafted by Claude)

## Context

A slash command registered without `immediate` waits until the turn in flight
ends (`CommandSpec.immediate` in the mods types). `/modsters` is registered
without it, so every subcommand typed while Claude works waits for the turn.
That's exactly when people play:

- `/modsters pane` opens the encounter pane after the Modster has likely
  wandered off.
- `/modsters stop` leaves the band running until the turn ends.
- `/modsters` (the collection) can't be checked while waiting.

With `immediate`, the command's `command.run` hook runs while the turn may still
be streaming. It must not assume the turn's state (what the transcript holds,
whether a tool is mid-call), and its `{ text }` prints as an idle run's does.
0038 left this out until someone checked it.

## Options

1. **Register `/modsters` as `immediate`.** Every subcommand runs at once. The
   handler never reads the turn: it opens panes, writes `autoStart` (0038),
   reloads content and replies with text. The game knows Claude is working from
   the turn and subagent events, not from the command.
2. **Leave it waiting.** It's safe, but the game's commands are late exactly
   when they matter.

## Decision

Option 1 (@victor-aguilars, 2026-10-22):

1. `/modsters` is registered with `immediate: true`, next to 0038's
   `argumentHint`. All subcommands (`hunt`, `stop`, `pane`, `reload`, `help`,
   the collection) run at once, during a turn too.
2. **The `command.run` hook stays turn-blind.** It never reads the transcript
   or the turn's tools. "Is Claude working" comes only from the encounter
   machine, which the turn and subagent events drive (0014, 0018).
3. `/modsters hunt` during a turn starts the spawn countdown at once, counting
   that turn's remaining work time. `/modsters stop` during a turn clears the
   band, status line and spinner text at once (0038 point 4).

## Consequences

- P5-35 adds the flag and a register test that checks it, and its hand check
  covers `/modsters pane` and `/modsters stop` typed mid-turn. If a mid-turn
  `$.config.set` reload disturbs the turn, or the reply prints in an odd place,
  the hand check records it and this decision is revisited before it's accepted.
- `docs/ARCHITECTURE.md`'s event map notes that `/modsters` runs immediately.
