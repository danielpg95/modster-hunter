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
| P0-04 | @victor-aguilars | in-review | p0-04-ci | 2026-10-08 | 2026-10-08 | @danielpg95: require the "Plugin validate and tests" check on main, then tick the last item |
| P2-03 | @victor-aguilars | in-progress | p2-03-content-loader | 2026-10-08 | 2026-10-08 | Add loadContent(reader) in plugin/hooks/content/ and a $.fs adapter |
| P2-05 | @victor-aguilars | in-progress | p2-05-catch-odds | 2026-10-08 | 2026-10-08 | Add the 0004 tier table to constants.ts and plugin/hooks/game/ resolver with tests |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P2-02** — Sprite converter tool
