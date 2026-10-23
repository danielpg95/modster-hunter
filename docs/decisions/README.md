# Decisions

Every decision that shapes the game or the code gets one file here, numbered in
order. Decisions are how contributors (and Claude sessions) avoid re-arguing
settled questions and avoid making assumptions about open ones.

- **One decision per file**: `NNNN-short-title.md`, copied from
  [`docs/templates/decision.md`](../templates/decision.md).
- **Status** is one of `Proposed`, `Accepted`, `Superseded by NNNN`, `Rejected`.
- **Never rewrite an accepted decision.** Write a new one that supersedes it,
  and change only the old one's status line.
- A `Proposed` decision is not settled. Code may rely on it only where the
  roadmap task says so, and the task that settles it is named in the file.

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-terminal-first-rendering.md) | Terminal first; sprites drawn as half-block `Raster` cells | Superseded by 0012 |
| [0002](0002-where-the-game-is-drawn.md) | Encounters in the band above the prompt, collection in a pane | Accepted (amended by 0015, 0019, 0023, 0038) |
| [0003](0003-catch-mechanic.md) | Pure-luck catching for v1; light skill element as a later experiment | Accepted (amended by 0035) |
| [0004](0004-attempts-and-catch-rate.md) | Attempts and catch rate per Modster, derived from rarity unless overridden | Accepted (point 1 superseded by 0030) |
| [0005](0005-encounter-lifetime.md) | An encounter lingers after the turn ends, until resolved or idle timeout | Accepted (amended by 0018, 0020, 0031) |
| [0006](0006-biome-selection.md) | One random biome per session | Accepted (amended by 0031) |
| [0007](0007-content-model.md) | Weights instead of percentages; built-in and user content merged by id | Accepted (point 1 superseded by 0030) |
| [0008](0008-sprite-pipeline.md) | PNG sprite sheets in, `.sprite.json` at runtime | Superseded by 0016 |
| [0009](0009-collection-storage.md) | One `$.store` key per Modster | Accepted (amended by 0029) |
| [0010](0010-contributor-tracking.md) | Roadmap + workboard + session handoffs as the tracking system | Accepted |
| [0011](0011-license.md) | MIT for code, CC BY 4.0 for art | Accepted |
| [0012](0012-sprite-size-and-band-layout.md) | Half-block `Raster` sprites up to 24×12; text-only band when they don't fit | Accepted (amended by 0020, 0021) |
| [0013](0013-host-calls-in-register.md) | All `$` calls live in `register.ts`; pure modules reach the host through plain ports | Accepted |
| [0014](0014-encounter-timings.md) | Encounter timings, a work-time spawn countdown, and no throws outside "waiting" | Accepted (amended by 0018, 0020, 0035) |
| [0015](0015-encounter-pane.md) | An opt-in encounter pane, with the band stepping aside while it shows | Accepted (point 4 settled by 0019; amended by 0023, 0024, 0038) |
| [0016](0016-user-png-sprites.md) | User Modsters may use a PNG sheet directly; the mod decodes and caches it | Accepted (amended by 0025) |
| [0017](0017-modster-dex-fields.md) | Modsters carry a dex entry: number, type, category, height, weight and entry text | Accepted (amended by 0022) |
| [0018](0018-background-agents-count-as-work.md) | Background subagents count as work time for the spawn countdown | Accepted |
| [0019](0019-reopen-encounter-pane.md) | The encounter pane reopens for people who opened it, until they close it by hand | Accepted (amended by 0023, 0038) |
| [0020](0020-run-from-an-encounter.md) | The player can run from an encounter with `2: Run` | Accepted |
| [0021](0021-sprites-up-to-48x48.md) | Sprites up to 48×48; the compact band shows when they don't fit | Accepted (point 5 superseded by 0033) |
| [0022](0022-up-to-two-types.md) | A Modster has one or two types, the first one primary | Accepted |
| [0023](0023-display-settings.md) | Display settings: one toggle per place, a pane picker, and a one-line band that keeps Throw | Accepted (point 7 amended by P3-01; point 4 by 0038) |
| [0024](0024-encounter-pane-focus.md) | `/modsters hunt` gives the encounter pane the keys, and the pane says how to switch | Accepted (amended by 0038: the command is `/modsters pane`) |
| [0025](0025-user-content-helper.md) | The content skill ships a Node helper that converts, draws, previews and checks | Accepted |
| [0026](0026-biome-idle-scene.md) | Between encounters the band shows the biome as an animated scene with particles | Accepted (amended by 0027) |
| [0027](0027-pane-idle-scene.md) | Between encounters the encounter pane shows the biome's idle scene | Accepted |
| [0028](0028-biomes-tab-scene.md) | The Biomes tab shows the selected biome's idle scene | Accepted |
| [0029](0029-stats-compaction.md) | The Stats tab folds session stats idle for 24 hours into `stats:total` | Accepted |
| [0030](0030-tier-first-encounters.md) | An encounter picks a tier first, then a Modster from that tier | Accepted |
| [0031](0031-content-reload.md) | `/modsters reload` keeps the encounter and moves on from a dropped biome | Accepted |
| [0032](0032-in-pane-enable-disable.md) | The pane turns content on and off; deleting is the content skill's job | Accepted |
| [0033](0033-standard-sprite-size.md) | Every Modster's sprite is at most 32 px tall and 48 px wide | Accepted |
| [0034](0034-color-limit.md) | A Modster's sprite uses at most 24 colors | Accepted |
| [0035](0035-catchers.md) | Throws play a catcher animation, and players can make their own catchers | Accepted (P5-27 added `rimIndex`; P5-30: `u: Use`, tab `4: Catchers`; amended by 0036) |
| [0036](0036-puzzle-cube-catcher.md) | A fifth built-in catcher, the Puzzle Cube | Accepted |
| [0037](0037-portable-core-and-hosts.md) | Claude Code users first, then a portable core shared by other hosts | Proposed |
| [0038](0038-opt-in-hunting.md) | The game runs only while `autoStart` is on; `/modsters hunt` and `stop` flip it | Accepted |
| [0039](0039-modsters-runs-immediately.md) | `/modsters` runs at once, even while Claude works | Proposed |
| [0041](0041-auto-start-on-by-default.md) | Auto start is on by default; one welcome toast says how to stop | Proposed |
