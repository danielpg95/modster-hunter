# 0015 — An opt-in encounter pane, with the band stepping aside while it shows

- **Status:** Accepted (amends 0002's first point); point 4 settled by 0019; points 2 and 5 amended by 0023 (display settings). Discussion: issue #35
- **Date:** 2026-10-08 (accepted 2026-10-09)
- **Decided by:** @danielpg95 (proposed by @victor-aguilars, after playing the P2-07 band and a local pane prototype)

## Context

Decision 0002 draws encounters in the band above the prompt and keeps panes for
the collection. Playing P2-07, @victor-aguilars liked the band but found it
small (7 rows at 80×24) and hidden whenever Claude's question dialog is up. A
local prototype showed the same encounter in a pane, and he prefers it.

What the mods API allows (see issue #35): no draggable or freely positioned
windows. A `Pane` opened with `$.ui.open` docks beside the transcript in
fullscreen from 110 columns and sits inline above the prompt otherwise; opened
by the person, it's placed at any width.

Two things came out of the prototype:

- A sprite drawn at 2× in the pane was "HUGE"; the normal size reads best.
- With the pane open, the band drew the same encounter again right below it.

## Options

1. **Band only** (0002 as is).
2. **Opt-in pane, band stays too**: the same encounter drawn twice.
3. **Opt-in pane, band steps aside while the pane shows it**.

## Decision

1. `/modsters hunt` opens an **encounter pane** (id `modster-hunt`, title
   "Modster Hunter"): the biome, whether Claude is working, and the live
   encounter (sprite at its normal size, name and tier, throws left, Throw
   button, result). The same layouts as the band (0012) decide what fits.
2. **While that pane is open, placed and the shown tab, the band draws
   nothing.** When it closes or another tab shows, the band takes the
   encounter back.
3. One encounter machine drives both places; a Throw from either counts once.
4. The mod still **never opens a pane by itself** (0002 point 3 stands).
   Opening it automatically (e.g. remembering that the person opened it last
   time) is an open question in issue #35, not part of this decision.
5. The band stays the default; nothing changes for someone who never opens the pane.

## Consequences

- New roadmap task P2-12 implements it.
- P3-01's `/modsters` pane (collection) and this one are separate panes for
  now; P3-01 may merge them into tabs.
- 0002's first point now reads "in the band, or in the encounter pane
  when the person opens it (0015)".
