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
| [0002](0002-where-the-game-is-drawn.md) | Encounters in the band above the prompt, collection in a pane | Accepted (amended by 0015, 0019, 0023) |
| [0003](0003-catch-mechanic.md) | Pure-luck catching for v1; light skill element as a later experiment | Accepted |
| [0004](0004-attempts-and-catch-rate.md) | Attempts and catch rate per Modster, derived from rarity unless overridden | Accepted |
| [0005](0005-encounter-lifetime.md) | An encounter lingers after the turn ends, until resolved or idle timeout | Accepted (amended by 0018, 0020) |
| [0006](0006-biome-selection.md) | One random biome per session | Accepted |
| [0007](0007-content-model.md) | Weights instead of percentages; built-in and user content merged by id | Accepted |
| [0008](0008-sprite-pipeline.md) | PNG sprite sheets in, `.sprite.json` at runtime | Superseded by 0016 |
| [0009](0009-collection-storage.md) | One `$.store` key per Modster | Accepted |
| [0010](0010-contributor-tracking.md) | Roadmap + workboard + session handoffs as the tracking system | Accepted |
| [0011](0011-license.md) | MIT for code, CC BY 4.0 for art | Accepted |
| [0012](0012-sprite-size-and-band-layout.md) | Half-block `Raster` sprites up to 24×12; text-only band when they don't fit | Accepted (amended by 0020) |
| [0013](0013-host-calls-in-register.md) | All `$` calls live in `register.ts`; pure modules reach the host through plain ports | Accepted |
| [0014](0014-encounter-timings.md) | Encounter timings, a work-time spawn countdown, and no throws outside "waiting" | Accepted (amended by 0018, 0020) |
| [0015](0015-encounter-pane.md) | An opt-in encounter pane, with the band stepping aside while it shows | Accepted (point 4 settled by 0019; amended by 0023) |
| [0016](0016-user-png-sprites.md) | User Modsters may use a PNG sheet directly; the mod decodes and caches it | Accepted |
| [0017](0017-modster-dex-fields.md) | Modsters carry a dex entry: number, type, category, height, weight and entry text | Accepted (amended by 0022) |
| [0018](0018-background-agents-count-as-work.md) | Background subagents count as work time for the spawn countdown | Accepted |
| [0019](0019-reopen-encounter-pane.md) | The encounter pane reopens for people who opened it, until they close it by hand | Accepted (amended by 0023) |
| [0020](0020-run-from-an-encounter.md) | The player can run from an encounter with `2: Run` | Accepted |
| [0021](0021-sprites-up-to-48x48.md) | Sprites up to 48×48; the compact band shows when they don't fit | Proposed |
| [0022](0022-up-to-two-types.md) | A Modster has one or two types, the first one primary | Accepted |
| [0023](0023-display-settings.md) | Display settings: one toggle per place, a pane picker, and a one-line band that keeps Throw | Accepted |
