# Session — 2026-10-16 — @victor-aguilars — P5-21 Fill Saltbreeze Bay

- **Task:** P5-21 — Fill Saltbreeze Bay
- **Branch:** `p5-21-saltbreeze-roster`
- **Status at end:** in-progress (partial PR open)
- **Last commit:** see the P5-21 PR

## Goal for this session

Design and draw the 5 new Saltbreeze Modsters, starting with Lanternmaw.

## Done

- **Sir Kelpsie** (rare, #035, water/steel, Sea Steed Modster): a seahorse
  soldier with a dented helmet, a kelp plume, a scallop shield and a trident.
  Converted from @victor-aguilars' reference with `npm run ref-sprite` (28×32,
  17 colours). Eye, shield ridges, tail curl and a plume wave were hand-drawn.
  Idle: plume waves through 4 frames, blink on the last, 2 fps.
- **Peekashell** (common, #032, water/psychic, Pearl Modster): a blue clam
  whose pearl is its unblinking eye. From @victor-aguilars' reference
  (44×32, 18 colours). Pupil and barnacles were hand-drawn. Idle: the top
  shell swings open on its hinge (rest, +1, +2, +1 px), 3 fps.
- Both added to `saltbreeze-bay/biome.json`, credited in
  `plugin/content/CREDITS.md`, previews in `docs/previews/`.
- Verified: `npm run check:content` passes (bay odds table below),
  `claude plugin test ./plugin` passes (670 tests), tracking check passes.
  Not yet tried live with `claude --plugin-dir ./plugin`.

| Modster | Tier | Appears | Caught |
| --- | --- | --- | --- |
| Crabbit | common | 38.2% | 87.5% |
| Peekashell | common | 38.2% | 87.5% |
| Flopple | uncommon | 19.1% | 72.5% |
| Serpentide | rare | 2.3% | 59.0% |
| Sir Kelpsie | rare | 2.3% | 59.0% |

## Decisions made

- Lanternmaw (anglerfish) dropped after two references and many face passes;
  Sir Kelpsie takes the rare slot and dex #035 (@victor-aguilars).
- Toastle (turtle) dropped; Peekashell takes the common slot and #032.
- The second common (#033) is still open. Tried and dropped: a pirate gull
  (Gullet: generic, then "too dirty" with a trash-filled throat pouch), a
  starfish acrobat (Tadastar: too simple, then too much as a ringmaster) and a
  bubble jellyfish (Popjelly: dropped after conversion).
- Opened the PR with the two finished Modsters; the task stays open.

## Problems and findings

- References with a flat, single-colour background (light lavender) and bold
  outlines convert cleanly; scenery or pale glows get cut or leak.
- Thin internal outlines (Popjelly's bubbles) and small faces (Lanternmaw)
  don't survive the shrink; redrawing them by hand rarely satisfied.
- What @victor-aguilars accepts: a creature with one strong twist (a pearl
  eye) or a clear role with signature gear (a soldier knight). Plain animals
  read as "too simple"; full costumes as "too much"; trash as "too dirty".
- The roadmap still names Puffloaf and Tidecrown, but nothing about them was
  designed yet.

## Next steps

1. Pick a concept for the second common (#033) with @victor-aguilars, then
   follow `add-modster` with a reference on a flat lavender background.
2. Design Puffloaf (uncommon, #034) and Tidecrown (legendary, #036).
3. Try the bay live with `claude --plugin-dir ./plugin` and `/modsters hunt`
   on a dark and a light theme.

## Open questions

- Should the new common keep a gull/starfish theme or start fresh? — @victor-aguilars

## Found along the way

- A `tools/preview.mjs` (enlarged frames on dark and light, and a GIF) would
  save rewriting one-off preview scripts every session (also noted in the
  P5-24 handoff).
