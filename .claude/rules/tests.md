---
paths:
  - "plugin/tests/**"
---

# Rules for tests

- Tests run with `claude plugin test ./plugin` and import from
  `claude-code/testing` (`describe`, `test`, `expect`, `mock`, `tier`).
- **Mirror the source path**: `plugin/hooks/game/encounter-machine.ts` →
  `plugin/tests/game/encounter-machine.test.ts`. One `describe` per file, titled
  with the module name.
- **Pure modules get plain unit tests**, no session needed.
- **Adapter and render tests** use `mock.clock(on)`, `mock.store(on, …)` and
  `mock.env(on, …)`. Advance time with the clock, never real waits.
- **Randomness is always seeded or scripted**: pass a fake random source that
  returns a fixed list of numbers. A test that can fail by chance is a bug.
- Test the user-visible result (what's drawn, what's stored), not private
  internals.
- Each test name says the behavior: `"an idle encounter wanders off after the timeout"`.
- Shared fixtures go in `plugin/tests/fixtures/`, one export per file.
- Each test finishes within the 5 s default; set `timeoutMs` only with a comment why.
- Fix the code, not the test, unless the test encoded a wrong expectation. If a
  test changes because a decision changed, reference the decision in the commit.
