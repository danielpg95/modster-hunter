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
| P2-09 | @victor-aguilars | in-progress | p2-09-forest-roster | 2026-10-08 | 2026-10-10 | Design Whispering Forest's official uncommon and rare with `add-modster`, then retire the placeholders |
| P2-16 | @victor-aguilars | in-review | p2-16-sprite-bounds | 2026-10-10 | 2026-10-10 | Code merged (#55); hand-check a 48×48 sprite at 8 fps, and @danielpg95 to accept 0021 (#53) |
| P5-08 | @danielpg95 | in-progress | p5-08-display-settings | 2026-10-10 | 2026-10-10 | Decision 0023 accepted (#64); build the pure `displayPlan` with tests on `p5-08-display-settings` |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P4-04** — User-facing content skill
