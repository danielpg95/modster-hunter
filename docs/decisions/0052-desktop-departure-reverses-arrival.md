# 0052 — On desktop, a Modster that isn't caught leaves by reversing its arrival

- **Status:** Accepted
- **Date:** 2026-10-30
- **Decided by:** @danielpg95
- **Supersedes:** 0051

## Context

0051 point 4 gave every departure a cue where the Modster stood: a gold burst
for a catch, a grey puff when it fled or wandered off. Seeing it built (P5-58),
@danielpg95 asked for the departures without a catch to mirror the arrival
instead: the sprite turns back into its silhouette, which then vanishes. Asked
whether running away should do the same, they chose yes.

## Options

1. **Reverse the arrival for fled, wandered off and ran; keep the burst for a
   catch.** One look for every Modster that gets away; the catch stays the one
   that celebrates.
2. **Reverse it for fled and wandered off only; keep the puff for Run.** Run is
   the player's choice, but a third look adds little.

## Decision

Option 1. Everything in 0051 stands except point 4, which becomes:

4. **The departure is one `Svg`**, stamped with its start.
   - **Caught:** a gold burst where the Modster stood (0.4 s), the Modster and
     its tag fading under it, the result in the tag; then the slide back (0.45 s).
   - **Fled, wandered off or ran:** the arrival reversed. The sprite crossfades
     into its silhouette (0.25 s), the silhouette holds (0.5 s), then it fades
     out with the tag (0.25 s), the result in the tag; then the slide back
     (0.45 s). About 1.45 s in all.

## Consequences

- P5-58 builds it; the grey puff colour goes from `constants.ts`.
- The scene stays slid a little longer after a Modster gets away.
