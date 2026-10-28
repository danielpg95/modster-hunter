import type { Register } from 'claude-code'
import { VARIANTS } from './variants'

// P5-39 spike, not part of Modster Hunter: `/art-spike` opens a pane of test Svgs
// (variants.ts, made by make-variants.py) so we can see in the Desktop Code tab
// which ways of drawing high-detail, animated art the surface allows.

const PANE_ID = 'art-spike'

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'art-spike', description: 'P5-39: test richer Modster art in a desktop Svg', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'art-spike' }, async ($) => {
    const opened = await $.ui.open({ id: PANE_ID, title: 'P5-39 art spike', focus: true, closeOnEscape: true })
    return opened.isPlaced ? {} : { text: 'art-spike: the pane is waiting for room' }
  })

  on('ui.render', { component: 'Pane' }, ($, e, next) => {
    if (e.requestId !== PANE_ID) return next(e)
    if (e.surface !== 'desktop') {
      const { Text } = $.ui.resolve(e)
      return <Text>Open /art-spike in the Desktop app's Code tab.</Text>
    }
    const { Box, Text, Svg } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Text dimColor>Round 2. Each letter's picture is right under its label. Note which are blank, blurry or still.</Text>
        {VARIANTS.map((variant, i) => {
          const letter = String.fromCharCode(65 + i)
          return (
            <Box key={`variant-${i}`} flexDirection="column">
              <Text> </Text>
              <Text bold>{`${letter}. ${variant.label}`}</Text>
              <Text dimColor>{`${variant.chars} characters · ${variant.interactive ? 'isInteractive' : 'image mode'} · picture below`}</Text>
              {variant.source ? (
                <Svg source={variant.source} alt={`Test ${letter}: ${variant.label}`} {...(variant.interactive ? { isInteractive: true } : {})} />
              ) : (
                <Text dimColor>Not drawn: over the 131072-character Svg limit.</Text>
              )}
              <Text dimColor>{`— end of ${letter} —`}</Text>
            </Box>
          )
        })}
      </Box>
    )
  })
}
