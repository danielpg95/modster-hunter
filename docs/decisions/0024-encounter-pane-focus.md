# 0024 — `/modsters hunt` gives the encounter pane the keys, and the pane says how to switch

- **Status:** Proposed — settled by @danielpg95 (P2-18 starts once accepted)
- **Date:** 2026-10-10
- **Proposed by:** @victor-aguilars (after playing the pane on the local experiment branch; details drafted by Claude)

## Context

[0015](0015-encounter-pane.md) added the encounter pane, and its point 2 makes
the band draw nothing while the pane shows. Playing it, @victor-aguilars found
the pane hard to play:

- **Digits do nothing from the prompt.** A Button's `hotkey` fires only while
  its own site holds the keys. The one exception, a bare digit in an empty
  composer, reaches band Buttons only, never a pane's. With the band stepped
  aside, `1` at the prompt throws nothing; the person has to press
  `ctrl+x tab` first, and nothing says so.
- **The pane draws `[ Throw ]`**, not `1: Throw`: its Buttons aren't `plain`,
  so the hotkey isn't shown.
- **The mod never asks for focus.** `/modsters hunt` (0015) and the reopen at
  session start (0019) both open the pane without it.
- **Mouse clicks work only in the fullscreen layout** (`/tui fullscreen`).
  Without fullscreen, nothing in the pane can be clicked, including the
  engine's close mark (×).

What the mods API allows (`claude-code` types, v2.1.295):

- `$.ui.open({ focus: true })` is a request. The surface grants it only while
  the prompt holds the keys over an empty composer, so it never takes typed
  text. Right after the person runs a command, the composer is empty.
- The person moves the keys: `ctrl+x tab` into the pane, `Esc` back to the
  prompt (without `closeOnEscape` the pane stays open), `ctrl+x x` closes it.
  `$.ui.focus` only moves the ring inside a site that already holds the keys,
  so the mod can't send the keys to the pane later.
- The `Pane` render event has `isFocused` and `placement` (`dock` beside a
  fullscreen transcript from 110 columns, else `inline` above the prompt).
- The close mark is the engine's. No option hides it.

Tried on the experiment branch (focus on `/modsters hunt`, a hint line,
`plain` buttons): focus, `Esc` and `ctrl+x tab` work as expected. Docked in
fullscreen it "works great": clicks work and it stays while Claude asks a
question. Inline, the pane gives way to Claude's question dialogs and the ×
can't be clicked, but with the pane focused `Tab` reaches it and `Enter`
closes the pane.

## Options

1. **Focus and hints only.** `/modsters hunt` focuses the pane, the pane shows
   `1: Throw` and a line saying how to move the keys. Between encounters the
   person may need `ctrl+x tab` once per encounter.
2. **Option 1, plus a one-row band while the pane shows.** The band keeps
   `1: Throw · 2: Run · 3 left`, so a bare `1` works from the prompt. Changes
   0015 point 2, and repeats the encounter in two places.
3. **Ask for focus whenever a Modster appears.** Refused while the person
   types, but keys pressed just as a Modster appears would land in the pane.
   Breaks golden rule 6 ("never steals keystrokes").

Chosen: 1. @victor-aguilars also chose no fullscreen tip and no inline size
request (`rows`): the pane keeps the engine's default size.

## Decision

1. **`/modsters hunt` opens the pane with `focus: true`.** The person asked for
   it, and the surface grants focus only over an empty composer. Running it
   again while the pane is open moves the keys back to it.
2. **The reopen at session start stays without focus** (0019 point 3, 0023
   `always`). Only the person's own command asks for focus.
3. **The pane's Throw and Run Buttons are `plain`**, so they read
   `1: Throw   2: Run` as in the band. Layouts are 0012's and 0020's as before.
4. **The pane header ends with a dim hint**, chosen from `isFocused` and
   `placement`:

   | | `dock` | `inline` |
   | --- | --- | --- |
   | Focused | `· Esc: back to prompt` | `· Esc: back to prompt · ctrl+x x: close` |
   | Not focused | `· ctrl+x tab to play` | `· ctrl+x tab to play` |

   Inline shows `ctrl+x x` because the close mark there can't be clicked;
   `Tab` then `Enter` on it also works, but takes more keys to explain. The
   hint is cut before the biome name when the header doesn't fit.
5. **0015 point 2 stands**: the band draws nothing while the pane is open,
   placed and the shown tab. No one-row band backup.
6. **Not part of this decision:** asking for focus when a Modster appears, a
   fullscreen tip, an inline `rows` request, and hiding the close mark (the API
   has no way to).

## Consequences

- New roadmap task P2-18 implements it, with render tests for each cell of
  point 4's table and for the `focus` request on `/modsters hunt` only.
- Once accepted, 0015's status line names 0024 (point 1 amended: the pane
  opens with focus when the person asks for it).
- `docs/DEVELOPMENT.md` gains the pitfall: pane hotkeys need the pane to hold
  the keys; bare digits from the prompt reach band Buttons only; clicks need
  the fullscreen layout.
- Throwing from the pane still takes `ctrl+x tab` after the person types in
  the prompt. If play shows that's too much, option 2 can come back as its own
  decision.
