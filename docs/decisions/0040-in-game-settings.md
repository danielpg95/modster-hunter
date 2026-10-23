# 0040 — `/modsters settings` opens a Settings tab where players change every option

- **Status:** Accepted (amends 0023 point 7, 0038 points 6 and 7)
- **Date:** 2026-10-22
- **Decided by:** @danielpg95 (accepted with PR #154; proposed by @victor-aguilars, drafted by Claude)

## Context

The mod's options (`userConfig`: Auto start, where the game shows, the idle
scene, built-in content, the idle timeout) live only in Claude Code's `/config`.
They sit among Claude Code's own settings, or behind `/plugin` → Installed →
Configure options. In the P5-35 hand check, @victor-aguilars first didn't find
them in `/config`, and found it odd that a game's settings live there at all.

The collection pane already has a `5: Settings` tab, but it only lists content
problems and says "Change where the game shows in /config". 0023 point 7 and
0038 left in-game controls for later. The mod can change its own rows with
`$.config.set` (`modster-hunter.<field>`), as `/modsters hunt` and `stop`
already do (0038).

## Options

1. **Real toggles in the Settings tab, opened by `/modsters settings`.** Every
   option is in one place inside the game, and `/config` stays in sync because
   the tab writes the same rows. It's the most work: a list, keys, and applying
   changes.
2. **`/modsters settings` opens the tab as it is.** Small, but players still
   have to go to `/config` to change anything.
3. **`/modsters settings` replies with the values as text.** Small, but nothing
   can be changed in the game.

## Decision

Option 1 (@victor-aguilars, 2026-10-22):

1. **`/modsters settings`** opens the collection pane on the `5: Settings` tab,
   with focus, as `/modsters` opens it (0024 point 1). It joins the typeahead
   hint, `[hunt | stop | pane | settings | reload | help]`, and `/modsters help`.
2. **The Settings tab lists the options first**, one row each: a label, then the
   current value. In this order:

   | Row | Field | Values |
   | --- | --- | --- |
   | Auto start | `autoStart` | on, off |
   | Show in the band | `showInBand` | on, off |
   | Encounter pane | `encounterPane` | off, when-opened, always |
   | Show in the spinner | `showInSpinner` | on, off |
   | Show in the status line | `showInStatusLine` | on, off |
   | Idle line | `showIdleLine` | on, off |
   | Idle scene | `showIdleScene` | on, off |
   | Built-in content | `includeBuiltins` | on, off |
   | Idle timeout | `encounterIdleTimeoutSec` | 30, 60, 90, 180, 300 s |

   `sounds` isn't listed until P5-02 makes it do something. Below the options,
   the tab keeps today's content problems and the reload and turn-off hints
   (P4-02, 0032).
3. **Keys, as in the other tabs:** `k` and `j` move the selection, and `o`
   changes the selected row (`TOGGLE_HOTKEY`, which already means "turn off or
   on"). An on/off row flips, and a row with several values moves to the next
   one, wrapping. An idle timeout that isn't a listed value moves to the next
   listed value above it, or to 30 s past 300 s.
4. **A change writes the `/config` row through `$.config.set`**, so `/config`,
   `/plugin` and the tab always show the same value. When the write is refused,
   a toast says why and the row keeps its value.
5. **A change takes effect at once**, whether or not the engine reloads the mod
   after the write:
   - Auto start does what `/modsters hunt` and `stop` do (0038 points 3–4).
   - The display rows redraw the band, spinner, status line and pane by 0023's
     rules. An encounter in progress is kept if the mod isn't reloaded.
   - Built-in content reloads content as `/modsters reload` does (0031).
   - The idle timeout applies from the next encounter.
   After a reload, the pane comes back on the Settings tab, with the same row
   selected.
6. **In-game text points to `/modsters settings`, not `/config`:**
   - the help's last line: `Auto start is on · /modsters settings`
   - 0023's reply when the pane is off: `The encounter pane is off · turn it on in /modsters settings`
   - the Settings tab's old "Change where the game shows in /config" line, which
     is no longer needed and is removed.

   `/config` keeps working as before.

## Consequences

- 0023's and 0038's status lines and index rows say
  "amended by 0040". CONTENT_FORMAT.md's `userConfig` section says the options
  can be changed in `/modsters settings`. ARCHITECTURE.md adds the Settings
  tab's selection to its state table and `settings` to the `command.run` row.
- Roadmap task P5-36 builds it, after P5-35. The README's How to play table
  gains `/modsters settings`, and `/config` there becomes "or `/config`".
- The hand check confirms what a `$.config.set` reload does to an open pane. If
  the pane can't come back on the Settings tab after a reload, the task records
  it and this point is revisited before release.
