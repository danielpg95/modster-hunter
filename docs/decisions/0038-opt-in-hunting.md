# 0038 — The game is off until the player starts it with `/modsters hunt`

- **Status:** Proposed — settled by @danielpg95 (maintainer)
- **Date:** 2026-10-22
- **Proposed by:** @victor-aguilars (drafted by Claude)
- **Amends:** 0002, 0015 point 1, 0019 points 1 and 3, 0023 point 4, 0024 point 1 (on acceptance)

## Context

Right after someone installs the mod, the game runs in the band above the
prompt (0002), and nothing in the game turns it off:

- `showInBand: false` still draws one row during every encounter (0023 point 3).
- `showIdleLine` and `showIdleScene` hide only the time between encounters.
- The only full stop is turning the plugin off in `/plugin`.

There's also no welcome. A new player doesn't learn about `1: Throw`,
`/modsters` or how to stop until they go looking. @victor-aguilars worries
that people who try the mod and feel stuck with the band will uninstall it.

`/modsters hunt` already exists. It opens the encounter pane (0015, 0019,
0024).

## Options

1. **Keep it on by default and add a way out.** Add `/modsters stop` and a
   welcome toast that mentions it. It changes the least, but the band still
   appears in front of people who never asked for it.
2. **Off until the player starts it.** A welcome toast explains the game, and
   `/modsters hunt` turns it on until `/modsters stop`. Nobody gets a band they
   didn't ask for, at the cost of one command before the first Modster.
3. **Off until started, every session.** Same as 2, but each session starts
   off. It's the safest, but players who like the game have to type the
   command every day.

## Decision

Option 2 (@victor-aguilars, 2026-10-22):

1. **Hunting is a stored choice.** `prefs:hunting` = `{ v: 1, on: boolean }` in
   `$.store`. While it's off, the mod draws nothing outside `/modsters`:
   - no band, idle line or scene,
   - no spinner text or status line,
   - no spawn countdown, so no encounters,
   - no encounter pane (0019's reopen and 0023's `always` wait for hunting),
   - no `turn` stats.
2. **New players start off.** If `prefs:hunting` is missing, it counts as off,
   with one exception. **Players who already played** (the store has any
   `caught:` or `stats:` key) count as on, so an update doesn't switch their
   game off. The mod writes the value the first time it decides.
3. **`/modsters hunt` turns hunting on** and stores `on: true`. The band starts
   (idle line and scene) and the spawn countdown begins. It replies
   `Hunting in <biome> · Modsters show up while Claude works · /modsters stop to stop`.
   Running it while hunting is on gives the same reply and changes nothing.
4. **`/modsters stop` turns hunting off** and stores `on: false`. An encounter
   in progress ends without a result, so it isn't counted as fled or run from.
   The band, status line and spinner clear, and the mod closes the encounter
   pane (a close by the mod, so `prefs:huntPane` is kept, per 0019 point 2). It
   replies `Modster Hunter stopped · /modsters hunt to play again`.
5. **The encounter pane moves to `/modsters pane`.** It does everything 0015,
   0019 and 0024 said of `/modsters hunt`: it stores `prefs:huntPane`, asks
   for focus and gives 0023's `off` reply. It also turns hunting on if it was
   off, since asking for the pane means the player wants to play.
6. **`/modsters` (the collection) works whether hunting is on or off.**
7. **A welcome toast, once.** At the first `session.start` with no
   `prefs:welcomed`, the mod shows one toast and stores `prefs:welcomed`
   = `{ v: 1 }`:
   - New players: `Modster Hunter is installed · /modsters hunt to play · 1 to throw · /modsters for your collection`.
   - Players who already played (point 2):
     `Modster Hunter · new: /modsters stop turns the game off, /modsters hunt turns it back on`.
8. **Rule 6 still holds.** Hunting never takes keys or opens a pane by itself
   beyond what 0019 and 0023 already allow, and those apply only while hunting
   is on.

## Consequences

- When accepted: 0002, 0015, 0019, 0023 and 0024 get "amended by 0038" on their
  status lines and index rows. CLAUDE.md golden rule 6 gains "and only while
  hunting is on". CONTENT_FORMAT.md's `encounterPane` row and the
  `userConfig` description say `/modsters pane`.
  `docs/ARCHITECTURE.md` adds `prefs:hunting` and `prefs:welcomed` to its
  state table and the new subcommands to its event map.
- Roadmap task P5-35 builds it, and its "done when" list follows this decision.
  The README's How to play table gains `/modsters hunt`, `/modsters stop` and
  `/modsters pane` in the same PR.
- Every session needs one command before the first Modster, but only once per
  player, not once per session. A quicker first Modster after `/modsters hunt`
  isn't part of this decision (0014 stands).
- In-game controls for hunting (a Settings tab toggle) aren't part of this decision.
