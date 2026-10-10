# 0017 — Modsters carry a dex entry: number, type, category, height, weight and entry text

- **Status:** Accepted (point 2 amended by 0022: one or two types)
- **Date:** 2026-10-09
- **Decided by:** @victor-aguilars (in P2-13; details drafted by Claude)

## Context

A Modster has only a `name` and a ≤ 120-character `description`, so there is
little to read in the collection. @victor-aguilars wants each Modster to read
like a "Pokédex entry": a number, a type, a category, height, weight and a
longer entry. The built-in content from P2-09 is provisional, and the official
roster will be written with these fields.

Constraints:

- The content format is closed: an unknown field is an error, and a new field
  needs a decision (CONTENT_FORMAT.md).
- A biome entry already has a `weight` field, meaning encounter odds
  ([0007](0007-content-model.md)). A Modster field also named `weight` would be
  easy to confuse with it.
- Catching is pure luck ([0003](0003-catch-mechanic.md)).
- User Modsters replace built-ins by id ([0007](0007-content-model.md)), and
  anyone can add Modsters, so user-chosen numbers could clash.

## Options

Type:

1. **Flavor only, from a fixed list.** Consistent badges and filters; no
   balance work.
2. **Free text.** More freedom, but no colors and no reliable filtering.
3. **A gameplay effect.** Would amend 0003 and 0004; not wanted for v1.

Dex numbers:

1. **Built-in only.** Fixed numbers in the built-in files. User Modsters show
   no number, so they never clash.
2. **Computed from biome order.** No field, but numbers shift when content
   changes.
3. **Explicit for everyone.** Clashes between built-in and user content.

## Decision

1. `modster.json` gains an optional `dex` object. Grouping the fields keeps
   `dex.weightKg` apart from a biome entry's `weight`:

   ```json
   "dex": {
     "number": 1,
     "type": "grass",
     "category": "Seed Modster",
     "heightM": 0.3,
     "weightKg": 1.2,
     "entry": "It sprouted from a seed that refused to stay buried."
   }
   ```

   | Field | Rules |
   | --- | --- |
   | `number` | Integer 1–999. **Built-in content only**: an error in a user file. Shown as `#001` |
   | `type` | One of the 18 types below |
   | `category` | 1–24 chars, e.g. `"Seed Modster"` |
   | `heightM` | Meters, 0.01–100 |
   | `weightKg` | Kilograms, 0.01–10,000 |
   | `entry` | 1–240 chars; the dex text |

   Every field in `dex` is optional for the validator, and unknown keys inside
   `dex` are errors, like everywhere else.
2. **Types** are flavor only. They never change spawn or catch odds (0003
   stands). The list is fixed, and each type has a badge color:

   | Type | Color | Type | Color | Type | Color |
   | --- | --- | --- | --- | --- | --- |
   | normal | `#9e9e8e` | fighting | `#c62828` | psychic | `#ec407a` |
   | fire | `#f4511e` | poison | `#9c27b0` | bug | `#9ccc65` |
   | water | `#2196f3` | ground | `#c49a5a` | rock | `#a1887f` |
   | grass | `#4caf50` | flying | `#90a4ff` | ghost | `#6a5acd` |
   | electric | `#fdd835` | ice | `#80deea` | dragon | `#5c6bc0` |
   | steel | `#90a4ae` | dark | `#6d5d4b` | fairy | `#f8a5c2` |

   One type per Modster.
3. **Dex numbers** belong to built-in Modsters. Built-in numbers are unique.
   When a user file replaces a built-in by id, the merged Modster keeps the
   built-in's number. Other user Modsters have none and show `#—`.
4. **Built-in content** must have a complete `dex` (every field). The repo's
   content check (`npm run check:content`) enforces this, not the mod's
   validator, so user content stays easy to write.
5. **Habitat is not stored.** It comes from the biomes that list the Modster.
6. `description` stays: a short line for tight spots. `dex.entry` is the
   longer text for the collection detail view.
7. **Uncaught Modsters** show only their number. Every other dex field reads
   `???` until the first catch (P3-02).
8. `schemaVersion` stays `1`: the change is additive and nothing has been
   released, as in [0016](0016-user-png-sprites.md).

## Consequences

- P2-13 adds the field to the types, validator, merge, tests,
  CONTENT_FORMAT.md, the content check, the content templates and the
  `add-modster` skill.
- P2-09's official roster fills in a complete `dex` for every built-in Modster
  and assigns numbers 1–15.
- P3-02's detail view shows the dex. P4-04's user skill writes `dex` without
  `number`.
- The band doesn't change: dex fields don't fit there.
