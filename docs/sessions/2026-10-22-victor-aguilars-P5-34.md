# Session — 2026-10-22 — @victor-aguilars — P5-34 README: marketplace install and Modsters first

- **Task:** P5-34 — README: marketplace install and Modsters first
- **Branch:** `p5-34-readme-install`
- **Status at end:** in-progress (waiting on the hand check on a second computer)
- **Last commit:** see the P5-34 PR

## Goal for this session

Make the README lead with Modsters, and say plainly how players install the mod
and keep it updated.

## Done

- Added P5-34 to the roadmap and claimed it (PR #148).
- `README.md`: the Musketail and Lamparito pair sits under the title. The
  four-biome scene GIF and the biome table are gone, and biomes get one line.
  A new Install section has the shell and in-session marketplace commands, the
  version needed (v2.1.292+ for the shell one-liner), "Stay up to date" (turn on
  auto-update, or `claude plugin update`), and "Run from source" for contributors.
- `plugin/.claude-plugin/plugin.json`: `version` goes from `0.0.1` to `0.1.0`.
- Made the README lean (asked by @victor-aguilars): a short pitch, a Biomes list
  naming Whispering Forest and Crystal Grotto ("two more are out there"), a
  compact Install with updates, a How to play table (`1`/`2`, `/modsters`,
  `hunt`, `reload`, `/config`), a shorter Contributing section with
  run-from-source, and License. "What you get" folded into the pitch and the table.
- Trimmed further (asked by @victor-aguilars): removed the "no grinding / fully
  offline" line, the "Get updates" paragraph and the "Make your own" line.
- Added `docs/previews/readme-whispering-forest.gif` and
  `readme-crystal-grotto.gif`: each biome's idle scene at 100 columns, 6×,
  48 ticks at 8 fps, particles included. They come from the mod's own
  `idleScene`, `artFrame` and `particlePixel` through a one-off script (not
  in the repo), like `idle-scenes.gif` in P5-14.
- The two README Modsters show only their name and their real dex `entry` from
  `modster.json` (asked by @victor-aguilars). The rarity, the biome and the old
  made-up blurbs are gone.
- Verified: `claude plugin validate ./plugin --strict` passes, and so does
  `node tools/check-tracking.mjs`.

## Decisions made

- @victor-aguilars: the marketplace install goes in the README now, ahead of P5-07.
- @victor-aguilars: lead with the Modster pair. Show some biomes (two, by name), not all of them.
- @victor-aguilars: keep the README lean, with the main commands in it. No update
  steps and no "make your own" line in the README. Auto-update stays a player's
  own choice in `/plugin`.
- @victor-aguilars: keep `version` in plugin.json and raise it whenever players
  should get changes. Dropping it would make every merge ship, but CI's
  `validate --strict` rejects a missing version. P5-07 writes down the rule.

## Problems and findings

- Claude Code versions a plugin by the manifest `version` first. With it stuck
  at `0.0.1`, nobody who installed would ever get an update, even with
  auto-update on. New installs got whatever `main` held, under the same label.
- Auto-update is off by default for marketplaces other than Anthropic's, so the
  README tells players to turn it on.
- `$.store` is "a JSON file of the plugin's own under the user's Claude Code
  configuration directory" (generated types), not under the versioned cache
  folder, so the collection should survive updates. The hand check confirms it.

## Next steps

1. Hand check on a second computer: before this PR merges, run `claude plugin install modster-hunter --marketplace danielpg95/modster-hunter` (gets `0.0.1`), turn on auto-update, catch a Modster. After the merge, run `claude plugin update modster-hunter@modster-hunter`, check `claude plugin list` shows `0.1.0`, and check `/modsters` still lists the catch. Then tick the hand-check item.
2. Merge claim PR #148, then this PR.

## Open questions

- Who bumps the version, and when, until P5-07 sets the rule? — @danielpg95.

## Found along the way

- `docs/previews/idle-scenes.gif` isn't used by the README anymore. It could
  come back in P5-07 next to the hunt recording.
