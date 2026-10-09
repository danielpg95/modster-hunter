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
| [0002](0002-where-the-game-is-drawn.md) | Encounters in the band above the prompt, collection in a pane | Accepted (amended by 0015) |
| [0003](0003-catch-mechanic.md) | Pure-luck catching for v1; light skill element as a later experiment | Accepted |
| [0004](0004-attempts-and-catch-rate.md) | Attempts and catch rate per Modster, derived from rarity unless overridden | Accepted |
| [0005](0005-encounter-lifetime.md) | An encounter lingers after the turn ends, until resolved or idle timeout | Accepted |
| [0006](0006-biome-selection.md) | One random biome per session | Accepted |
| [0007](0007-content-model.md) | Weights instead of percentages; built-in and user content merged by id | Accepted |
| [0008](0008-sprite-pipeline.md) | PNG sprite sheets in, `.sprite.json` at runtime | Accepted (amended by P1-05) |
| [0009](0009-collection-storage.md) | One `$.store` key per Modster | Accepted |
| [0010](0010-contributor-tracking.md) | Roadmap + workboard + session handoffs as the tracking system | Accepted |
| [0011](0011-license.md) | MIT for code, CC BY 4.0 for art | Accepted |
| [0012](0012-sprite-size-and-band-layout.md) | Half-block `Raster` sprites up to 24×12; text-only band when they don't fit | Accepted |
| [0013](0013-host-calls-in-register.md) | All `$` calls live in `register.ts`; pure modules reach the host through plain ports | Accepted |
| [0014](0014-encounter-timings.md) | Encounter timings, a work-time spawn countdown, and no throws outside "waiting" | Accepted |
| [0015](0015-encounter-pane.md) | An opt-in encounter pane, with the band stepping aside while it shows | Accepted |
