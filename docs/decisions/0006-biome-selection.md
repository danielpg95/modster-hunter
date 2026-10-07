# 0006 — One random biome per session

- **Status:** Accepted
- **Date:** 2026-10-07
- **Decided by:** @danielpg95

## Decision

- At `session.start` the mod picks one enabled biome uniformly at random and
  keeps it for the whole session.
- After `/clear`, `/resume` or `/branch` (`classic.SessionStart` with `source`
  `clear`, `resume` or `fork`), the biome stays the same: those don't start a new
  Claude Code process from the user's point of view.
- A biome may set an optional `weight` later if we want some biomes rarer; until
  a decision adds that, selection is uniform.
- The current biome is shown in the band's idle line and in the pane.
