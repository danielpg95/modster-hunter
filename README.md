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

No grinding, nothing that steals your keystrokes. Fully offline: no network, no
model calls, no telemetry.

## Biomes

Each session drops you into one biome at random, each with its own Modsters:

- 🌲 **Whispering Forest**: tall pines, soft moss, something rustling.
- 💎 **Crystal Grotto**: whisper here and the crystals whisper back, a little out of tune.

Two more are out there for you to find.

## Install

You need Claude Code **v2.1.292 or later** (`claude --version`), in a terminal.

```bash
claude plugin install modster-hunter --marketplace danielpg95/modster-hunter
```

Or, inside a session: `/plugin marketplace add danielpg95/modster-hunter`, then
`/plugin install modster-hunter@modster-hunter`. Start a new session to play.

**Get updates.** Claude Code doesn't update mods from other marketplaces on its
own. Turn it on once: `/plugin` → **Marketplaces** → **modster-hunter** →
**Enable auto-update**. Or update by hand with
`claude plugin update modster-hunter@modster-hunter`. Your collection stays put.

## How to play

| Key or command | What it does |
| --- | --- |
| `1` / `2` | Throw / run while a Modster is up |
| `/modsters` | Your collection, the biomes, stats, catchers and settings |
| `/modsters hunt` | A bigger encounter pane, for a better view |
| `/modsters reload` | Load your own Modsters after you add or change them |
| `/config` | Where the game shows: band, pane, spinner, status line |

**Make your own.** Ask Claude to "make me a Modster", a biome or a catcher, and
the mod's `create-modster-content` skill designs it with you, sprite included.

## Contributing

New hands are welcome, **especially pixel artists**. Pitch a Modster or biome in
an issue, playtest, report bugs, or pick up a task from the
[roadmap](docs/ROADMAP.md). [CONTRIBUTING.md](CONTRIBUTING.md) explains the
routine. If you use Claude Code, open the repo and start with the
`start-session` skill.

To run from source:

```bash
git clone https://github.com/danielpg95/modster-hunter.git
cd modster-hunter
claude --plugin-dir ./plugin
```

## License

Code is under the [MIT License](LICENSE). Built-in art and sounds are under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), credited per asset in
[`plugin/content/CREDITS.md`](plugin/content/CREDITS.md)
([decision 0011](docs/decisions/0011-license.md)).
