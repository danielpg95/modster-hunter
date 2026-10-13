# 0027 — Between encounters the encounter pane shows the biome's idle scene

- **Status:** Accepted (amends 0026 point 7)
- **Date:** 2026-10-12
- **Decided by:** @danielpg95 (chosen during the P5-13 check by hand; details drafted by Claude)

## Context

[0026](0026-biome-idle-scene.md) draws the idle scene in the band only. Point 7
kept the encounter pane's idle view as text. While the pane is open, placed and
shown, the band steps aside ([0015](0015-encounter-pane.md) point 2), and the
pane reopens every session for people who opened it ([0019](0019-reopen-encounter-pane.md),
[0023](0023-display-settings.md)). So people who use the pane never see a scene.

The P5-13 check by hand found this. In fullscreen, with the pane docked at 207
columns, the debug log showed the scene loaded, the pane placed, and the band
never reaching its layout. The text @danielpg95 saw was the pane's idle view.

## Options

1. **The pane's idle view shows the scene.** The pane has more rows than the
   band, so the scene almost always fits, and the band still steps aside as in 0015.
2. **The band keeps the scene while the pane is idle.** The band steps aside only
   during encounters. This changes 0015 point 2, and the game takes rows in two
   places at once.
3. **Leave it.** The scene stays band-only, and pane users keep the text view.

## Decision

Option 1. Point 7 of 0026 becomes:

7. **Encounters win.** When an encounter starts, the encounter layout replaces
   the scene, in the band and in the pane. While the encounter pane is shown,
   the band steps aside (0015), and the pane's idle view shows the scene instead:
   - **Layout:** the header, a blank row, the scene, then the idle text. The
     scene tiles to the pane's body width.
   - **When it shows:** on the terminal (`Raster`), when the scene's rows plus
     the idle text fit in the pane's body rows minus the header and blank row.
     Otherwise the pane keeps today's text. This is the same rule as the band
     (0026 point 4), applied to the pane's rows.
   - **Motion:** the same as the band (0026 point 5). It moves only while Claude
     works and holds still between turns, on the same timer, blitted to
     whichever of the band and the pane is drawing it.
   - **Setting:** `showIdleScene` turns it off in the pane too. `showIdleLine`
     doesn't apply to the pane, which always has its idle text (0015).

Every other point of 0026 stands.

## Consequences

- P5-13 gains a done-when item. The pane's render hook draws the scene through
  `bandView`'s scene rule with the pane's rows. The band, while it steps aside,
  also drops its scene site, so the timer never blits to a band that isn't drawing.
- Pane render tests cover the scene showing, moving with turns, falling back to
  text in a short pane, and `showIdleScene: false`.
- The check by hand covers both layouts: the band with the pane closed, and the
  pane in fullscreen.
