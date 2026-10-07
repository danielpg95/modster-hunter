# 0009 — One `$.store` key per Modster

- **Status:** Accepted
- **Date:** 2026-10-07
- **Decided by:** @danielpg95

## Context

`$.store` is a key-value store (4 MiB JSON total) shared by every Claude Code
session on the machine. A `get` then `set` is not atomic, so two sessions
writing the same key can lose an update.

## Decision

- Each Modster's record lives under its own key: `caught:<modsterId>`, holding
  `{ count, shinyCount, firstCaughtAt, lastCaughtAt, bestTier, biomes: { [biomeId]: count } }`.
- Encounter stats are per-session counters flushed to `stats:<sessionId>` keys,
  and aggregated when the Stats tab opens. Old session keys are compacted into
  `stats:total` by the pane.
- Before every write, read the key again and build the new value from the fresh
  read (the docs' advice for multi-session writes).
- Store schema carries `v: 1`; a migration function runs on read.
- Sprites and content never go in `$.store`; they're files.
