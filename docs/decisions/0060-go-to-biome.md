# 0060 — Go to a biome from the Biomes tab; Keep last biome picks where a session starts

- **Status:** Proposed — settled by P5-79 / @danielpg95 (supersedes 0058; amends 0006 and 0040 point 2)
- **Date:** 2026-11-20
- **Proposed by:** @danielpg95 (drafted by Claude)
- **Supersedes:** 0058

## Context

0058 added a `biome` option: `random` or one biome id, changed by cycling a
Settings row through every biome. In the P5-79 hand check (2026-11-20),
@danielpg95 didn't like it: the place to choose a biome is the Biomes tab, where
each biome's scene and odds already show, and the setting should only say where a
session starts: a random biome, or the last one played.

## Options

1. **Go here in the Biomes tab, plus a Keep last biome toggle.** Choosing a
   biome happens where you look at it; the setting is one on/off row.
2. **Keep 0058's Settings row.** One place, but cycling through every biome by
   name to reach one is slow, and you can't see a biome before you pick it.

## Decision

Option 1 (@danielpg95, 2026-11-20):

1. **`g: Go here` in the Biomes tab** moves the game to the selected biome. It
   shows only for a biome that's on and isn't where the game is (or is going).
   On desktop it's a button under the biome's scene, `Go to <name>`, next to the
   turn-off button (0054).
2. **When the move happens**, as 0031 moves to a new biome: with no encounter,
   at once, with the toast `Modster Hunter: now in <biome>`. With an encounter in
   progress, the toast says `Modster Hunter: off to <biome> after this
   encounter`; the encounter finishes where it is and the move happens when it
   ends, with the `now in` toast. Another `g` before then changes where the game
   goes; `g` on the current biome stays put. Turn and agent work time carry over;
   the spawn countdown isn't reset. With the game off (0038), it's where the game
   starts when it's turned on.
3. **The last biome played** is kept in `$.store` as `prefs:lastBiome`
   (`{ v: 1, id }`), written whenever the game's biome is set: at session start,
   after `g`, and after a reload or a turn-off moves it (0031, 0032).
4. **New `userConfig` field `keepBiome`**, boolean, default `false`, shown in the
   Settings tab as `Keep last biome` after `Auto start` (amends 0040 point 2).
   - Off: each session starts in a random biome, as 0006 says.
   - On: each session starts in `prefs:lastBiome`. If that biome is off or
     doesn't load, or none is stored, the session starts in a random one, with
     no toast.
   Changing it never moves the game; it applies from the next session.
5. `/clear`, `/resume` and `/branch` keep the session's biome (0006). A reload
   that drops the biome still picks a random one (0031).
6. 0058's `biome` option and its Settings row are removed. Nothing released used
   them.

## Consequences

- 0058's status line and index row say "Superseded by 0060". 0006's and 0040's
  "amended by 0058" become "amended by 0060".
- `plugin.json` has `keepBiome` in place of `biome`; CONTENT_FORMAT.md's
  `userConfig` table and `$.store` keys list it, and ARCHITECTURE.md's state
  table names `prefs:lastBiome`.
- The Biomes tab's key line gains `g: Go here`; `/modsters help` and the README
  mention it if they list the tab's keys.
- P5-79's done-when list follows this decision.
