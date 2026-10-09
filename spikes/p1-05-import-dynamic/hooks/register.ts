import type { Register } from 'claude-code'

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    const mod = (await import('../lib/answer')) as { answer: number }
    await $.fs.write(`${$.plugin.root}/result.txt`, `dynamic import answer=${mod.answer}\n`)
    return next(e)
  })
}
