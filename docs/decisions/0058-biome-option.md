# 0058 — A `biome` option picks random or one fixed biome

- **Status:** Accepted (amends 0006, 0040 point 2)
- **Date:** 2026-11-20
- **Decided by:** @danielpg95 (accepted 2026-11-20; drafted by Claude)

## Context

0006 picks one enabled biome at random each session. @danielpg95 asked for a
way to choose it (2026-11-19), as a settings option rather than a key in the
Biomes tab. 0040 lists every option in the `5: Settings` tab and writes it
through `$.config.set`, so `/config` and the tab stay in sync. 0031 already
covers a biome changing mid-session (a reload that drops it), and 0032 lets the
player turn a biome off.

Three things need settling: when a change applies, what happens when the chosen
biome can't be played, and what the option stores.

## Options

**When a change applies**

1. **At once, or when the encounter in progress ends**, as 0031 does for a
   dropped biome. The player sees the result of the row they just changed.
2. **From the next session.** Simplest, but the row seems to do nothing.

**When the chosen biome is off, removed or fails to load**

1. **Play a random biome and keep the option's value.** Turning the biome back
   on, or fixing its file, brings it back without touching settings.
2. **Reset the option to `random`.** Clear, but the player loses their choice
   because of a typo or a turn-off.

## Decision

Option 1 for both:

1. **New `userConfig` field `biome`**, a string, default `random`. Any other
   value is a biome `id` (`saltbreeze-bay`). `/config` shows it as a free text
   row; the Settings tab is the normal way to change it.
2. **Session start** (amends 0006): with `random`, a biome is picked as 0006
   says. With an `id`, that biome is played. `/clear`, `/resume` and `/branch`
   keep the session's biome, as 0006 says.
3. **The Settings tab gets a `Biome` row** (amends 0040 point 2), after
   `Auto start`. It shows `Random` or the biome's name. `o` moves to the next
   value: `Random`, then each enabled biome in the Biomes tab's order, wrapping.
   It writes through `$.config.set` like every row (0040 points 3–4).
4. **A change applies as a 0031 move:** with no encounter, the new biome starts
   at once; with an encounter in progress, that encounter finishes where it is
   and the new biome starts when it ends, with the toast
   `Modster Hunter: now in <biome>`. Switching to `Random` doesn't move: the
   current biome stays until the next session. Turn and agent work time carry
   over; the spawn countdown isn't reset.
5. **A chosen biome that can't be played** (turned off, removed, invalid, or an
   unknown `id`) falls back to a random enabled biome, picked as 0006 says, with
   the toast `Modster Hunter: <id> isn't available · playing a random biome`.
   The option keeps its value, and the row reads `<name or id> (unavailable)`.
   When the biome comes back (turned on, or a reload loads it), the next session
   or the next Settings change plays it; the game doesn't move on its own.
6. **Turning off the chosen biome** in the Biomes tab is allowed (0032 still
   blocks the last playable biome) and behaves as point 5, moving as 0032 point
   5 already says for the session's biome.

## Consequences

- 0006 and 0040 say "amended by 0058" on their status lines and index rows.
- `plugin.json` gains `biome`; CONTENT_FORMAT.md's `userConfig` section and the
  README's settings list document it.
- The biome pick becomes a pure function of (option, enabled biomes, random
  source), tested under `plugin/tests/` (P5-79).
- If 0054 is accepted, the desktop Settings controls list the same row.
