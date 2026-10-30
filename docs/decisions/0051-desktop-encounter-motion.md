# 0051 — On desktop, the encounter plays in the scene, one Svg per motion

- **Status:** Accepted
- **Date:** 2026-10-30
- **Decided by:** @danielpg95
- **Supersedes:** 0050

## Context

0050 chose the layout: the scene keeps its size, flashes and slides aside for
Throw and Run, a click on the Modster throws, and the details are tags in the
scene. Its point 7 said a redraw should resume the motion at the time already
elapsed. The P5-58 spike (`spikes/p5-58-encounter-overlay/`, versions 0.0.5 to
0.0.16) tried that in the Code tab and found the surface works differently:

- **A redraw that changes an image `Svg`'s source blinks**, and one that keeps
  it **restarts its animations** (a falling leaf jumps back to the top).
- **A source drawn before is reused with its animation already over**: the
  same arrival markup twice showed the finished scene first, then the motion.
  A unique source (stamped with its encounter's time) plays from its start, as
  a throw's `data-throw` does (0043).
- **Resuming at the elapsed time made the slide's speed jump**, since the delay
  between a press and the paint varies (100–300 ms against a 0.35 s slide).
- **A press that changes the pane's layout redraws the scene** and replays it.
- **A `Client` redraws only its own region.** Buttons it draws can show on its
  own timer without the scene being redrawn. A `Client` laid over the scene
  needs blank rows for its height (an empty `Box` collapses), hears clicks with
  their cell (a column is about 8.8 px), and doesn't hear keys itself.

@danielpg95 set the order of the arrival and asked for the buttons to show only
once the slide has uncovered their backdrop.

## Decision

On the `desktop` surface, in the band and the encounter pane. Points 1, 4, 5
and 8 of 0050 stand; this replaces the rest.

1. **The scene keeps its idle size.** The Modster (or its throw) is scaled to
   stand inside the strip, feet on the ground.
2. **The arrival is one `Svg`**, stamped with the encounter's start, in this
   order: a flash (0.4 s); the slide right (0.45 s, eased), uncovering a dark
   backdrop at the left; the Modster's silhouette fading in (0.25 s) and holding
   (0.5 s); the silhouette crossfading into the sprite (0.25 s); the name tag
   (name, caught mark, tier) fading in (0.25 s). About 2.1 s in all.
3. **Throw and Run are drawn by a `Client` laid over the scene**, with their 1
   and 2 hotkeys and the tries left under them. The `Client` shows them on its
   own timer once the slide has uncovered the backdrop (0.85 s) and tells the
   mod of a press. The same `Client` hears a click on the Modster and throws.
   That the hotkeys reach a `Button` inside a `Client` is assumed, not yet
   seen in the Code tab; if they don't, it's handled as a bug.
4. **The departure is one `Svg`**, stamped likewise: a cue where the Modster
   stood (0.4 s; a gold burst when caught, a grey puff when it fled or wandered
   off) with the Modster and its tag fading under it and the result in the tag,
   then the slide back (0.45 s).
5. **The `Svg` changes only under a cue**: the flash, a throw (its own motion,
   0043), and the departure. No redraw is planned inside a motion. The next
   redraw after one ends, for any reason, swaps in the still scene. A redraw
   that keeps the source restarts the leaves; that is accepted.
6. **Presses don't change the layout** of the band or the pane around the scene.
7. Unchanged: the terminal, the one-row band, `showIdleScene` off, and golden
   rules 6 and 7.

## Consequences

- P5-58 builds it in the band and the pane.
- The mod gains a surface module (the `Client`) for the first time.
- The timings live in `constants.ts`, with this decision named.
- If the hotkeys turn out not to reach the `Client`'s buttons, a follow-up
  decides between buttons drawn by the mod from the start (keys, no wait) and
  clicks only on desktop.
