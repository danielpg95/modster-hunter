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
| P2-02 | @victor-aguilars | in-progress | p2-02-sprite-converter | 2026-10-08 | 2026-10-08 | Add spriteFromSheet in plugin/hooks/content/ and tools/sprite.mjs |
| P0-04 | @victor-aguilars | in-progress | p0-04-ci | 2026-10-08 | 2026-10-08 | Add validate and test jobs to .github/workflows/ci.yml |
| P2-03 | @victor-aguilars | in-progress | p2-03-content-loader | 2026-10-08 | 2026-10-08 | Add loadContent(reader) in plugin/hooks/content/ and a $.fs adapter |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P2-06** — Encounter state machine
