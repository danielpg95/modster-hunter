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
| P5-21 | @victor-aguilars | in-progress | p5-21-inkspector | 2026-10-14 | 2026-10-27 | Merge the Inkspector (#034) PR; then pick a Tidecrown (#036) design (axolotl king on hold, needs a higher-contrast reference) |
| P5-34 | @victor-aguilars | in-progress | p5-34-readme-install | 2026-10-22 | 2026-10-22 | Hand check on a second computer: fresh install of 0.1.0 from the marketplace, then tick the items (README merged in #149) |
| P5-36 | @victor-aguilars | in-review | p5-36-in-game-settings | 2026-10-22 | 2026-10-22 | Merge #155, #156, then the P5-36 PR; then close the task |
| P5-52 | @danielpg95 | in-progress | p5-52-desktop-interaction | 2026-10-29 | 2026-10-29 | Write the decision: which desktop ideas to build, from the spike findings |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P5-01** — Shiny variants
- **P5-02** — Sounds
- **P5-03** — Extended stats and milestones
- **P5-05** — Light skill catch experiment
- **P5-09** — Sprite miniatures (spike)
- **P5-17** — Player-defined tiers (spike)
- **P5-18** — Live Stats tab
