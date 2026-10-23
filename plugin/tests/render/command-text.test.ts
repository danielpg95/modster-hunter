import { describe, expect, test } from 'claude-code/testing'
import { MODSTERS_ARGUMENT_HINT, STOP_REPLY, autoStartDeniedReply, helpText, huntReply, unknownSubcommandText, welcomeText } from '../../hooks/render'

describe('command text (0038)', () => {
  test('the typeahead hint lists every subcommand (point 8)', () => {
    expect(MODSTERS_ARGUMENT_HINT).toBe('[hunt | stop | pane | reload | help]')
  })

  test('hunt names the biome, and says how to stop (point 3)', () => {
    expect(huntReply('Whispering Forest')).toBe('Hunting in Whispering Forest · Modsters show up while Claude works · /modsters stop to stop')
    expect(huntReply(undefined)).toBe('Hunting · Modsters show up while Claude works · /modsters stop to stop')
  })

  test('stop says how to play again (point 4)', () => {
    expect(STOP_REPLY).toBe('Modster Hunter stopped · /modsters hunt to play again')
  })

  test('a refused Auto start change says which way and why', () => {
    expect(autoStartDeniedReply(true, 'set by your organization')).toBe("Modster Hunter: couldn't turn Auto start on · set by your organization")
    expect(autoStartDeniedReply(false, 'locked')).toBe("Modster Hunter: couldn't turn Auto start off · locked")
  })

  test('help lists every subcommand, the keys, and Auto start (point 6)', () => {
    const text = helpText(false)
    for (const part of ['/modsters hunt', '/modsters stop', '/modsters  ', '/modsters pane', '/modsters reload', '1: Throw · 2: Run, from an empty prompt']) {
      expect(text).toContain(part)
    }
    expect(text.split('\n').at(-1)).toBe('Auto start is off (/config)')
    expect(helpText(true).split('\n').at(-1)).toBe('Auto start is on (/config)')
  })

  test('an unknown word is named, then the help follows (point 7)', () => {
    expect(unknownSubcommandText('hutn', true)).toBe(`Modster Hunter doesn't know "hutn"\n${helpText(true)}`)
  })

  test('the welcome says the game is on and how to stop it (0041)', () => {
    expect(welcomeText()).toBe('Modster Hunter is on · Modsters show up while Claude works · /modsters stop to turn it off · /modsters help for more')
  })
})
