---
name: claim-task
description: Claim a Modster Hunter roadmap task for the current user, by adding a row to docs/WORKBOARD.md and landing it on main before any work starts. Use when the user wants to start, take, pick up or switch to a task (e.g. "I'll take P2-06").
---

# Claim a task

A task belongs to someone only once their workboard row is on `main`
(decision 0010). Claim first, then work.

## Steps

1. **Pick the task.** If the user didn't name one, show
   `node tools/check-tracking.mjs --next` and ask.
2. **Check it can be claimed:**
   - It exists in `docs/ROADMAP.md` and isn't `[x]`.
   - Every task in its `Depends on` is `[x]`. If not, say which ones block it
     and stop (unless the user explicitly accepts working on it early; then
     note that in the row's next step).
   - It has no row in `docs/WORKBOARD.md` on the latest `origin/main`
     (`git fetch` first). If someone owns it, say who and stop.
   - Size `L`? Suggest splitting it into smaller roadmap tasks first.
3. **Read before claiming:** the task's roadmap entry, every decision it
   references, and any session logs mentioning its ID. Ask the user about
   anything unclear now; unclear tasks are cheaper to fix before claiming.
4. **Add the row** to the workboard table:
   `| P2-06 | @handle | in-progress | p2-06-short-slug | YYYY-MM-DD | YYYY-MM-DD | first concrete step |`
   and remove the task from "Up next".
5. **Validate:** `node tools/check-tracking.mjs`.
6. **Land the claim on `main`:**
   - Maintainer: commit `P2-06: claim` on `main` and push.
   - Otherwise: branch `claim/p2-06`, commit `P2-06: claim`, open a PR titled
     `P2-06: claim`, and tell the user to merge it before starting real work.
   - If the push or merge conflicts on the workboard, someone claimed at the
     same time: fetch, re-check step 2, and redo.
7. **Create the work branch** `p2-06-short-slug` from the updated `main`.
8. Tell the user the claim is done and restate the "done when" list.
