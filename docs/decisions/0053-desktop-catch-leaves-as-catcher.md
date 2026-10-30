# 0053 — On desktop, a caught Modster leaves as its catcher fading, with no extra cue

- **Status:** Accepted
- **Date:** 2026-10-30
- **Decided by:** @danielpg95
- **Supersedes:** 0052

## Context

0052 kept 0051's gold burst for a catch: when the catch animation ended, the
catcher vanished and a burst played where the Modster had stood. Seeing it,
@danielpg95 asked why a catch needs a second animation when the catcher already
has one (its caught beat is the celebration, 0035). The burst also came after a
gap, with the catcher gone first.

## Options

1. **The catcher's last frame holds, then fades with the result tag, then the
   slide back.** Every departure has the same shape: what stands there fades,
   then the scene slides back.
2. **Keep the burst.** A second cue for the same moment.

## Decision

Option 1. Everything in 0052 stands except the caught departure, which becomes:

- **Caught:** once the catch animation is over, the departure `Svg` shows the
  catcher's last frame, still (made from the throw's end, so nothing replays),
  where the throw stood and at its size, with the result in the tag. Both fade
  out (0.25 s), then the slide back (0.45 s). No burst. With no catcher drawn,
  the tag fades alone.
- **Fled, wandered off or ran** stay as 0052 says: the arrival reversed.

## Consequences

- P5-58 builds it; the burst and its colour and length go from `constants.ts`.
