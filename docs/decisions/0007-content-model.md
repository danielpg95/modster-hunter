# 0007 — Weights instead of percentages; built-in and user content merged by id

- **Status:** Accepted
- **Date:** 2026-10-07
- **Decided by:** @danielpg95

## Decision

1. **Encounter odds are weights**, any positive integers. The chance of a
   Modster in a biome is `weight / sum(weights)`. Adding a Modster never requires
   rebalancing others. The UI shows the computed percentage.
2. **Two content sources**, loaded in this order:
   1. Built-in content inside the plugin: `plugin/content/`.
   2. User content: `~/.claude/modster-hunter/content/` (same layout).
3. **Merge by id**: a user biome or Modster with the same `id` as a built-in one
   replaces it entirely (no field-level merge, so the result is predictable).
4. **Disable without deleting**: user `settings.json` in the content folder can
   list `disabledBiomes` and `disabledModsters` ids.
5. **`includeBuiltins`** (`userConfig`, default `true`): when `false`, only user
   content loads. If that leaves zero valid biomes, the mod shows one clear
   message and runs nothing.
6. **Invalid content never crashes the mod.** Each invalid file is skipped with
   a readable error, listed in the pane's Settings tab.

The exact file schemas live in [`docs/CONTENT_FORMAT.md`](../CONTENT_FORMAT.md).
Changing a schema needs a new decision and a `schemaVersion` bump.
