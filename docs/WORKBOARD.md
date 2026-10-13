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
| P3-01 | @danielpg95 | in-progress | p3-01-pane-shell | 2026-10-12 | 2026-10-12 | Check by hand: `/modsters` inline at 80×24 and docked in fullscreen at 140×40, tabs on `1`–`4`, Esc closes |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P5-01** — Shiny variants
- **P5-02** — Sounds
- **P5-05** — Light skill catch experiment
- **P5-09** — Sprite miniatures (spike)
