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
| P5-13 | @danielpg95 | in-review | p5-13-idle-scene | 2026-10-12 | 2026-10-12 | Combined P5-13 + P5-14 PR is a draft. Hand check: `claude --plugin-dir ./plugin` at 80×24 and 140×40, watch a turn and a reload; then tick the last two done-when items, both headings, and remove both rows |
| P5-14 | @danielpg95 | in-review | p5-13-idle-scene | 2026-10-12 | 2026-10-12 | Done-when items met; #87 merged into p5-13-idle-scene, so it ships in the combined PR. Tick the heading once P5-13 is done |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P2-10** — Phase 2 playtest
- **P5-09** — Sprite miniatures (spike)
