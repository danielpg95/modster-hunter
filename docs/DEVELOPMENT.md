# Development

How to run, test and debug the mod. Commands marked *(from P0-0x)* work once
that roadmap task is done.

## Requirements

- Claude Code **v2.1.287 or later** (`claude --version`).
- Node.js 20+ for the repo tools in `tools/`.
- A terminal at least 100 columns wide for comfortable testing. Also test at 80×24.

## Everyday loop

```bash
# Run Claude Code with the mod loaded from source. Saving a file reloads it.
claude --plugin-dir ./plugin                  # (from P0-02)

# Check the plugin: manifest, hooks module, events used, API calls made
claude plugin validate ./plugin --strict      # (from P0-02)

# Run the mod's tests
claude plugin test ./plugin                   # (from P0-03)

# Check the roadmap/workboard format and list claimable tasks
node tools/check-tracking.mjs
node tools/check-tracking.mjs --next
```

In a `--plugin-dir` session, a refused drawing prints a transcript line such as
`ui.render (AbovePrompt) refused: …`. That's the first place to look when
nothing shows up. The debug log has the same line.

## Types

The mod is TypeScript, typed against Claude Code's own declarations. Run
`/plugin-types` in a Claude Code session to write the declarations for your
installed version; the copy on GitHub can lag behind. *(P0-03 documents the
exact path we point `tsconfig.json` at.)*

## Things that are easy to get wrong

- **`focus`, `closeOnEscape`, `holdToasts`, `autoFocus` accept only `true`.**
  Passing `false` throws. Omit the field instead.
- **A `ui.render` hook can read `$.state` but can't write it.** Write from
  callbacks (`onPress`) or other events' hooks.
- **`/clear`, `/resume`, `/branch` reset `$.state`** without firing
  `session.start`. Reload stored values on `classic.SessionStart`.
- **`$.store` is shared across sessions** and not atomic. Re-read before write,
  one key per item (decision 0009).
- **Never exceed the band's `maxRows`.** A taller band scrolls and bare-digit
  hotkeys stop working.
- **A pane the mod opens by itself** only appears at ≥ 144 columns. We never
  auto-open (decision 0002).
- **`Raster` cells must be one column wide.** `▀` is; emoji are not.
- **Timers** started with `$.clock.every` stop on reload. Start them in
  `session.start`, never at module top level.

## Reference

- Mods docs: <https://code.claude.com/docs/en/plugins/mods>
- Interface guide: <https://code.claude.com/docs/en/plugins/mods/interface>
- Reference (events, API, elements, limits): <https://code.claude.com/docs/en/plugins/mods/reference>
- Official example mods: <https://github.com/anthropics/claude-code/tree/main/mods>
  — `diff` is the best model for a pane with tests.
