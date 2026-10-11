# Session — 2026-10-10 — @victor-aguilars — P2-09 Starter content (forest roster)

- **Task:** P2-09 — Starter content
- **Branch:** `p2-09-forest-roster`
- **Status at end:** in-progress (PR #71 open: Sporrow, Fernox, Elderbark)
- **Last commit:** see `git log` on the branch

## Goal for this session

Design Whispering Forest's official rare, uncommon and legendary with
`add-modster`, and take the placeholders out of the forest.

## Done

- **Sporrow (#008), rare:** `plugin/content/modsters/sporrow/`.
  - A walking mushroom with a wide orange cap, dark spore speckles and gills,
    and a pale body with the face.
  - Cream thread arms and roots. The cap sways and an arm waves.
  - 16×14, 4 frames, 11 colors, 4 fps.
  - Poison + Grass, Puppet Fungus Modster, 0.1 m, 0.05 kg.
- **Fernox (#009), uncommon:** `plugin/content/modsters/fernox/`.
  - A moss-green fox kit in side view, with an amber eye, a cream ruff and a
    nose with a shine.
  - Long legs with dark socks, and a fern-frond tail drawn along a curve. The
    tail sways and an ear flicks.
  - 24×18, 4 frames, 15 colors, 4 fps.
  - Grass, Fern Fox Modster, 0.4 m, 2.5 kg.
- **Elderbark (#010, was placeholder #904), legendary:** redrawn in
  `plugin/content/modsters/elderbark/`.
  - A rooted ancient tree: a full crown with limbs showing, a heavy brow,
    half-lidded glowing amber eyes, a bark-knot nose and a long moss beard.
    No legs or arms. Wide roots.
  - The crown sways and the eyes slowly brighten and dim.
  - 32×32, 4 frames, 13 colors, 3 fps.
  - Name, description, Grass, category, size and entry kept from the
    placeholder. The credit's "Provisional design" note is removed.
- `whispering-forest/biome.json` is now Hootlet 100, Fernox 20, Sporrow 4,
  Elderbark 1, the same mix as the other biomes.
  - Sporrow replaces Acornsprite, and Fernox replaces Mossbeast.
  - Sproutling is out too, since Hootlet is the official common.
  - Acornsprite, Mossbeast and Sproutling keep their files and credits but
    are in no biome, so they never appear (@victor-aguilars: "don't remove
    entirely").
- Credits in `plugin/content/CREDITS.md`. Previews in `docs/previews/`:
  `sporrow.png`, `fernox.png`, `elderbark.png`.
- Verified: `npm run check:content` passes (13 Modsters) and prints the forest
  table below. Plugin tests pass (419). `validate --strict` passes.

```
Modster    Weight  Appears  Tier       Throws  Per throw  Caught
Hootlet    100     80.0%    common     3       50.0%      87.5%
Fernox     20      16.0%    uncommon   3       35.0%      72.5%
Sporrow    4       3.2%     rare       4       20.0%      59.0%
Elderbark  1       0.8%     legendary  5       8.0%       34.1%
```

## Decisions made

- Sporrow, every field chosen by @victor-aguilars. The concept was restarted
  twice: first a mushroom riding a beetle shell, then a zombie ant ("let's not
  scope it to an ant"). The final one is the fungus itself, with a wide cap
  and the face on the body.
- Fernox: every field chosen by @victor-aguilars. Moss-brown fur became moss
  green, and the pose went from sitting to standing in side view (sitting
  "looks like a squirrel"). The size went from 24×14 to 24×18 for face detail.
- Placeholders leave the biome but stay in the repo.
- Elderbark: a walking elder tree at 32×32, then "more serious, wise" with "no
  legs", so it became rooted. Its text fields are kept from the placeholder.
- Forest weights 100/20/4/1, chosen by @victor-aguilars, so each tier sits
  well inside its band.

## Problems and findings

- **Silhouette matters more than detail at this size.**
  - A dark body under a big shape reads as a lump.
  - A sitting animal with its tail up reads as a squirrel.
  - Standing side view, a long snout and big ears read as a fox.
- **A nose the same dark as the outline disappears.** A 2×2 nose that sticks
  out, with a light shine, shows.
- **A tail drawn as a straight line looks stiff.** Drawing it along a curve
  (a quadratic Bézier with leaflets perpendicular to it) helped.
- **Repo tools need Node 22.18+.** nvm only has 20 here, but `/usr/bin/node`
  is 22.23. Use `PATH=/usr/bin:$PATH npm run …`.
- **Fernox (18 px) and Elderbark (32 px) are taller than 14 px**, so they show
  the compact band in an 80×24 terminal and in full in the encounter pane.
  Elderbark needs 16 rows. This relies on decision 0021, which is still
  Proposed. Sunmane (33 px wide) already relies on it on `main`.

## Next steps

1. Merge the forest roster PR #71 (@victor-aguilars).
2. Continue to 15 Modsters (#011–#015) with `add-modster`. The forest has 4
   official Modsters; Dustwind Expanse and Saltbreeze Bay have 3 each. Ask
   @victor-aguilars which biomes get the next ones.
3. Then tick P2-09's roadmap items. Official so far: #001–#010, and every
   biome has a common, an uncommon and a rare, with Elderbark as the legendary.

## Open questions

- Does @danielpg95 accept 0021? Fernox, Elderbark and Sunmane rely on it. — @danielpg95 (#53)

## Found along the way

- None.
