# 0008 — PNG sprite sheets in, `.sprite.json` at runtime

- **Status:** Accepted, amended by P1-05 (the runtime inflates PNGs with a vendored inflate)
- **Date:** 2026-10-07 (amended 2026-10-08)
- **Decided by:** @danielpg95 (proposed by Claude; amendment from spike P1-05, confirm in its PR)

## Context

- Artists work in PNG (Aseprite, Piskel, LibreSprite). The owner also mentioned
  GIFs.
- The official mods import nothing but `claude-code` at runtime.
- `$.fs.read(path, { as: 'bytes' })` can read the PNG bytes (as `{ base64 }`).

## Findings from P1-05

Tested in Claude Code 2.1.295 with `spikes/p1-05-sprite-pipeline/` and
`spikes/p1-05-npm-import/`.

| Question | Result |
| --- | --- |
| `DecompressionStream` in the mod runtime? | **No.** `Blob`, `Response` and `createImageBitmap` are also undefined, so no web-API route to inflate. |
| Vendored inflate as a relative `.ts` import? | **Yes.** `lib/inflate.ts` (~110 lines, pure TS) plus `lib/png.ts` decoded a 4×2 RGBA PNG exactly, in 0 ms. Also round-trips a 50 KB zlib stream in Node. |
| npm package import? | **No.** `claude plugin validate` refuses it: a hooks module imports its own files by relative path and `claude-code`, nothing else. |
| `import()` / `require`? | Not available (a module holding `import()` does not load). |

Not tested: a full-size sheet (e.g. 12 frames of 24×24) or a large user PNG
timed in the mod runtime. The 4 MiB `$.fs.read` limit caps the PNG size.

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
   (`plugin/lib/` TS files, no dependencies) and caches the result. No npm
   package, no `DecompressionStream`. Supported: 8-bit, non-interlaced PNG,
   color types 2, 3 and 6. Other PNGs get a readable error that points to
   `tools/sprite.mjs`.
5. **Reuse:** the spike's `lib/inflate.ts` and `lib/png.ts` are the starting
   point for P2-02 and the loader; they need unit tests under `plugin/tests/`
   first.
