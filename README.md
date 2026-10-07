# Modster Hunter

**Catch Modsters while you wait for Claude.**

Modster Hunter is a [Claude Code mod](https://code.claude.com/docs/en/plugins/mods):
an idle collecting game that lives in your terminal. Each session drops you
into a random biome. While Claude works on your request, wild Modsters appear
just above the prompt. Press `1` to throw, and you have a few tries to catch
each one before it gets away. Type `/modsters` to browse your collection.

You can keep the built-in biomes and Modsters, switch them off, or make your
own, sprites included.

> **Status: in planning.** Nothing is playable yet. See the
> [roadmap](docs/ROADMAP.md) for where things stand.

## Install *(after the first release)*

```bash
claude plugin marketplace add danielpg95/modster-hunter
claude plugin install modster-hunter@modster-hunter
```

Requires Claude Code v2.1.287 or later, in a terminal. Desktop app support is planned.

## Contributing

Contributions are welcome, especially pixel art. Start with
[CONTRIBUTING.md](CONTRIBUTING.md). If you use Claude Code, open the repo and
it will pick up [CLAUDE.md](CLAUDE.md) and the contributor skills; start with
the `start-session` skill.

## License

Code under MIT, built-in art under CC BY 4.0 (pending confirmation, see
[decision 0011](docs/decisions/0011-license.md)).
