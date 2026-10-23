# 0037 — Claude Code users first, then a portable core shared by other hosts

- **Status:** Proposed — settled by @danielpg95 (maintainer) on review of this PR
- **Date:** 2026-10-22
- **Proposed by:** @victor-aguilars (brainstorm session 2026-10-22; drafted by Claude)

## Context

@victor-aguilars wants the game to be easy to share. They also asked whether it
could run outside Claude Code, as a standalone app or in the Claude desktop app,
while still running inside the mod.

What we know (checked 2026-10-22):

- Mods are Claude Code plugins. People share them through a marketplace (a git
  repo with `.claude-plugin/marketplace.json`, added with
  `/plugin marketplace add owner/repo`) or the Claude directory
  (claude.ai/directory/manage). The plugin browser in the desktop app's Code tab
  installs them too.
- Mods run in the terminal and in the desktop app's **Code tab**, where
  `e.surface` is `desktop` and sprites need `Svg` (0001, 0012; task P5-06).
  The desktop app's **chat** doesn't run mods.
- To show a UI inside Claude chat (desktop and claude.ai), the path is an
  **MCP App**: an MCP server whose tool points to a `ui://` HTML view that the
  host draws in a sandboxed iframe. It needs a server process and only shows up
  when a tool is called. Golden rule 7 (no processes unless a decision says so)
  rules it out as things stand.
- The idle loop (Modsters appear *while Claude works*) needs turn and subagent
  events. Only the mod gets them. Any other host needs another trigger.
- Our code is already mostly portable. `game/`, `content/`, `store/` and most
  of `render/` are pure and reach the host only through ports (0013).
  Sprites decode to RGBA frames. Only the last step (`pixelsToCells`) is
  terminal-specific. `register.tsx` is the only file that calls `$`.

## Options

1. **Mod only.** Ship to Claude Code (terminal and Desktop Code tab) and stop
   there. Least work, but only people who already use Claude Code can see it.
2. **Claude Code first, then a portable core and a web companion.** Ship the
   mod, then move the pure modules into a core that doesn't depend on the host.
   Then build a static web page on top of that core (Modster-dex, biomes, a
   shared collection) that anyone can open from a link. Other hosts come later,
   each through its own task.
3. **Go wide now.** Build a web game, a CLI and an MCP App alongside the mod.
   Reaches the most people, but splits a small team and breaks rule 7 for the
   MCP App before we know it's worth it.

## Decision

Option 2 (the user chose "Claude Code users first", 2026-10-22):

1. **The mod comes first.** Release v1.0 through our marketplace (P5-07), then
   submit to the Claude directory. Desktop Code tab support (P5-06) is part of
   the same reach, and it ships as the same plugin.
2. **One core, thin hosts.** After v1.0, the pure modules move into a core
   package with no `$`, no DOM and no Node APIs, so any host can run it (P6-01).
   The mod becomes one host. It keeps all its `$` calls in `register.tsx`
   (0013). The move doesn't change behavior: every existing test passes as is.
3. **Sharing needs an export format.** A versioned JSON export of the
   collection and stats, made from `$.store` (P6-02). Other hosts read it. It
   holds no paths, session ids or user content files.
4. **The first standalone host is a static web companion** (P6-03): no server,
   no network calls past loading the page, sprites drawn on a canvas from the
   same RGBA frames. It can show the Modster-dex, the biomes and an imported
   collection. A playable web mode isn't part of this decision.
5. **An MCP App (Claude chat) is only a spike for now** (P6-04). It must end in
   its own decision before any MCP App ships, because it needs a process (rule
   7).
6. **Rule 7 applies to every host.** No telemetry, no model calls, no network
   use beyond what the host needs to load.

## Consequences

- Phase 6 "Beyond the terminal" joins the roadmap with P6-01 to P6-04. P5-06
  and P5-07 stay in phase 5 and come first.
- `docs/ARCHITECTURE.md` will change when P6-01 lands: the layout gains the
  core package, and `plugin/hooks/` keeps `register.tsx` plus the
  terminal-only render step.
- Content stays one set of files (`plugin/content/`). The web companion reads
  the same files, so a new Modster shows up everywhere.
- A playable standalone game, a CLI host (`npx`) and an MCP App each need a
  new decision first.
