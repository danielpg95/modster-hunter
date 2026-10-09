# 0008 — PNG sprite sheets in, `.sprite.json` at runtime

- **Status:** Superseded by 0016
- **Date:** 2026-10-07 (amended 2026-10-08)
- **Decided by:** @danielpg95 (proposed by Claude; amendment from spike P1-05 confirmed 2026-10-08)

## Context

- Artists work in PNG (Aseprite, Piskel, LibreSprite). The owner also mentioned
  GIFs.
- The official mods import nothing but `claude-code` at runtime.
- `$.fs.read(path, { as: 'bytes' })` can read the PNG bytes (as `{ base64 }`).

## Findings from P1-05

Tested in Claude Code 2.1.295, each in a real session
(`claude --plugin-dir <spike> -p …`), not just the validator. Spikes:
`p1-05-sprite-pipeline`, `p1-05-npm-import`, `p1-05-import-relative`,
`p1-05-import-dynamic`.

| Question | Result |
| --- | --- |
| `DecompressionStream` in the mod runtime? | **No.** `Blob`, `Response` and `createImageBitmap` are also undefined, so no web-API route to inflate. `Uint8Array.fromBase64` exists. |
| Vendored inflate as a relative `.ts` import? | **Yes.** `lib/inflate.ts` (117 lines) and `lib/png.ts` (63 lines), pure TS, decode exactly (RGBA hash match) in the runtime: RGBA, RGB, 8-bit palette, palette with `tRNS`, and all five row filters. A 12-frame 24×24 sheet takes 1–7 ms. |
| Large PNGs? | 900×900 noise (3.1 MiB file) decodes in 259 ms; 2048×2048 in 812 ms. A 4.6 MiB file is refused by `$.fs.read` (4 MiB limit). |
| Unsupported PNGs? | A 4-bit palette PNG fails with `png: only 8-bit, non-interlaced`. Optimizers like oxipng write these, and so does PIL for any palette of 16 colors or fewer. Grayscale and interlaced PNGs are also unsupported. |
| npm package by name (`from 'pkg'`)? | **No.** The validator refuses it, and at run time the hooks module doesn't load. |
| npm package by relative path? | **Yes**, for self-contained ESM: both `../vendor/pkg/index.js` and `../node_modules/pkg/index.js` load. A package with its own bare imports would fail the same way. |
| `import()`? | **No.** The module doesn't load (validator and run time). |

## Decision

1. **Source format:** a PNG sprite sheet, frames side by side, same size each,
   with the frame count in the Modster file.
2. **Runtime format:** `<name>.sprite.json`: a palette (≤ 64 RGBA colors) plus
   frames as palette indexes. Small, diffable, no decoding needed at runtime.
   Built-in sprites ship in this form.
3. **Converter:** `tools/sprite.mjs` (Node, dev-time) converts PNG or GIF to
   `.sprite.json`. Built-in sprites are committed in both forms. GIF support
   stays in the Node tool only; the mod never reads GIFs.
4. **User PNGs:** the mod converts them on load with a **vendored inflate**
   (`plugin/lib/` TS files, no dependencies) and caches the result. No
   `DecompressionStream`. We write our own rather than vendor an npm package
   (e.g. fflate's ESM build): it's small, typed, and has no bare imports to
   patch. Supported: 8-bit, non-interlaced PNG, color types 2, 3 and 6. Other
   PNGs get a readable error that points to `tools/sprite.mjs`, which handles
   every PNG (@danielpg95, 2026-10-08). Where the cache
   lives is left to P2-03 (`$.store` is 4 MiB total).
5. **Reuse:** the spike's `lib/inflate.ts` and `lib/png.ts` are the starting
   point for P2-02 and the loader; they need unit tests under `plugin/tests/`
   first.
