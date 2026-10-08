import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

const ENCOUNTER_DELAY_MS = 3000

const isEncounterShown = atom({ plugin: 'modster-hunter', key: 'isEncounterShown' } as const, false)

export const register: Register = (on) => {
  let timer: Timer | undefined

  const stop = () => {
    timer?.cancel()
    timer = undefined
  }

  on('session.start', async ($, e, next) => {
    // Register last: a taken name throws and would skip the rest of this hook
    await $.command.register({ name: 'modsters', description: 'Open your Modster collection' })
    return next(e)
  })

  on('turn.start', ($, e, next) => {
    stop()
    timer = $.clock.after(ENCOUNTER_DELAY_MS, () => {
      void update($, isEncounterShown, () => true)
    })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    stop()
    await update($, isEncounterShown, () => false)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const isShown = await read($, isEncounterShown)
    if (e.props.hasSurvey || !e.props.isWorking || !isShown) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)

    return (
      <Box>
        <Text backgroundColor="green">{'    '}</Text>
        <Text> </Text>
        <Button
          key="throw"
          label="Throw"
          hotkey="1"
          plain
          onPress={() => $.ui.toast('Thrown! (maxRows ' + e.props.maxRows + ')')}
        />
        <Text dimColor> rows {e.props.maxRows}</Text>
      </Box>
    )
  })

  on('command.run', { command: 'modsters' }, async () => {
    return { text: 'Modster Hunter is loaded' }
  })
}
