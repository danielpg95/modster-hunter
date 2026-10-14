# 0032 — The pane turns content on and off; deleting is the content skill's job

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decided by:** @danielpg95 (chosen in the P4-03 session; details drafted by Claude)

## Context

P4-03 asks for enable, disable and delete from the collection pane. Two facts
shape it:

- The mods API can't delete a file: `$.fs` has `read`, `write`, `list`,
  `exists`, `stat` and `ancestors`, nothing more. Removing a folder would need
  `$.process.run`, which golden rule 7 rules out and which isn't portable.
- Disabling (0007 point 4) removes an id from the merged content, so a disabled
  item vanishes from every tab and the pane has nothing to turn back on. A biome
  entry naming a disabled Modster is also reported as an error ("names a
  Modster that doesn't exist").

## Options

For delete:

1. **Hand it to the content skill**: the pane says how to ask Claude, and
   `create-modster-content` removes the files. No process, no new API call.
2. **`rm` through `$.process.run`**, scoped to the user folder. Breaks rule 7,
   needs path guards, not portable.
3. **Split delete into a task** blocked until the API can delete.

For where disabled items show:

1. **Dimmed in their own tab**, marked `off`, with the same key to turn them on.
2. **A "Turned off" list in the Settings tab.**

Option 1 was chosen for both. Blocking the last biome (point 8) was chosen
over letting the game stop until a reload.

## Decision

1. **A key turns the selected item off and on.** In the Collection tab and the
   Biomes tab, `o` turns the selected Modster or biome off (`o: Turn off`) or
   back on (`o: Turn on`). It works for built-in and user items alike.
2. **It writes only the user folder's `settings.json`** (0007 point 4): the id
   is added to or removed from `disabledModsters` or `disabledBiomes`. The file
   is created when missing; a list left empty is removed. Nothing under
   `plugin/content/` is ever written.
3. **Checked before writing.** The new settings must pass `validateSettings`.
   If the current file isn't valid JSON or fails validation, nothing is written
   and a toast says to fix `settings.json` first (the Settings tab lists why).
4. **Then content reloads** as `/modsters reload` does (0031): an encounter in
   progress plays on, and turning off the session's biome moves to a new one.
   A toast confirms, e.g. `Modster Hunter: Volcano is off`. An uncaught
   Modster is named `That Modster`, so the toast never spoils its name.
5. **Disabled items stay listed.** The loader keeps them aside instead of
   dropping them. Their tab shows them dimmed with `off`; they never appear in
   encounters or in another biome's odds. A disabled biome's odds are shown
   as they would be with the Modsters that are on. Stats keep their rows.
6. **A biome entry naming a disabled Modster is dropped quietly**, with no
   issue: turning a Modster off is deliberate, not a broken reference. A biome
   left with no Modsters is still dropped with its usual error.
7. **No delete in the pane.** For a user item, its tab shows
   `Yours · to delete it, ask Claude: "delete my Modster <id>"` (or `biome`).
   The `create-modster-content` skill handles that request: it confirms with
   the player, removes only that item's folder under
   `~/.claude/modster-hunter/content/`, removes the id from `settings.json`,
   warns about user biomes that list a deleted Modster, and asks the player to
   run `/modsters reload`. Caught records stay in the store (0009).
8. **The pane never leaves the game without a biome.** `o` refuses to turn off
   the last playable biome, or a Modster that every remaining biome depends on
   alone, with a toast: `Modster Hunter: can't turn off <name>: no biome would
   be left to play`. Nothing is written. Editing `settings.json` by hand can
   still do it; then 0031 point 4 applies.

## Consequences

- P4-03's "delete" done-when item becomes the skill hand-off above.
- `mergeContent` returns the disabled items and which ids came from the user
  folder; `register.tsx` writes `settings.json` with `$.fs.write`, a call the
  mod already makes for the sprite cache (0016).
- If the mods API gains a file delete, a later decision can move delete into
  the pane.
