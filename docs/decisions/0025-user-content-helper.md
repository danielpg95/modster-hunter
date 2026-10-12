# 0025 — The content skill ships a Node helper that converts, draws, previews and checks

- **Status:** Accepted (amends 0016 points 3 and 5)
- **Date:** 2026-10-11
- **Decided by:** @danielpg95 (choices made in the P4-04 planning session; details drafted by Claude)

## Context

P4-04's skill lets users ask Claude for a biome or a Modster, pixel art
included, and writes the files into `~/.claude/modster-hunter/content/`.
Three things it needs have no shipped tool:

- **GIFs and some PNGs.** [0016](0016-user-png-sprites.md) lets user Modsters
  point at a PNG sheet, which the mod decodes. It decodes only non-interlaced
  8-bit RGB/RGBA and 1/2/4/8-bit palette PNGs. Everything else, and every GIF,
  goes through `tools/sprite.mjs`, which 0016 point 3 keeps dev-time: it lives
  in the repo, not the plugin, and needs `pngjs` and `omggif`.
- **Drawn art.** When Claude draws a Modster, it has to produce PNG bytes,
  and a plugin can't count on Python, ImageMagick or a pixel editor.
- **Checking.** Until P4-02, content errors reach only the debug log
  (`register.tsx`), so a broken user file just doesn't show up.

`.sprite.json` stays the runtime format and the mod stays offline and quiet
(golden rule 7). Whatever runs, runs because Claude ran it at the user's
request, never from the mod.

## Options

1. **A Node helper shipped with the skill.** One dependency-free script that
   reuses the mod's own content code, so the helper and the mod can't
   disagree. Needs Node on the user's machine; a fallback covers users
   without it.
2. **Runtime path only.** The skill handles only the PNGs 0016 decodes and asks
   the user to re-export anything else. No code; GIFs and drawn art handled
   poorly, and nothing checks the files.
3. **The mod decodes GIFs too.** Works without Node, but adds GIF decoding to
   the mod at every load, and still leaves drawing and checking open.

Within option 1, the PNGs the vendored decoder refuses (grayscale, 16-bit,
interlaced):

- **a. Extend `plugin/hooks/vendor/png.ts`** to read every PNG. The helper and
  the mod both gain it, and 0016 point 5's list of supported PNGs goes away.
- **b. Leave them out.** The helper refuses them like the mod does, and the
  skill asks the user to re-export as RGBA.

## Decision

Option 1, with option a for other PNGs. Point 3 of 0016 becomes:
`tools/sprite.mjs` stays the dev-time converter for built-in content, and
users get the helper below. Point 5's list of supported PNGs is replaced by
point 7 here. Points 4, 6 and 7 of 0016 stand.

1. **Where:** `plugin/skills/create-modster-content/scripts/modster-content.mjs`.
   SKILL.md runs it with the skill's base directory, which Claude Code gives
   when the skill loads.
2. **Runtime:** Node 22.18 or newer, the same as the repo's `engines`, because
   the helper imports the mod's TypeScript modules through type stripping. No
   npm dependencies. On older Node the helper prints one line naming the
   version it needs and exits.
3. **Shared code:** the helper imports from `plugin/hooks/content/` and
   `plugin/hooks/vendor/`; it doesn't copy them. A GIF decoder is added to
   `plugin/hooks/vendor/` (our own, or vendored with its license header), pure
   and unit tested. The mod doesn't load it.
4. **Commands:**
   - `convert <file.png|file.gif> [--frames N] [--out file]` writes a
     `.sprite.json` through `spriteFromSheet`. `--frames` is required for a
     PNG, as in 0016, and comes from the GIF itself for a GIF.
   - `draw <grid.json> --out sprite.png` turns a palette and rows of
     characters, one string per pixel row per frame, into a PNG sheet the mod
     decodes. The grid format belongs to the helper, not the content format;
     nothing loads it at runtime.
   - `preview <sprite.png|.sprite.json> [--frames N] --out preview.png` draws
     every frame enlarged, side by side, on a dark and a light background, for
     Claude and the user to look at.
   - `check [folder]` loads the folder (default: the user content folder) with
     the mod's loader, validator and merge, and prints every issue with
     `formatIssue`, then a summary. It exits non-zero when there are errors.
5. **Writes:** only the file named by `--out` or, for `convert`, the input's
   `.sprite.json` next to it. Never the cache (0016 point 7), never `$.store`.
   `check` writes nothing. No network.
6. **Without Node:** the skill falls back to the 0016 runtime path for PNGs the
   mod decodes, asks for a PNG sheet instead of a GIF, and checks files against
   a format reference shipped with the skill.
7. **Every PNG decodes.** `plugin/hooks/vendor/png.ts` also reads grayscale
   (color types 0 and 4), 16-bit channels (reduced to 8 bits) and Adam7
   interlaced PNGs. The mod and the helper both use it, so a user's PNG sheet
   works with or without Node. 0016 point 6's size check still runs before
   inflating.

## Consequences

- P4-06 builds the helper; P4-04's skill depends on it.
- P4-02's error list should use the same loader output and `formatIssue`, so
  `check` and the Settings tab report the same issues.
- The plugin gains a folder of non-hook code. `claude plugin validate --strict`
  must still pass with it.
- `tools/sprite.mjs` and the helper overlap. Moving the dev tool onto the
  helper's GIF decoder (and dropping `omggif`) is possible later; not part of
  P4-06.
- `docs/CONTENT_FORMAT.md` "User PNG sheets" drops its list of supported PNGs
  in the PR that extends the decoder (P4-06).
