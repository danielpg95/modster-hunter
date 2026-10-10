# 0022 — A Modster has one or two types, the first one primary

- **Status:** Accepted (amends 0017 point 2)
- **Date:** 2026-10-10
- **Decided by:** @victor-aguilars (in P2-09, for Twiggle; details drafted by Claude)

## Context

[0017](0017-modster-dex-fields.md) gives each Modster one type, written as
`dex.type`. While designing Twiggle, a shy tumbleweed for Dustwind Expanse,
@victor-aguilars wanted it to be both grass and ghost: "let's update to
support this".

Nothing has been released, and only eight files set `dex.type` today (four
placeholders on `main`, four official Modsters in P2-09's PR #52), so changing
the field's shape costs little now.

## Options

1. **`dex.types`, a list of 1–2,** replacing `dex.type`. One shape everywhere.
   The existing files move to a one-item list.
2. **`dex.type` as a string or a list.** Existing files stay valid, but every
   reader has to handle two shapes.
3. **A separate optional `dex.type2`.** Simple, but awkward if a third type is
   ever wanted.

Order: either the first type is the primary one, or the types are equal and
shown in alphabetical order.

## Decision

1. `dex.type` is replaced by **`dex.types`: a list of 1 or 2 types** from
   0017's list of 18, with no repeats. For example `"types": ["grass", "ghost"]`
   or `"types": ["ground"]`.
2. **The first type is the primary one.** Its color leads the type badge, and
   filters and sorting use it first. The second type is shown after it.
3. Types stay flavor only. They never change spawn or catch odds (0003 and
   0017 stand).
4. Built-in Modsters must still have a complete dex (0017 point 4), so
   `types` with at least one entry is required for them. `npm run
   check:content` enforces it.
5. `dex.type` is no longer a known field. A file that still uses it gets an
   error that names `types`. `schemaVersion` stays `1`, because nothing has
   been released.

## Consequences

- New roadmap task P2-17 changes the types, the validator, the tests,
  CONTENT_FORMAT.md, the `modster.json` template, the `add-modster` skill and
  `check:content`. It also moves the four placeholder Modsters on `main` to
  `types`.
- P2-09 (PR #52) moves its four Modsters to `types` when it merges P2-17, and
  Twiggle uses `["grass", "ghost"]`.
- The collection's detail view (P3-02) shows both types, primary first.
