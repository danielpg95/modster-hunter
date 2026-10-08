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
| P0-03 | @victor-aguilars | in-progress | p0-03-typescript-tests | 2026-10-07 | 2026-10-07 | Add plugin/tsconfig.json and generate types with /plugin-types |
| P1-03 | @danielpg95 | in-progress | p1-03-animation-blit | 2026-10-08 | 2026-10-08 | Read P1-02 handoff and spike code; loop a 4-frame sprite with $.ui.blit |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P1-04** — Image element check (kitty/Ghostty)
- **P1-05** — Sprite pipeline spike
