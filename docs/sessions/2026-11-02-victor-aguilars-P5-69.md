# Session — 2026-11-02 — @victor-aguilars — P5-69 Redesign the Dustwind Expanse roster with desktop art

- **Task:** P5-69 — Redesign the Dustwind Expanse roster with desktop art
- **Branch:** `p5-69-desert-redesign`
- **Status at end:** in-review
- **Last commit:** see the PR (handoff commit)

## Goal for this session

Give all eight Dustwind Expanse Modsters a new, unique design and a desktop sheet, like the grotto in P5-63. P5-69 was added to the roadmap and claimed in #230.

## Done

- A new `desktop.png` and `desktopSprite` for each Modster, made from @victor-aguilars' references with `ref-sprite --desktop`, then animated in scratchpad scripts. Each was approved one at a time:

  | Modster | Design | Size | fps | Idle |
  | --- | --- | --- | --- | --- |
  | Dunebun | dune scout, ears wrapped as a scarf, brass goggles | 128×123 | 5 | wind lifts the loose ear and scarf, blink |
  | Cactoad | barrel-cactus toad with a flower lure on a spine | 128×98 | 5 | lure sways toward its mouth, blink |
  | Twirlwind | dust devil with furry paws and spiral eyes | 115×126 | 6 | funnel below the face sways, spiral eyes turn |
  | Twiggle | shy ghost wearing a tumbleweed hood, two flowers | 117×128 | 5 | ghost tail sways, blink |
  | Scorchion | lava scorpion with flaming claws and tail | 128×116 | 5 | flames and lava cracks pulse, blink |
  | Sunmane | lion with a bronze sun-disc mane and sundial horn | 125×128 | 5 | flame tail swishes, blink |
  | Lamparito | smoke genie wearing the lamp lid as a fez | 76×128 | 5 | floats (smoke stretches to the spout), tassel swings, blink |
  | Kingbolt | vulture king with a thundercloud cape and lightning crown | 110×128 | 5 | bolts go dark one by one down the cape, blink |

- The terminal sprites (`sprite.png`, `sprite.sprite.json`, `sprite` entry) are removed for all eight: the terminal shows them as text (0045).
- `modster.json` text updated to match each design; ids, dex numbers, rarities, names and types are unchanged. Scorchion kept its text.
- `plugin/content/CREDITS.md`: each removed sprite row replaced by a desktop row.
- Previews in `docs/previews/<id>-desktop-p5-69.gif`, at 2× on dark and light.
- `tools/check-content.mjs` crashed on a Modster with desktop art only (`sprite && a || b`); fixed. Dunebun was the first built-in without a terminal sprite.
- Catcher previews threw at Dunebun as the smallest terminal Modster. Now: `tools/sprite.mjs` and `modster-content.mjs check-desktop` throw at Inkspector (smallest with terminal art only); `preview-catcher` throws at Sporrow (smallest terminal sprite). Tests and the `add-catcher` / `create-modster-content` skill text follow.
- Version 0.1.31.
- Verified: `node tools/check-content.mjs`, `node tools/sprite.mjs … --desktop modster` for every sheet, `claude plugin test ./plugin` (1013 pass), `claude plugin validate ./plugin --strict`, `node --test tools/*.test.mjs` (45 pass).

## Decisions made

- Keep each Modster's id, dex number and rarity; name, types and text may change (@victor-aguilars).
- Desktop art only; the old terminal sprites go (@victor-aguilars).
- References come from @victor-aguilars' generator, from prompts written in the session.
- Scorchion: the reference came back as a fire scorpion, not the blacksmith concept; @victor-aguilars chose to keep and animate it.
- Twirlwind: the first reference's pebble arms were rejected; a second reference with furry paws replaced it. A scrolling "spin" idle was rejected (rows break the swirl lines); the funnel sway was picked over a paw wave.
- The weather vane asked for in Twirlwind's prompts never came out; it's left out of the text.

## Problems and findings

- Single-pose references: blinks are drawn by filling the eye with the face colour and a closed line; tail and lure moves bend the part from its base.
- Moving a part that overlaps the body (Twirlwind's paw) drags body outline with it. Move only the part's own colours and fill the gap it leaves from the body beside it.
- Background trapped inside shapes (Lamparito's tassel and lamp handle) survives `--clear`; clear it by exact colour afterwards.
- Hiding a glowing part (Kingbolt's bolts) needs its halo and edge pixels too, refilled from the surrounding colour, or orange scars stay.
- A hover that moves the sprite needs headroom: reduce to 126 px tall, not 128.

## Next steps

1. Check a few of the eight in the Code tab with 0.1.31: the band, the encounter pane and the Collection tab (a wide one like Cactoad, a tall one like Lamparito). Then tick the last "done when" item in `docs/ROADMAP.md`, mark P5-69 `[x]`, remove the workboard row, and merge the PR.

## Open questions

None.

## Found along the way

- The scratchpad animation helpers (bend, blink fill, eye spans, disk turns, cut and re-outline, preview GIFs) would save time as a shared tool in `tools/`, as noted in P5-63 too.
- If Inkspector gets desktop art (P5-21), the desktop catcher previews need another terminal-only target, or a fallback when none is left.
