---
name: new-decision
description: Record a design or technical decision for Modster Hunter in docs/decisions/, or supersede an existing one. Use when a task needs something no decision covers, when the user settles an open question, when a spike produces findings, or when someone wants to change how the game works.
---

# Record a decision

## Steps

1. **Check what exists.** Read `docs/decisions/README.md` and any decision on
   the same topic. If one already covers it, quote it to the user instead.
2. **Frame the question** in one sentence and list 2–3 real options with
   trade-offs. Recommend one, but ask the user to choose; never mark a decision
   Accepted on your own.
3. **Write the file** from `docs/templates/decision.md` as the next number:
   `docs/decisions/NNNN-short-title.md`.
   - Status `Accepted` only if the user (maintainer for game design) explicitly
     agreed in this session; otherwise `Proposed`, naming the task or person
     that will settle it.
4. **Superseding:** in the old file change only the status line to
   `Superseded by NNNN`. Explain in the new file what changed and why.
5. **Update the index** table in `docs/decisions/README.md`.
6. **Follow-ups:** if the decision changes the content format, roadmap tasks or
   constants, update those docs in the same change, or add roadmap tasks for the
   work. Mention the decision number in affected tasks.
7. Run `node tools/check-tracking.mjs` and commit with the current task ID:
   `P2-06: decision 0012 — short title`.
