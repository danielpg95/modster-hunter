# 0023 — Display settings: one toggle per place, a pane picker, and a one-line band that keeps Throw

- **Status:** Proposed — settled by @danielpg95 (P5-08; amends 0002 point 3, 0015 points 2 and 5, 0019 point 5)
- **Date:** 2026-10-10
- **Proposed by:** @danielpg95 (choices made in the P5-08 planning session; details drafted by Claude)

## Context

P5-08 (issue #35) lets the person pick where the game shows: the band, the
encounter pane, the spinner line and the status line, in any combination.
Today the band is the default (0002), the pane is opt-in through
`/modsters hunt` (0015) and reopens for people who opened it (0019).

What the mods API allows:

- A `userConfig` field is a `boolean`, a `number` or a `string`. A string field
  that declares `options` is a picker over exactly those values; a stored value
  outside them counts as unset. There is no multi-select.
- Each field is a row in `/config` (also `/config modster-hunter.<field>=value`
  and the install screen). **A change reloads the mod**, so an encounter in
  progress is dropped, as after any reload (0005).
- Only the band and a pane can hold a `Button`. `$.ui.status` pins plain text
  under the prompt. The `Spinner` line is drawn only while a turn runs, and an
  encounter lingers after the turn ends (0005).
- A pane the mod opens by itself is placed from 144 columns, or 110 for an id
  the person opened before (0019). Below that it waits undrawn.

## Options

1. **Field shape.**
   a. **One toggle per place, plus a picker for the pane.** Every combination
      exists; matches `showIdleLine`'s naming.
   b. **One preset picker** (`band`, `band+status`, …). Fewer rows, but not
      every combination.
2. **Throw with the band off.**
   a. **A one-line band during encounters only.** Throw stays one key away;
      nothing shows between encounters.
   b. **Band off only counts when the pane is set to `always`.** Simpler, but
      the toggle silently does nothing for most people.
   c. **The mod opens the pane when a Modster appears.** Breaks 0002's
      "never auto-opens a pane" far beyond 0019.
3. **What the pane setting controls.**
   a. **`off` / `when-opened` / `always`.** `when-opened` is 0019 as it is;
      `always` is 0019's option 3.
   b. **No pane setting.** 0019 stays the only rule.

Chosen: 1a, 2a, 3a.

## Decision

1. **Four new `userConfig` fields** (`plugin.json`, documented in
   CONTENT_FORMAT.md):

   | Key | Type | Default | What it does |
   | --- | --- | --- | --- |
   | `showInBand` | boolean | `true` | Draw the game in the band above the prompt |
   | `encounterPane` | string: `off`, `when-opened`, `always` | `when-opened` | When the encounter pane opens |
   | `showInSpinner` | boolean | `true` | Name the Modster in the spinner line while Claude works |
   | `showInStatusLine` | boolean | `true` | Show the encounter in the status line while one is up |

   The band and the pane keep today's behaviour by default. The spinner and
   the status line are **on by default** (@danielpg95's call): every player
   sees the encounter there too, and can turn them off in `/config`.

2. **One encounter machine** drives every place (0015 point 3). The spinner
   and status line only read its state; they hold no button, so a Throw is
   still counted once.

3. **Band** (`showInBand`):
   - `true`: as today (0012, 0020, 0021 if accepted).
   - `false`: between encounters the band draws nothing (no idle line). While
     an encounter is up, the band draws **0012's one-row compact layout**
     (`Mossling (common) · 1: Throw · 2: Run · 3 left`, Run left out when it
     doesn't fit, per 0020) and then a one-row result.
   - Either way, the band draws nothing while the encounter pane is open,
     placed and the shown tab (0015 point 2). **So a Throw is always on screen
     during an encounter**, in the pane or the band. (With `maxRows` 0 nothing
     can be drawn at all; that is 0012's rule and doesn't change.)

4. **Encounter pane** (`encounterPane`):
   - `when-opened`: 0019 as it is.
   - `always`: the mod calls `$.ui.open` for `modster-hunt` at `session.start`
     and at `classic.SessionStart` (`clear`, `resume`, `fork`), whatever
     `prefs:huntPane` holds, never asking for focus. A close by hand still
     stores `open: false` (0019 point 2) and closes it for that session;
     the next session opens it again. Unplaced below the column limit, it
     waits and the band keeps the encounter (0019 point 4).
   - `off`: the mod never opens the pane. `/modsters hunt` answers
     `The encounter pane is off · turn it on in /config` and doesn't change
     `prefs:huntPane`. If the pane is open when the mod loads with `off`, the
     mod closes it (a close by the mod, so `prefs:huntPane` is kept for when
     the setting comes back).

5. **Spinner** (`showInSpinner`): while a turn runs and an encounter is up,
   the mod rewrites the main turn's spinner `message` to the encounter in one
   short line (`A wild Mossling appeared!`, then the result such as
   `Mossling caught!`). Between encounters, and for other agents' spinner rows,
   it leaves the spinner alone. Elapsed time and tokens stay the engine's.

6. **Status line** (`showInStatusLine`): one line through `$.ui.status`,
   **only while an encounter is up** (@danielpg95's call): from the appearance
   `<name> (<tier>) · <n> left · 1: Throw in the band or pane`, then the result
   for the result time (0014). Between encounters the line is cleared, so
   nothing is pinned under the prompt while there's no Modster. Also cleared
   at `session.end`, and on load when the setting is `false`.

7. **Finding the settings:** the `/modsters` reply ends with
   `· Change where the game shows in /config`. In-game controls for these
   settings are not part of this decision; P3-01's settings section may add
   them later through `$.config.set`.

8. **0019's exception grows by one setting.** The mod still never opens a pane
   by itself except the encounter pane, either reopened for people who opened
   it (0019) or every session with `encounterPane: always`.

## Consequences

- P5-08 implements it: a pure `displayPlan` that decides what each place
  draws, tests with each place on and off, and the `userConfig` table in
  CONTENT_FORMAT.md.
- When accepted: 0002's, 0015's and 0019's status lines name 0023, and
  `CLAUDE.md` golden rule 6 and `docs/DEVELOPMENT.md` mention `always`.
- The defaults change what existing players see: after updating, the spinner
  and the status line show encounters until turned off. The CHANGELOG (P5-07)
  should say so.
- P5-08's roadmap entry said "the default (band only, as today)"; it now says
  band, spinner and status line on, pane `when-opened`.
- Changing any of these settings drops an encounter in progress (reload).
  `/config`'s help text says so for `showInBand` and `encounterPane`.
- ARCHITECTURE.md's event map gains `ui.render` (`Spinner`) and the status
  line.
