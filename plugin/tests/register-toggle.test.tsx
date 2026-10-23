import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { stubContentFs } from './fixtures/stub-content-fs'
import { twoBiomes } from './fixtures/two-biomes'
import { validSprite } from './fixtures/valid-sprite'
import { validUserModster } from './fixtures/valid-user-modster'

// The game runs only while autoStart is on (decision 0038); these tests play it
const HUNTING = { options: { autoStart: true } }

// P4-03, decision 0032: `o` in the Collection and Biomes tabs turns the selected
// item off or on by writing the user's settings.json, then reloads content.

const PANE_PROPS = { title: 'Modster collection', isFocused: true, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} }
const SETTINGS = 'content/settings.json'

/** Starts a session on built-in `files` and the user folder `user` (paths under ~/.claude/modster-hunter/). */
async function start($: any, on: On, files: Record<string, string>, user: Record<string, string> = {}, stored: Record<string, unknown> = {}) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.blit', () => ({ value: {} }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const { toasts } = stubContentFs(on, files, user)
  mock.store(on, stored)
  mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return { toasts }
}

/** Opens the collection pane on `tab`. */
async function paneOn($: any, tab: string) {
  const pane = await $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Pane', requestId: 'modster-collection', props: PANE_PROPS })
  await pane.press({ key: tab })
  return pane
}

/** Presses `key` and returns the toast it ends with. */
async function pressForToast(pane: any, key: string, toasts: string[]): Promise<string | undefined> {
  const before = toasts.length
  await pane.press({ key })
  return toasts[before]
}

const caught = () => ({ v: 1, count: 1, shinyCount: 0, firstCaughtAt: 1, lastCaughtAt: 1, bestTier: 'common', biomes: {} })

describe('register: toggle', () => {
  test('o turns a built-in Modster off in the user settings.json, never in the plugin folder', HUNTING, async ($, on) => {
    const files = twoBiomes()
    const before = { ...files }
    const user: Record<string, string> = {}
    const { toasts } = await start($, on, files, user, { 'caught:emberkit': caught() })
    const pane = await paneOn($, 'collection')
    // Emberkit (#002): turning it off leaves both biomes with a Modster, so the biome stays
    await pane.press({ key: 'down' })
    expect((await pane.find({ type: 'Button', key: 'toggle' }))?.props.label).toBe('Turn off')

    expect(await pressForToast(pane, 'toggle', toasts)).toBe('Modster Hunter: Emberkit is off')
    expect(JSON.parse(user[SETTINGS] ?? '{}')).toEqual({ schemaVersion: 1, disabledModsters: ['emberkit'] })
    expect(files).toEqual(before)
    // Still listed, dimmed, so it can come back
    expect(await pane.find({ type: 'Text', text: ' off' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: 'Turned off' })).toBeDefined()
    expect((await pane.find({ type: 'Button', key: 'toggle' }))?.props.label).toBe('Turn on')

    expect(await pressForToast(pane, 'toggle', toasts)).toBe('Modster Hunter: Emberkit is on')
    expect(JSON.parse(user[SETTINGS] ?? '{}')).toEqual({ schemaVersion: 1 })
    expect(await pane.find({ type: 'Text', text: ' off' })).toBeUndefined()
    await pane.unmount()
  })

  test('an uncaught Modster is not named in the toast', HUNTING, async ($, on) => {
    const { toasts } = await start($, on, twoBiomes())
    const pane = await paneOn($, 'collection')
    await pane.press({ key: 'down' })
    expect(await pressForToast(pane, 'toggle', toasts)).toBe('Modster Hunter: That Modster is off')
    await pane.unmount()
  })

  test('turning off the session\'s biome moves to another one', HUNTING, async ($, on) => {
    const user: Record<string, string> = {}
    const { toasts } = await start($, on, twoBiomes(), user)
    const pane = await paneOn($, 'biomes')
    // The tab opens on the session's biome; the pick is random, so read which one it is
    const here = (await pane.find({ type: 'Text', text: ' here' })) !== undefined
    expect(here).toBe(true)
    const toast = await pressForToast(pane, 'biome-toggle', toasts)
    const match = /^Modster Hunter: (.+) is off · now in (.+)$/.exec(toast ?? '')
    expect(match).not.toBeNull()
    expect(match?.[1]).not.toBe(match?.[2])
    const off = JSON.parse(user[SETTINGS] ?? '{}').disabledBiomes as string[]
    expect(off.length).toBe(1)
    expect(await pane.find({ type: 'Text', text: ' off' })).toBeDefined()
    await pane.unmount()
  })

  test('the last biome, or a Modster it depends on alone, is never turned off (0032 point 8)', HUNTING, async ($, on) => {
    const user: Record<string, string> = {}
    const { toasts } = await start($, on, oneModsterForest(), user, { 'caught:sproutling': caught() })
    const pane = await paneOn($, 'collection')
    expect(await pressForToast(pane, 'toggle', toasts)).toBe("Modster Hunter: can't turn off Sproutling: no biome would be left to play")
    await pane.press({ key: 'biomes' })
    expect(await pressForToast(pane, 'biome-toggle', toasts)).toBe("Modster Hunter: can't turn off Whispering Forest: no biome would be left to play")
    expect(user[SETTINGS]).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: ' off' })).toBeUndefined()
    await pane.unmount()
  })

  test('a settings.json that is not valid is left alone', HUNTING, async ($, on) => {
    const user: Record<string, string> = { [SETTINGS]: '{ not json' }
    const { toasts } = await start($, on, twoBiomes(), user)
    const pane = await paneOn($, 'collection')
    await pane.press({ key: 'down' })
    expect(await pressForToast(pane, 'toggle', toasts)).toBe(
      'Modster Hunter: fix ~/.claude/modster-hunter/content/settings.json first (see /modsters → 5: Settings)',
    )
    expect(user[SETTINGS]).toBe('{ not json')
    await pane.unmount()
  })

  test('only the user\'s own items show how to delete them', HUNTING, async ($, on) => {
    const user: Record<string, string> = {
      'content/modsters/blobby/modster.json': JSON.stringify({ ...validUserModster(), id: 'blobby', name: 'Blobby' }),
      'content/modsters/blobby/sprite.sprite.json': JSON.stringify(validSprite()),
    }
    await start($, on, oneModsterForest(), user)
    const pane = await paneOn($, 'collection')
    // Sproutling (#001) comes first and is built in
    expect(await pane.find({ type: 'Text', text: /ask Claude/ })).toBeUndefined()
    await pane.press({ key: 'down' })
    expect(await pane.find({ type: 'Text', text: 'Yours · to delete it, ask Claude: "delete my Modster blobby"' })).toBeDefined()
    await pane.unmount()
  })
})
