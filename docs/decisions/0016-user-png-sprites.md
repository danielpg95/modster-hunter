# 0016 — User Modsters may use a PNG sheet directly; the mod decodes and caches it

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decided by:** @danielpg95 (in P4-01; details drafted by Claude)
- **Supersedes:** 0008

## Context

[0008](0008-sprite-pipeline.md) says the mod converts user PNGs on load and
caches the result, but three things were left open:

- The schema had no way to point at a PNG: `sprite.file` had to be a
  `.sprite.json`, and nothing held the frame count needed to split a sheet.
- 0008 accepts only 8-bit PNGs. The phase 1 review added 1-, 2- and 4-bit
  palette PNGs to P4-01, because PIL and optimizers like oxipng write those
  for any palette of 16 colors or fewer.
- 0008 left the cache location to P2-03. It is P4-01's job. [0009](0009-collection-storage.md)
  says sprites never go in `$.store`.

## Options

Pointing at a PNG:

1. **`sprite.file` may be a `.png`, with `sprite.frames`.** Explicit, validated
   like every other field. Adds one field to the format.
2. **A sibling `sprite.<frames>.png`** used when the `.sprite.json` is missing.
   No new field, but the naming rule is hidden.
3. **Guess the frame count** from the sheet's size. Ambiguous for some sizes.

Cache:

1. **A cache folder** next to the user content. Keeps 0009; the user's content
   folder is never written.
2. **`$.store`**, one key per sprite. Needs 0009 changed, and shares the 4 MiB.
3. **Memory only.** Decodes again every session; not a cache across sessions.

## Decision

Points 1–3 and 5 of 0008 stand as written there. Point 4 is replaced by 4–7 here.

1. **Source format:** a PNG sprite sheet, frames side by side, same size each.
2. **Runtime format:** `<name>.sprite.json`, as in 0008. Built-in sprites ship
   only in this form.
3. **Converter:** `tools/sprite.mjs` (Node, dev-time) converts PNG or GIF to
   `.sprite.json`, as in 0008.
4. **User Modsters may point at a PNG.** In user content only, `modster.json`'s
   `sprite.file` may name a `.png` in the Modster's folder. Then `sprite.frames`
   (integer 1–8) is required. With a `.sprite.json`, `sprite.frames` is an
   error: the file holds its own frames. Biome backgrounds stay `.sprite.json`.
   `schemaVersion` stays `1`: the change only adds a field, and no release has
   shipped a validator that would refuse it.
5. **The mod decodes PNGs** with a vendored inflate (`plugin/hooks/vendor/`, no
   dependencies) and turns the sheet into a sprite with `spriteFromSheet`.
   Supported: non-interlaced PNG, color type 2 (RGB) and 6 (RGBA) at 8 bits,
   and color type 3 (palette) at 1, 2, 4 or 8 bits, with `tRNS`. Anything else
   (grayscale, 16-bit, interlaced) gets a readable error that points to
   `tools/sprite.mjs`, which handles every PNG.
6. **Size limits before decoding:** the header's width and height must fit the
   sprite bounds (decision 0012) times the frame count; a bigger sheet is
   refused without inflating it.
7. **Cache:** `~/.claude/modster-hunter/cache/sprites/<modster-id>.sprite.json`,
   holding `{ "v": 1, "source": { "size", "mtimeMs", "frames" }, "sprite" }`.
   The cache is used when the PNG's size, mtime and frame count all match and
   the cached sprite still validates; otherwise the PNG is decoded again and
   the file rewritten. A cache that can't be read or written never stops the
   Modster from loading. Nothing goes in `$.store` (0009 stands).

## Consequences

- `docs/CONTENT_FORMAT.md` gains `sprite.frames` and the PNG rule for user
  content.
- The spike's `inflate.ts` and `png.ts` move to `plugin/hooks/vendor/`, rewritten
  on `Uint8Array` buffers, with unit tests (P4-01).
- The mod writes files only under `~/.claude/modster-hunter/cache/`. Deleting
  that folder is always safe.
- The content editor (P4) can offer PNG import without a Node tool.
