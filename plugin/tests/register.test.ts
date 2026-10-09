import { describe, expect, test } from 'claude-code/testing'

describe('/modsters', () => {
  test('registers the command on session start', async ($, on) => {
    const names: string[] = []
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => {
      names.push(e.name)
      return { value: undefined }
    })

    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    expect(names).toEqual(['modsters'])
  })

  test('replies that the mod is loaded', async ($) => {
    const result = await $.command.run({ command: 'modsters' } as any)
    expect(result).toEqual({ text: 'Modster Hunter is loaded' })
  })
})
