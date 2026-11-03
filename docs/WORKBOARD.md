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
| P5-70 | @victor-aguilars | in-review | p5-70-bay-redesign | 2026-11-02 | 2026-11-03 | Check a few of the eight in the Code tab with 0.1.34 (band, encounter pane, Collection tab), then close P5-70 |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P5-01** — Shiny variants
- **P5-03** — Extended stats and milestones
- **P5-17** — Player-defined tiers (spike)
- **P5-18** — Live Stats tab
