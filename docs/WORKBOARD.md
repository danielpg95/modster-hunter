# Workboard

Who is working on what, right now. The plan lives in [`ROADMAP.md`](ROADMAP.md);
this file lists only tasks someone has claimed.

**Rules** (checked by `tools/check-tracking.mjs`):

- One row per claimed task. One owner per task. Keep the table format exactly.
- **Claim** a task by landing a commit that adds your row on `main`. First merged wins.
- **Status** is `in-progress`, `blocked` or `in-review`.
- **Update** the `Updated` date and `Next step` at the end of every work session.
- **Done:** the PR that finishes the task removes the row and ticks the roadmap.
- Rows untouched for 7 days may be released by a maintainer after pinging the owner.
- Dates are `YYYY-MM-DD`. Owners are GitHub handles.

| Task | Owner | Status | Branch | Started | Updated | Next step |
| --- | --- | --- | --- | --- | --- | --- |
| P5-64 | @victor-aguilars | in-review | p5-64-desktop-collection-cards | 2026-11-01 | 2026-11-01 | Get the P5-64 PR reviewed; @danielpg95 accepts or reworks 0054, then tick the last item and close the task |
| P5-74 | @victor-aguilars | in-progress | p5-74-dustwind-roster | 2026-11-16 | 2026-11-16 | Pitch a concept list for the 9 new Dustwind Expanse Modsters (body twist + one-action idle, varied types) and get it approved |
| P5-76 | @danielpg95 | in-progress | p5-76-shuffleback-hall | 2026-11-11 | 2026-11-16 | Check Shuffleback Hall in the Code tab (band, encounter pane, Biomes tab), then commit and open the one PR for P5-76 to P5-78 |
| P5-77 | @danielpg95 | in-progress | p5-76-shuffleback-hall | 2026-11-13 | 2026-11-16 | Check Shuffleback Hall in the Code tab (band, encounter pane, Biomes tab), then commit and open the one PR for P5-76 to P5-78 |
| P5-78 | @danielpg95 | in-progress | p5-76-shuffleback-hall | 2026-11-13 | 2026-11-16 | Check Shuffleback Hall in the Code tab (band, encounter pane, Biomes tab), then commit and open the one PR for P5-76 to P5-78 |
| P5-79 | @danielpg95 | in-progress | p5-79-biome-selector | 2026-11-19 | 2026-11-19 | Get the decision amending 0006 (biome option) accepted, then build the Settings row |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P5-73** — Grow the Crystal Grotto roster to 8/5/3/1
- **P5-01** — Shiny variants
- **P5-03** — Extended stats and milestones
- **P4-07** — In-pane field editor
