# 0019 — The encounter pane reopens for people who opened it, until they close it by hand

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decided by:** @danielpg95 (issue #35; details drafted by Claude)

## Context

[0015](0015-encounter-pane.md) added `/modsters hunt`, which opens the
encounter pane. Point 4 kept [0002](0002-where-the-game-is-drawn.md)'s rule
that the mod never opens a pane by itself, and left auto-opening to issue #35.
Typing `/modsters hunt` every session is a chore.

The mods API already treats this case specially: a pane a mod opens on its own
is placed only from 144 terminal columns, but from 110 for an id the person has
asked for before ("in this session or an earlier one, until they close the
pane by hand"). Below that it waits undrawn and `$.ui.open` resolves
`{ isPlaced: false }`. `ui.close` reports who closed a pane: `person`,
`plugin` or `unload`.

## Options

1. **Never auto-open** (0002 and 0015 as they are).
2. **Reopen for people who opened it**: remember that the person opened the
   pane and reopen it at session start, until they close it by hand.
3. **A setting** (`userConfig`) that opens it every session. Needs P5-08's
   display settings first, and a new user has to find it.

## Decision

1. When the person opens the pane with `/modsters hunt`, the mod stores
   `prefs:huntPane` = `{ v: 1, open: true }` in `$.store`.
2. When the person closes the pane **by hand** (`ui.close` with origin
   `person`), the mod stores `{ v: 1, open: false }`. A close by the mod or an
   unload changes nothing.
3. At `session.start` (and `classic.SessionStart`, so `/clear`, `/resume` and
   `/branch` keep it), if `open` is `true`, the mod calls `$.ui.open` for
   `modster-hunt`. It never asks for focus.
4. If the reopened pane isn't placed (terminal under 110 columns), the mod
   shows nothing extra: the band keeps the encounter (0015 point 2), and the
   pane appears by itself if the terminal widens.
5. **No other pane ever opens by itself.** This is the only exception to 0002's
   "never auto-opens a pane"; 0015 point 4 is settled by this decision.

## Consequences

- New roadmap task P2-14.
- `CLAUDE.md` golden rule 6 and `docs/DEVELOPMENT.md` mention the exception.
- 0002 is amended by 0015 and 0019; 0009's store conventions apply
  (re-read before write, `v: 1`).
- P5-08 (display settings, if added) can turn this into a setting later.
