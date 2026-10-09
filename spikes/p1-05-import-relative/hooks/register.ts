import type { Register } from 'claude-code'
import { answer as vendored } from '../vendor/tiny-pkg/index.js'
import { answer as fromNodeModules } from '../node_modules/tiny-pkg/index.js'

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.fs.write(`${$.plugin.root}/result.txt`, `vendored=${vendored} node_modules=${fromNodeModules}\n`)
    return next(e)
  })
}
