# Phase 1 review — Spike: prove the rendering and the loop feel right — 2026-10-08

- **Reviewed by:** @danielpg95
- **Tasks:** P1-01 … P1-06 (all `[x]`)
- **Contributors:** @danielpg95

## What shipped

Throwaway spikes in `spikes/`, each runnable with `claude --plugin-dir ./spikes/<name>`. Nothing in `plugin/` changed.

- **P1-01** (`p1-01-band`, PR #5): a square and a `1: Throw` button appear in the band 3 s into a turn and go away when it ends. The digit hotkey fires only from an empty prompt.
- **P1-02** (`p1-02-half-block`, PR #7): `pixelsToCells(frame) → base64` draws RGBA pixels as `▀`/`▄` `Raster` cells; 7 unit tests.
- **P1-03** (`p1-03-blit-animation`, PR #9): a 4-frame sprite loops with `$.ui.blit` at 6/8/12 fps, with no flicker; timers stop on turn end, session end, hide and reload.
- **P1-04** (`p1-04-image-element`, PR #11): `Image` vs `Raster` in Ghostty and iTerm. Recommendation: drop `Image`.
- **P1-05** (`p1-05-sprite-pipeline`, `p1-05-npm-import`, `p1-05-import-relative`, `p1-05-import-dynamic`, PR #13): a vendored inflate and PNG decoder decode real PNGs exactly in the mod runtime; no `DecompressionStream`; npm packages only by relative path.
- **P1-06** (this review): decision 0012, CONTENT_FORMAT bounds, phase 2 roadmap changes.

Key numbers:

| Terminal | `maxRows` | Largest sprite |
| --- | --- | --- |
| 140×40 | 15 | 30 px tall |
| 120×40 | 15 | 30 px tall |
| 100×30 | 10 | 20 px tall |
| 80×24 | 7 | 14 px tall |
| 60×15 | 2 | 4 px tall |

PNG decode in the mod runtime: a 12-frame 24×24 sheet in 1–7 ms; 900×900 in 259 ms; 2048×2048 in 812 ms. `$.fs.read` refuses files over 4 MiB.

## What changed from the plan

- Sprite size: CONTENT_FORMAT allowed 8–48 px. Now width 8–24, height 8–12 (0012).
- `Image` element dropped: 0001 point 4 removed by 0012, and P5-04 deleted from the roadmap.
- 0008 amended: the mod decodes user PNGs itself with a vendored inflate; GIF stays in `tools/sprite.mjs`.
- Spikes were written as separate plugins under `spikes/`, not in `plugin/` (P1-01 started in `plugin/` and moved).

## Decisions made in this phase

- 0001 — Terminal first; half-block `Raster` cells. Size constraint measured in P1-02; now superseded by 0012.
- 0008 — PNG sprite sheets in, `.sprite.json` at runtime. Accepted with the P1-05 amendment.
- 0012 — Half-block `Raster` sprites up to 24×12; text-only band when they don't fit (new, supersedes 0001).

## Playtest notes

None (no game loop yet). Manual checks by @danielpg95: band timing and hotkey (P1-01), sprite in the terminal (P1-02), animation (P1-03), Ghostty and iTerm (P1-04), decoded PNGs in the band (P1-05).

## Lessons

- tmux (`tmux capture-pane`) lets Claude drive an interactive session and read the band; `claude --plugin-dir <dir> -p "…"` runs `session.start` headless, which is enough for runtime probes that write a result file.
- `claude plugin validate --strict` catches most runtime limits before running: bare imports, `import()`, undeclared `$.state` keys, `$` passed to non-top-level functions.
- A spike run from a checkout that doesn't have the spike folder shows nothing; run from the branch's checkout.
- Long-lived worktrees made manual testing harder; keep task branches in the main checkout.

## Debt and follow-ups

Spike code to reuse (the rest of `spikes/` is marked for deletion):

| Spike file | Reused in |
| --- | --- |
| `spikes/p1-02-half-block/lib/pixels-to-cells.ts` + `tests/pixels-to-cells.test.ts` | P2-07 (`plugin/` render module) |
| `spikes/p1-03-blit-animation/lib/animation.ts` + tests; the module-level timer helpers and skip-if-blit-in-flight guard in its `hooks/register.tsx` | P2-07 |
| `spikes/p1-05-sprite-pipeline/lib/inflate.ts`, `lib/png.ts` | P4-01 (user PNGs); the fixture generator `make-fixtures.py` can seed its tests |

Marked for deletion: `p1-01-band`, `p1-04-image-element`, `p1-05-npm-import`, `p1-05-import-relative`, `p1-05-import-dynamic`, the copies of `pixels-to-cells.ts` in `p1-03`/`p1-04`/`p1-05`, and every probe `result.txt`. P2-07 deletes `spikes/` (keeping `p1-05-sprite-pipeline/lib/` until P4-01 moves it).

Other debt:

- No tests in `plugin/` for any spike behavior yet; blocked on P0-03.
- `inflate.ts` builds a `number[]`; switch to `Uint8Array` buffers when moving it (2048² takes 812 ms).
- 1/2/4-bit palette PNGs are rejected today; added to P4-01.
- `.claude/rules/mod-code.md` still mentions `Image`; harmless, update when next touched.
- `docs/DEVELOPMENT.md` could document tmux, headless `-p` probes and `claude plugin test ./spikes/<dir>` (from the P1-01 and P1-02 logs).

## Next phase adjustments

- P2-01 now depends on P0-03 (tests and typecheck are needed for every phase 2 task). **Phase 2 can't start until P0-03 (@victor-aguilars) is done.**
- P2-02: new "done when" for the 0012 size bounds.
- P2-07: layouts and `maxRows` test values from 0012; names the spike files it starts from and deletes `spikes/`.
- P4-01: new "done when" for decoding user PNGs (including 1/2/4-bit palettes) from the P1-05 spike.
- P5-04 (Optional Image renderer) deleted.
