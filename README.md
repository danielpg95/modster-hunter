# Modster Hunter

**Catch Modsters while you wait for Claude.**

<table align="center">
  <tr>
    <td align="center" width="50%">
      <img src="docs/previews/readme-musketail.gif" alt="Musketail, a mouse in a feathered hat and leaf cloak, raising a pine-needle sword" height="160"><br>
      <b>Musketail</b> · rare · Whispering Forest<br>
      <sub>A brave mouse with a leaf cloak, a feathered hat and a pine-needle sword. All for one acorn.</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/previews/readme-lamparito.gif" alt="Lamparito, a grinning purple smoke spirit rising from a brass lamp" height="160"><br>
      <b>Lamparito</b> · rare · Dustwind Expanse<br>
      <sub>Rub the lamp and it grants one wish: to be left alone.</sub>
    </td>
  </tr>
</table>

Modster Hunter is a [Claude Code mod](https://code.claude.com/docs/en/plugins/mods):
a tiny collecting game that lives in your terminal, right above the prompt.

You ask Claude for something. While it works, a wild Modster wanders into view.
Press `1` to throw. You get a few tries before it gets bored and leaves. When
Claude is done, the game steps aside and you get back to work.

That's it. No grinding, no timers to babysit, nothing that steals your
keystrokes. Just something to catch while you wait for the tests to run.

Dozens of hand-drawn Modsters hide across four biomes, from a pine forest to a
crystal grotto. Each session drops you into one at random. The rest are out
there for you to find.

## Install

**You need** Claude Code **v2.1.292 or later** (`claude --version`), running in
a terminal. Desktop app support is planned.

In your shell:

```bash
claude plugin install modster-hunter --marketplace danielpg95/modster-hunter
```

Or inside a Claude Code session:

```text
/plugin marketplace add danielpg95/modster-hunter
/plugin install modster-hunter@modster-hunter
```

Start a new session, ask Claude for anything and watch the band above the
prompt. Type `/modsters` to see what you've caught.

### Stay up to date

We publish new versions with new Modsters and fixes. Claude Code doesn't update
mods from other marketplaces on its own, so turn it on once:

1. In a session, run `/plugin` and open the **Marketplaces** tab.
2. Pick **modster-hunter** and choose **Enable auto-update**.

Updates then download in the background, and the next session plays the new
version. To update by hand instead:

```bash
claude plugin update modster-hunter@modster-hunter
```

Your collection and your own Modsters stay put across updates.

### Run from source

For contributors, or to try unreleased changes:

```bash
git clone https://github.com/danielpg95/modster-hunter.git
cd modster-hunter
claude --plugin-dir ./plugin
```

## What you get

- **A band above the prompt** where Modsters show up while Claude works.
- **`/modsters`** opens your collection: every Modster you've caught, the biomes,
  your stats and settings.
- **`/modsters hunt`** opens a bigger encounter pane, if you'd like a better view.
- **Your own Modsters.** Ask Claude to "make me a Modster" and the mod's
  `create-modster-content` skill designs one with you, sprite included. You can
  also switch off the built-in biomes and play only with yours.
- **Quiet by design.** Fully offline: no network, no model calls, no telemetry.
  It never opens a pane on its own and never takes your keystrokes.

## Contributing

Modster Hunter is built by a small group of people, mostly pairing with
Claude Code. New hands are very welcome, **especially pixel artists**.

Ways to help:

- **Draw or pitch a Modster or biome.** Open a "New Modster or biome idea"
  issue, or add one yourself with the `add-modster` and `add-biome` skills.
- **Playtest** and tell us what felt good or annoying in an issue.
- **Report a bug** with the bug template.
- **Pick up a task** from the [roadmap](docs/ROADMAP.md).
  `node tools/check-tracking.mjs --next` lists the ones you can claim right now.

We keep a simple routine so everyone stays on the same track: claim a task on
the [workboard](docs/WORKBOARD.md), work on a branch, leave a handoff note, open
a PR. [CONTRIBUTING.md](CONTRIBUTING.md) walks through it.

If you use Claude Code, just open the repo. It reads [CLAUDE.md](CLAUDE.md),
and the contributor skills in `.claude/skills/` guide you through each step.
Start with `start-session`. No Claude Code? The skills are plain Markdown and
work as step-by-step guides.

Useful docs: [architecture](docs/ARCHITECTURE.md),
[development](docs/DEVELOPMENT.md), [content format](docs/CONTENT_FORMAT.md)
and the [decisions](docs/decisions/) behind how the game works.

## License

Code is under the [MIT License](LICENSE). Built-in art and sounds are under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), credited per asset in
[`plugin/content/CREDITS.md`](plugin/content/CREDITS.md)
([decision 0011](docs/decisions/0011-license.md)).
