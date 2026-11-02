# 0055 — On desktop, a caught catcher holds before it fades

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decided by:** @danielpg95
- **Amends:** 0053

## Context

0053 made a catch leave as its catcher fading: after the `caught` beat (0.7 s,
decision 0035), the catcher's last frame and the tag fade out (0.25 s), then the
scene slides back. A run, a flee or a wander-off leaves by reversing the
arrival (0052): the sprite fades into its silhouette, the silhouette holds
0.5 s, then it vanishes, 1.0 s before the slide. Next to that, @danielpg95 found
the catch rushed: the catcher starts fading the moment its animation ends.

## Options

1. **Hold the catcher's last frame before the fade.** The same 0.5 s as the
   silhouette's hold, so both departures pause on what stands there. Desktop
   only; the `caught` beat stays as it is.
2. **A longer `caught` beat** (0.7 s → 1.2 s). Slows the catcher's own
   celebration on every surface, and changes 0035's shared beat lengths.
3. **Both.** The longest catch, and both decisions change.

## Decision

Option 1. Everything in 0053 stands except the caught departure's timing:

- **Caught:** the departure `Svg` shows the catcher's last frame and the tag,
  still, for `MOTION.caughtHoldS` (0.5 s), then both fade out (0.25 s), then the
  slide back (0.45 s).
- Beat lengths (0035 point 5) and the other departures (0052) don't change.

## Consequences

- P5-65 adds `caughtHoldS` to `MOTION` and starts the caught fade and slide after it.
- A catch's result card stays up 0.5 s longer before the scene is back; the
  result card's own length (`ENCOUNTER.resultMs`, 4 s) already covers it.
