# 0034 — A Modster's sprite uses at most 24 colors

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decided by:** @danielpg95

## Context

The content rules (`.claude/rules/content.md`) and the `add-modster` and
`create-modster-content` skills say "≤ 16 colors per Modster". No decision
records why, and nothing enforces it. The technical limit is 63 opaque colors:
a `.sprite.json` palette holds up to 64 entries including transparent
([0008](0008-sprite-pipeline.md), `docs/CONTENT_FORMAT.md`).

16 colors made sense for small sprites. At 24×14 there is no room to show many
shades, and a tight palette keeps sprites crisp and the roster consistent.
[0033](0033-standard-sprite-size.md) now allows up to 32 px tall and 48 wide,
and P5-19 found that textured shading (four tones per material, mixed in small
clusters) lifts quality a lot. With four tones for fur, four for moss, three
for stone, an outline, eyes and a highlight, Mossmaul reached 16 and had to drop
details (a second muzzle tone, a nose highlight) to fit small pink flowers.

## Options

1. **Keep 16.** It keeps sprites crisp and consistent, but bigger, textured
   sprites have to drop shading or accents.
2. **24.** Room for four tones per material plus accents, still a soft cap that
   keeps the roster from drifting into noisy, many-colored sprites, and well
   under the technical 63.
3. **No style cap (only the technical 63).** It's the most freedom, but
   textured sprites can get noisy and the roster can stop looking like one set.

## Decision

1. **A Modster's sprite sheet uses at most 24 opaque colors** across all its
   frames. This replaces "≤ 16 colors" in the content rules and the skills.
2. **It's content guidance, not a validator rule.** The technical limit stays
   63 opaque colors (0008); the validator doesn't change.
3. **Fewer is still fine.** Use the colors the design needs; small or simple
   Modsters don't need 24.
4. **It applies to built-in and user Modsters alike,** like 0033.

## Consequences

- `.claude/rules/content.md`, the `add-modster` skill and the player-facing
  `create-modster-content` skill say "≤ 24 colors".
- Every existing sprite already fits (the most is 16).
- Biome backgrounds and idle scenes aren't covered here; they keep their
  current guidance.
