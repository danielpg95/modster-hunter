import { describe, expect, test } from 'claude-code/testing'
import { stubContentFs } from './fixtures/stub-content-fs'
import { validBiome } from './fixtures/valid-biome'
import { validModster } from './fixtures/valid-modster'
import { validSprite } from './fixtures/valid-sprite'

/** A content folder with two one-Modster biomes. */
function twoBiomes(): Record<string, string> {
  const files: Record<string, string> = {}
  for (const [biome, name] of [['whispering-forest', 'Whispering Forest'], ['tidepool-shallows', 'Tidepool Shallows']] as const) {
    const json: Record<string, unknown> = { ...validBiome(), id: biome, name, modsters: [{ id: 'sproutling', weight: 1 }] }
    delete json.background
    files[`biomes/${biome}/biome.json`] = JSON.stringify(json)
  }
  files['modsters/sproutling/modster.json'] = JSON.stringify(validModster())
  files['modsters/sproutling/sprite.sprite.json'] = JSON.stringify(validSprite())
  return files
}

describe('register', () => {
  test('registers /modsters on session start', async ($, on) => {
    const names: string[] = []
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => {
      names.push(e.name)
      return { value: { command: e.name } }
    })
    stubContentFs(on, {})

    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    expect(names).toEqual(['modsters'])
  })

  test('with no content, /modsters says there are no biomes yet', async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    stubContentFs(on, {})
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    const result = await $.command.run({ command: 'modsters' } as any)
    expect(result).toEqual({ text: 'Modster Hunter is loaded · No biomes yet' })
  })

  test('the biome picked at session start stays after /clear, /resume and /branch', async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    stubContentFs(on, twoBiomes())
    on('classic.SessionStart', () => ({}))
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    const reply = async () => ((await $.command.run({ command: 'modsters' } as any)) as { text: string }).text
    const first = await reply()
    expect(['Whispering Forest', 'Tidepool Shallows'].some((name) => first.endsWith(`You're in ${name}`))).toBe(true)

    for (const source of ['clear', 'resume', 'fork'] as const) {
      await $.classic.SessionStart({ source })
      expect(await reply()).toBe(first)
    }
  })

  test('a repeated session start in the same process keeps the biome', async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    stubContentFs(on, twoBiomes())
    const start = () => $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
    const reply = async () => ((await $.command.run({ command: 'modsters' } as any)) as { text: string }).text

    await start()
    const first = await reply()
    // 20 restarts: with a fresh pick each time, keeping the same one of two biomes would be a 1 in 2^20 fluke
    for (let i = 0; i < 20; i++) {
      await start().catch(() => undefined) // the second register of /modsters throws; the biome is picked before that
      expect(await reply()).toBe(first)
    }
  })
})
