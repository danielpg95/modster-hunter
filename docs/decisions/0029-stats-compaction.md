# 0029 — The Stats tab folds session stats idle for 24 hours into `stats:total`

- **Status:** Accepted (amends 0009)
- **Date:** 2026-10-13
- **Decided by:** @danielpg95 (chosen during P3-04; details drafted by Claude)

## Context

[0009](0009-collection-storage.md) keeps each session's counters in
`stats:<sessionId>` and says the pane compacts "old" session keys into
`stats:total`. It doesn't say which keys are old. `$.store` is shared by every
session on the machine and isn't atomic, so folding a key that a live session
still writes can lose that session's next count. A crash between writing
`stats:total` and deleting the folded keys would count them twice.

## Options

1. **Fold keys idle for 1 hour.** Few keys pile up, but a paused session that's
   still open could be folded mid-write.
2. **Fold keys idle for 24 hours.** Safely past any live session's activity; a
   heavy user keeps about a day of session keys.
3. **Fold keys idle for 7 days.** Very safe, but keys pile up for a week.

## Decision

Option 2.

1. When the Stats tab opens, the pane reads every `stats:*` key with
   `$.store.keys()`.
2. A `stats:<sessionId>` key is folded when its `updatedAt` is at least
   24 hours old, it isn't this session's, and `stats:total` doesn't already list
   it. Keys that don't read as `v: 1` stats are left alone and not counted.
3. `stats:total` holds the same counters as a session key (`v`, `encounters`,
   `catches`, `flees`, `runs`, `turns`, `startedAt`, `updatedAt`, `biomes`) plus
   `folded`: the session ids it already holds.
4. Order: re-read `stats:total`, add the folded keys and their ids, write it,
   then delete the folded keys, then drop ids from `folded` whose keys are gone.
   A crash at any step leaves either the key or its id, never a double count.
5. The tab shows `stats:total` plus every session key not in `folded`, this
   session's included.

## Consequences

- A session resumed after it was folded starts a fresh key; nothing is counted
  twice.
- The 24 hours live in `constants.ts`.
- P3-04 builds the pure fold and sum in `plugin/hooks/store/` with tests.
