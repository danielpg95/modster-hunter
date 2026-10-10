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
| P2-09 | @victor-aguilars | in-progress | p2-09-whispering-forest | 2026-10-08 | 2026-10-08 | Design biome 2 (and a 5th Forest Modster) with the user; first slice in review |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P2-11** — Background agents count as work time
- **P2-14** — Reopen the encounter pane
- **P4-04** — User-facing content skill
