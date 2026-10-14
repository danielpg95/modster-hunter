# Phase 3 review — Collection pane — 2026-10-13

- **Reviewed by:** @danielpg95
- **Tasks:** P3-01 … P3-05 (all `[x]`)
- **Contributors:** @danielpg95

## What shipped

`/modsters` opens a focused collection pane with four tabs. Three of them are
filled; Settings waits for P4-02.

- **P3-01** (PR #90): the `modster-collection` pane, separate from the
  encounter pane. Tabs on `1`–`4`, Esc closes it, and the tab row sits beside
  the header, on its own row or in a column, depending on width.
- **P3-02** (PR #92): the Collection tab. A list sits beside the selected
  Modster's detail: animated sprite, types, habitat, first and last catch, and
  the dex (0017). Uncaught Modsters show as `???` with a still gray silhouette.
  `j`/`k` move the selection. The layout is sized once per pane from the
  largest sprite, so it doesn't change with the selection.
- **P3-03** (PR #94): the Biomes tab. Biomes are listed with the current one
  marked, and each one's odds come straight from the P2-05 resolver. The
  selected biome's idle scene shows above the list when it fits (0028).
- **P3-04** (PR #96): the Stats tab. It shows totals and a per-biome table, and
  session keys idle for 24 hours fold into `stats:total` (0029).
- Tests went from 538 to 612.

## What changed from the plan

- **P3-02 is a list plus detail, not a grid.** Sprites up to 33×16 cells don't
  fit tiles, and inline panes have about 8 rows. @danielpg95 proposed the change.
- **P3-03 gained the idle scene** mid-task (decision 0028).
- **P3-04 had to define compaction** first, since 0009 left it open (decision 0029).
- **Claims go through `claim/<id>` PRs** from P3-02 on. P3-01's claim went
  straight to `main` through the branch-protection bypass.
- Outside the phase, while it was open: P5-15 (the game keeps running after
  `/clear`) and P5-16 (tier-first encounters, 0030) were added and finished,
  and the P5-17 spike was added.

## Decisions made in this phase

- 0028 — The Biomes tab shows the selected biome's idle scene
- 0029 — The Stats tab folds session stats idle for 24 hours into `stats:total`
- 0030 — An encounter picks a tier first, then a Modster from that tier (P5-16,
  decided during this phase)
- Settled in session logs, with no decision file needed: the collection pane
  stays separate from the encounter pane (0015 left it open), and Esc closes it.

## Playtest notes

- No separate playtest. @danielpg95 checked each tab by hand, inline and docked,
  before approving it.
- Inline panes never show the Collection sprite or the Biomes scene. They need
  about 16 and 6 rows, and an inline pane has about 5 for the tab body. Docked
  panes show both. @danielpg95 accepted that trade.

## Debt and follow-ups

- **Reload caches (P4-02):** after a reload, the pane must re-read caught
  records (`loadCollectionRecords`) and clear `silhouettes`, `cellsByModster`,
  `biomeScenes` and the Biomes scene site.
- **Unused placeholders (P4-02):** the Collection, Biomes and Stats
  `placeholder` entries in `collection-tabs.ts` can go once Settings is filled.
- **Hidden records:** caught records for Modsters a player removed stay in
  `$.store` and aren't shown. P4-02's Settings tab could mention them.
- **Shiny catches (P5-01):** `shinyCount` isn't shown in the detail yet.
- **Stats don't refresh live:** the tab re-reads only when `3` is pressed.
  This is now P5-18.
- **Close isn't testable:** the test engine can't raise `ui.close`, so stopping
  the sprite and scene timers on close was checked by hand only.
- **Open question from P3-01, now closed:** decision 0023 point 7 described
  a `/modsters` reply that ended with "Change where the game shows in
  /config". The reply is gone, and the Settings tab says it now. 0023's
  status line and index row now carry an amendment note (@danielpg95's call).

## Next phase adjustments

Agreed with @danielpg95:

- **P4-02** gained three done-when items: the Settings tab lists every content
  error, a reload refreshes the collection pane's records and caches, and the
  unused tab placeholders go.
- **P4-03** was split. It's now enable, disable and delete (size S, was L).
- **P4-07 (new)**, the in-pane field editor (M), depends on P4-03 and P5-17.
  It edits name, tier, throws and catch rate in whatever tier model P5-17
  settles, since 0030 replaced weights. P4-05 now depends on P4-07 too.
- **P5-18 (new)**, a live Stats tab (S).
