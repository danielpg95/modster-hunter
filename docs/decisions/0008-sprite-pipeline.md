# 0008 — PNG sprite sheets in, `.sprite.json` at runtime

- **Status:** Proposed — settled by spike task **P1-05**
- **Date:** 2026-10-07
- **Proposed by:** Claude, for @danielpg95

## Context

- Artists work in PNG (Aseprite, Piskel, LibreSprite). The owner also mentioned
  GIFs.
- The official mods import nothing but `claude-code` at runtime. We don't yet
  know whether a mod can import npm packages, or whether `DecompressionStream`
  (needed to inflate PNG data) exists in the mod runtime.
- `$.fs.read(path, { as: 'bytes' })` can read the PNG bytes.

## Proposal

1. **Source format:** a PNG sprite sheet, frames side by side, same size each,
   with the frame count in the Modster file.
2. **Runtime format:** `<name>.sprite.json`: a palette (≤ 64 RGBA colors) plus
   frames as palette indexes. Small, diffable, no decoding needed at runtime.
3. **Converter:** `tools/sprite.mjs` (Node, dev-time) converts PNG or GIF to
   `.sprite.json`. Built-in sprites are committed in both forms.
4. **User PNGs:** if P1-05 shows the runtime can inflate PNGs, the mod converts
   user PNGs on load and caches the result. If not, the user-facing skill (P4)
   runs the converter for them.

## To settle in P1-05

- Can the mod runtime decode a PNG (DecompressionStream or a vendored inflate)?
- Can a mod import a vendored `.ts` file (yes, by relative path) and an npm
  package (unknown)?
- Accept, amend, or supersede this decision with the results.
