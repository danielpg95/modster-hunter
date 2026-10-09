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
| P2-09 | @victor-aguilars | in-progress | p2-09-whispering-forest | 2026-10-08 | 2026-10-08 | Land Whispering Forest (4 provisional Modsters) as the first slice; 2 more biomes later |
| P0-04 | @victor-aguilars | in-review | p0-04-ci | 2026-10-08 | 2026-10-08 | @danielpg95: require the "Plugin validate and tests" check on main, then tick the last item |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P2-06** — Encounter state machine
- **P4-01** — User content folder and merge
