import type { Register } from 'claude-code'
import { answer } from 'tiny-pkg'

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.fs.write(`${$.plugin.root}/result.txt`, `npm import loaded, answer=${answer}\n`)
    return next(e)
  })
}
