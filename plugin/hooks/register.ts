import type { Register } from 'claude-code'

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    // Register last: a taken name throws and would skip the rest of this hook
    await $.command.register({ name: 'modsters', description: 'Open your Modster collection' })
    return next(e)
  })

  on('command.run', { command: 'modsters' }, async () => {
    return { text: 'Modster Hunter is loaded' }
  })
}
