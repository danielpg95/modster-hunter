---
name: handoff
description: End a Modster Hunter work session cleanly — write the session handoff file, update the workboard row and roadmap checkboxes, and commit. Use whenever the user is stopping, pausing, switching tasks or says "wrap up", "handoff", "end session" or "I'm done for today".
---

# Hand off a session

The next person (or the next Claude session) must be able to continue from the
files alone, without this conversation.

## Steps

1. **Collect what happened** this session from the conversation and
   `git log`/`git diff` on the branch: work done, decisions or answers the user
   gave, problems found, what's left.
2. **Write the handoff file** from `docs/templates/handoff.md` to
   `docs/sessions/YYYY-MM-DD-<handle>-<task-id>.md`. If that name exists, add
   `-2`, `-3`. Fill every section; write "None" rather than deleting one.
   - **Next steps** must be concrete enough to start without context:
     file, function, what to do.
   - **Open questions** name who must answer (the user, the maintainer).
   - Answers the user gave during the session go under "Decisions made". If one
     changes or extends an accepted decision, run `new-decision` instead of
     only noting it.
3. **Update the workboard row:** `Updated` = today, `Next step` = the first
   next step, `Status` = `in-progress`, `blocked` (say on what) or `in-review`.
4. **Tick roadmap "done when" items** that are truly done and verified. If the
   whole task is done and its PR is ready: tick the heading `[x]`, remove the
   workboard row, and refresh "Up next" with `node tools/check-tracking.mjs --next`.
5. **Validate:** `node tools/check-tracking.mjs` must pass.
6. **Commit** on the task branch: `P2-06: handoff YYYY-MM-DD`, and push. If work
   is incomplete but the code compiles, push anyway so it isn't lost; say so in
   the handoff.
7. **Tell the user** in 2–3 lines: what's saved, the next step, any open
   question for them.

## Don't

- Don't mark something done that isn't tested or verified.
- Don't edit older session files; add a new one.
