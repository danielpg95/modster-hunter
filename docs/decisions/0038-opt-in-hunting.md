# 0038 — The game runs only while `autoStart` is on; `/modsters hunt` and `stop` flip it

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
   `/modsters hunt` turns it on until `/modsters stop`, through an `autoStart`
   setting players can also change in `/config`. Nobody gets a band they
   didn't ask for, at the cost of one command before the first Modster.
3. **Off until started, every session.** Same as 2, but each session starts
   off. It's the safest, but players who like the game have to type the
   command every day.

## Decision

Option 2 (@victor-aguilars, 2026-10-22), with an `autoStart` setting as the
single switch and a cleaned-up set of commands:

1. **`autoStart` decides whether the game runs.** It's a new `userConfig`
   boolean, default `false`, titled "Auto start" ("Start hunting every session.
   /modsters hunt turns it on, /modsters stop turns it off"). The mod reads it
   once per load, and a change reloads the module (0023). While it's `false`,
   the mod draws nothing outside `/modsters`:
   - no band, idle line or scene,
   - no spinner text or status line,
   - no spawn countdown, so no encounters,
   - no encounter pane (0019's reopen and 0023's `always` wait for
     `autoStart`; an open pane is closed at load, a close by the mod),
   - no `turn` stats.
   There's no other stored on/off flag, so the command and `/config` can't disagree.
2. **New players start off; returning players stay on.** At the first
   `session.start` with no `prefs:welcomed`, if the store has any `caught:` or
   `stats:` key, the player already played, and the mod sets `autoStart` to
   `true` once through `$.config.set`. An update never switches their game off.
3. **`/modsters hunt`** sets `autoStart` to `true` through `$.config.set`. The
   reload starts the band (idle line and scene) and the spawn countdown. It
   replies `Hunting in <biome> · Modsters show up while Claude works · /modsters stop to stop`.
   When it's already on, the reply is the same and nothing changes. If
   `$.config.set` is refused (a managed setting), the reply says so.
4. **`/modsters stop`** sets `autoStart` to `false`. The reload drops an
   encounter in progress without a result, so it isn't counted as fled or run
   from. It also clears the band, status line and spinner, and closes the
   encounter pane (a close by the mod, so `prefs:huntPane` is kept, per 0019
   point 2). It replies `Modster Hunter stopped · /modsters hunt to play again`.
5. **`/modsters pane` opens the encounter pane.** It does everything 0015, 0019
   and 0024 said of `/modsters hunt`: it stores `prefs:huntPane`, asks for
   focus and gives 0023's `off` reply. When `autoStart` is `false`, it sets it
   to `true` first, since asking for the pane means the player wants to play.
6. **`/modsters help`** replies with the quickstart, one line each:
   `/modsters hunt` start · `/modsters stop` stop · `/modsters` your collection ·
   `/modsters pane` a bigger encounter view · `/modsters reload` load your own
   Modsters after changes · `1: Throw`, `2: Run` from an empty prompt ·
   Auto start on or off (`/config`).
7. **Unknown subcommands get help.** `/modsters <word>` with an unknown word
   replies `Modster Hunter doesn't know "<word>"`, then point 6's text, instead
   of opening the collection. `/modsters` alone still opens the collection,
   whether the game is on or off.
8. **The typeahead lists the subcommands.** `/modsters` is registered with
   `argumentHint` `[hunt | stop | pane | reload | help]`.
9. **A welcome toast, once.** At the first `session.start` with no
   `prefs:welcomed`, the mod shows one toast and stores `prefs:welcomed`
   = `{ v: 1 }`:
   - New players: `Modster Hunter is installed · /modsters hunt to play · /modsters help for the commands`.
   - Returning players (point 2): `Modster Hunter · new: /modsters stop turns the game off · /modsters help for the commands`.
10. **Rule 6 still holds.** The game never takes keys or opens a pane by itself
    beyond what 0019 and 0023 already allow, and those apply only while
    `autoStart` is on.

## Consequences

- When accepted: 0002, 0015, 0019, 0023 and 0024 get "amended by 0038" on their
  status lines and index rows. CLAUDE.md golden rule 6 gains "and only while
  hunting is on". CONTENT_FORMAT.md's `encounterPane` row and the
  `userConfig` description say `/modsters pane`.
  `plugin.json` gains `autoStart`. `docs/ARCHITECTURE.md` adds `autoStart`
  and `prefs:welcomed` to its state table and the new subcommands to its
  event map.
- Roadmap task P5-35 builds it, and its "done when" list follows this decision.
  The README's How to play table gains `/modsters hunt`, `/modsters stop`,
  `/modsters pane` and `/modsters help` in the same PR.
- Every session needs one command before the first Modster, but only once per
  player, not once per session. A quicker first Modster after `/modsters hunt`
  isn't part of this decision (0014 stands).
- In-game controls for `autoStart` (a Settings tab toggle) aren't part of this decision.
- Registering `/modsters` as `immediate` (so it runs while Claude works) isn't
  part of this decision. It needs a check in a real session first.
