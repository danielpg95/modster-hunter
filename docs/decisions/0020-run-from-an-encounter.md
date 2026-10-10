# 0020 — The player can run from an encounter with `2: Run`

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decided by:** @danielpg95 (layout fit rule and wording drafted by Claude)

## Context

Today an encounter ends three ways: caught, fled after the last miss, or
wandered off after the idle timeout ([0005](0005-encounter-lifetime.md)). A
player who doesn't want a Modster has to wait out the timeout (90 s by
default) before the next one can appear. Throws only work while the encounter
is waiting ([0014](0014-encounter-timings.md) point 3), and the band's layouts
are fixed by [0012](0012-sprite-size-and-band-layout.md).

## Options

Control: a `2: Run` button beside Throw; a `/modsters run` command only; a
button in the encounter pane only.

When: only while waiting; or any time before the result (a run mid-wobble
would discard a throw already rolled).

Stats: its own outcome and counter; counted as fled; not counted.

After: the usual result card then the normal countdown; clear at once; a card
plus a longer cooldown.

## Decision

1. **Control:** a `Run` button with digit hotkey `2`, right after `1: Throw`,
   in the band and the encounter pane (0015). Same input rule as Throw: the
   hotkey fires only from an empty prompt (0002).
2. **When:** only while the encounter is **waiting**, like Throw. During
   appearing and the wobble the button isn't shown and presses are ignored.
3. **Outcome:** a new outcome **`ran`** (not `fled`, not `caught`). It
   records a `run` stats event, counted separately from flees in the session's
   `stats:<sessionId>` key (0009 stands). The encounter still counts as seen.
4. **After:** the result card shows `You ran from Sproutling.` for the usual
   result time (0014, 4 s), then the next spawn countdown starts as after any
   result. No extra cooldown.
5. **Layouts** (amends 0012 points 6–7):
   - Full: the button line becomes `1: Throw   2: Run`.
   - Compact, 2 rows: `1: Throw · 2: Run · 3 left`.
   - Compact, 1 row: `Sproutling (common) · 1: Throw · 2: Run · 3 left`.
   - In the compact layouts `2: Run` is drawn only when the whole line fits the
     band's width; otherwise it's left out and Throw stays. Text segments still
     truncate, so the band never grows past `maxRows`.

## Consequences

- New roadmap task P2-15.
- The encounter machine gets a `run` input and a `ran` outcome; `EncounterEvent`
  gets `{ type: 'ran' }`; stats get a `runs` counter.
- P3's Stats tab can show runs next to catches and flees.
- P2-10 (playtest) watches whether free runs make rare Modsters too easy to
  fish for; a cooldown would need a new decision.
