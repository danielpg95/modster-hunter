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
| P5-19 | @danielpg95 | in-progress | p5-19-forest-roster | 2026-10-14 | 2026-10-14 | Redesign Sproutling, Mossbeast and Acornsprite |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P5-01** — Shiny variants
- **P5-02** — Sounds
- **P5-03** — Extended stats and milestones
- **P5-05** — Light skill catch experiment
- **P5-06** — Desktop app support
- **P5-09** — Sprite miniatures (spike)
- **P5-17** — Player-defined tiers (spike)
- **P5-18** — Live Stats tab
