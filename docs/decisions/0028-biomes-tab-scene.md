# 0028 — The Biomes tab shows the selected biome's idle scene

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decided by:** @danielpg95 (chosen during P3-03; details drafted by Claude)

## Context

P3-03 lists biomes in the collection pane's Biomes tab, each with its Modsters'
encounter odds. The list shows a biome's name and accent color, but not what it
looks like. Each biome already has an idle scene ([0026](0026-biome-idle-scene.md)):
its background art tiled across, with particles. It's drawn in the band and in
the encounter pane ([0027](0027-pane-idle-scene.md)), and only for the session's
biome. No decision covers the collection pane.

The built-in scenes are 48×12 pixels, so 6 terminal rows. An inline collection
pane has about 5 rows for the tab, so the scene fits mainly in docked panes.

## Options

1. **The selected biome's scene, animated, at the top.** Moving through the list
   previews each biome. It needs its own timer, apart from the band's.
2. **Only the session biome's scene.** It could share the band's scene and
   timer, but the other biomes show nothing.
3. **A still first frame.** It needs no timer, but looks different from the band.

## Decision

Option 1.

1. **What:** the Biomes tab draws the selected biome's idle scene (0026 points
   1–3: its background tiled to the pane's body width, with its particles). A
   biome with neither background nor particles shows none.
2. **Where:** under the tab's summary line, above the biome list and the odds,
   full width.
3. **When it shows:** on the terminal (`Raster`), when the scene's rows still
   leave the list at least 3 rows (`COLLECTION.biomeSceneListRows`). Otherwise
   it's left out, as in 0026 point 4. `showIdleScene: false` turns it off here too.
4. **Motion:** it animates whenever the Biomes tab shows, while a turn runs or
   not, since people browse the pane between turns. It has its own timer, at the
   scene's `timerFps`. The timer stops on another tab, when the scene doesn't fit,
   and when the pane closes. Selecting another biome starts that biome's scene over.

## Consequences

- P3-03 gains a done-when item for the scene. The tab's render tests cover it
  showing, following the selection, its timer stopping, and it being left out
  in a short pane or with `showIdleScene: false`.
- The pure scene functions (`idleScene`, `makeParticles`, `sceneCells`) are
  reused as they are. Only `register.tsx` gains a second scene site and timer.
- The check by hand covers a docked pane (scene shown) and an inline one (left out).
