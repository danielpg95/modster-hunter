---
name: phase-review
description: Close a Modster Hunter roadmap phase — verify every task is done, write the phase review, and prepare the next phase. Use when the last task of a phase is finishing or the maintainer asks to wrap up a phase.
---

# Review a phase

## Steps

1. **Verify** every task in the phase is `[x]` in `docs/ROADMAP.md`, with all
   "done when" items ticked. List anything missing and stop if there is.
2. **Gather** the phase's session logs in `docs/sessions/`, its decisions, and
   the merged PRs (`gh pr list --state merged --search "P<N>-"` if `gh` works).
3. **Write** `docs/sessions/YYYY-MM-DD-phase-<N>-review.md` from
   `docs/templates/phase-review.md`: what shipped, what changed from the plan,
   decisions made, lessons, debt, and playtest notes if any.
4. **Prepare the next phase** with the maintainer: re-read its tasks, adjust
   them to what was learned (new tasks get new IDs; changed scope is written in
   the task), and make sure every "done when" item is verifiable.
5. Refresh "Up next" in the workboard (`node tools/check-tracking.mjs --next`),
   run the check, and commit as `P<N>: phase review`.
