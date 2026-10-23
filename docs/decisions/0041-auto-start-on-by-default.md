# 0041 — Auto start is on by default; one welcome toast says how to stop

- **Status:** Accepted
- **Date:** 2026-10-22
- **Decided by:** @danielpg95 (accepted with PR #153; proposed by @victor-aguilars, drafted by Claude)
- **Supersedes:** 0038 point 2 and the welcome texts of point 9; changes the default in point 1

## Context

0038 made the game off until the player runs `/modsters hunt`, because nothing
in the game could turn it off. 0038 also added that way out: `/modsters stop`,
an `autoStart` setting, `/modsters help`, and a welcome toast. With those in
place, @victor-aguilars wants new players to see the game right away, as the
game's idea is that Modsters show up while Claude works (0002).

## Options

1. **On by default, with one welcome toast that says how to stop.** New players
   see the game at once and learn the way out in their first session. It
   brings back the band nobody asked for, but now with a clear off switch.
2. **Keep 0038's off-by-default.** It's the safest, but every player needs a
   command before the first Modster.

## Decision

Option 1 (@victor-aguilars, 2026-10-22):

1. **`autoStart` defaults to `true`** in `plugin.json`. Everything else in
   0038 point 1 stands: while it's `false`, nothing draws outside `/modsters`.
2. **0038 point 2 is dropped.** There's no returning-player check and no
   `autoStart` write at session start, since on is already the default.
3. **One welcome toast for everyone**, once per player (`prefs:welcomed`, as
   in 0038 point 9), for 15 s:
   `Modster Hunter is on · Modsters show up while Claude works · /modsters stop to turn it off · /modsters help for more`.
4. 0038's commands (`hunt`, `stop`, `pane`, `help`, unknown words, the
   typeahead) and 0039 are unchanged.

## Consequences

- 0038's status line and index row say "points 1 (default),
  2 and 9 (texts) superseded by 0041".
- P5-35 builds it in the same PR: the `plugin.json` default, `welcome()` without
  the returning-player branch, one welcome text, and no `hasPlayed` helper.
  The tests change to match: the off state is tested with `autoStart: false`.
- CONTENT_FORMAT.md's `autoStart` row, ARCHITECTURE.md's `session.start` row
  and the README's install line follow.
