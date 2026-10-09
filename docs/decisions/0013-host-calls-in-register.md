# 0013 — All `$` calls live in `register.ts`; pure modules reach the host through plain ports

- **Status:** Accepted
- **Date:** 2026-10-08
- **Decided by:** @victor-aguilars (found in P2-03; proposed by Claude)

## Context

ARCHITECTURE.md planned `adapters/` and `store/` folders whose modules call
`$`. In P2-03 that failed: `claude plugin validate --strict` refuses it and the
hooks module doesn't load at run time:

> `$` is passed to "loadBuiltInContent", imported from "./adapters/…": `$` is
> followed only into a function declared in this same file, never across an
> import.

A mod has one hooks module (`hooks.json` `modules`), so every function that
takes `$` must be declared in `register.ts`.

## Options

1. **`register.ts` + plain ports** — `$` calls sit in small functions in
   `register.ts`; pure modules take plain-function interfaces ("ports") and are
   tested with in-memory fakes. `register.ts` grows, but stays wiring.
2. **Everything `$` in `register.ts`, no ports** — simplest, but adapter logic
   (missing files, re-read before write) is only testable through hook tests.

## Decision

1. Every function that receives `$` is declared in `plugin/hooks/register.ts`.
   No other file imports or receives `$`.
2. Code that needs the host takes a **port**: a small interface of plain async
   functions, defined next to the pure module that uses it (e.g.
   `ContentReader { listFolders, readText }` in `content/load-content.ts`).
   `register.ts` builds the port from `$` calls, e.g. `fsReader($)`.
3. Ports carry no logic beyond translating to `$` (a missing file → `undefined`).
   Logic lives in the pure module and is tested with a fake port in `plugin/tests/fixtures/`.
4. There is no `adapters/` folder. `store/` (P2-08) holds pure collection logic
   over a store port, not `$.store` calls.

## Consequences

- ARCHITECTURE.md and `.claude/rules/mod-code.md` are updated in P2-03.
- P2-08 defines a store port (`get`/`set`/`list` over `$.store`) and tests with
  a fake one; `mock.store` is still used for the hook-level test in `register.test.ts`.
- If `register.ts` becomes hard to read, split by *event* into clearly named
  local functions; it can't be split into files.
