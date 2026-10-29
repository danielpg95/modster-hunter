import { describe, expect, test } from 'claude-code/testing'
import { checkCatcherDesktop, checkCatcherSprite, formatIssue, validateCatcher, type Catcher, type DesktopSheet, type Sprite } from '../../hooks/content'
import { encodeFrame } from '../fixtures/encode-frame'
import { issuesAt } from '../fixtures/issues-at'
import { validCatcher } from '../fixtures/valid-catcher'
import { validCustomCatcher } from '../fixtures/valid-custom-catcher'
import { validSprite } from '../fixtures/valid-sprite'

const where = { file: 'catchers/firefly-jar/catcher.json', folder: 'firefly-jar' }

type Json = Record<string, unknown>
const beats = (catcher: Json): Json => catcher.beats as Json
const beat = (catcher: Json, name: string): Json => beats(catcher)[name] as Json
const sprite = (catcher: Json): Json => catcher.sprite as Json

// [behavior, change to a valid catcher, field that must get an error]
const INVALID: [string, (catcher: Json) => void, string][] = [
  ['a missing schemaVersion is an error', (c) => delete c.schemaVersion, 'schemaVersion'],
  ['a missing id is an error', (c) => delete c.id, 'id'],
  ['an id that differs from the folder is an error', (c) => (c.id = 'glass-jar'), 'id'],
  ['a missing name is an error', (c) => delete c.name, 'name'],
  ['a name over 32 characters is an error', (c) => (c.name = 'n'.repeat(33)), 'name'],
  ['a description over 120 characters is an error', (c) => (c.description = 'd'.repeat(121)), 'description'],
  ['a missing style is an error', (c) => delete c.style, 'style'],
  ['an unknown style is an error', (c) => (c.style = 'bubble'), 'style'],
  ['a missing sprite is an error', (c) => delete c.sprite, 'sprite'],
  ['a sprite PNG in built-in content is an error', (c) => (sprite(c).file = 'sprite.png'), 'sprite.file'],
  ['a sprite fps is an error: beat lengths are fixed', (c) => (sprite(c).fps = 6), 'sprite.fps'],
  ['an unknown field is an error', (c) => (c.speed = 2), 'speed'],
  ['beats that are not an object is an error', (c) => (c.beats = []), 'beats'],
  ['an unknown beat is an error', (c) => (beats(c).wobble = {}), 'beats.wobble'],
  ['a beat that is not an object is an error', (c) => (beats(c).take = [1]), 'beats.take'],
  ['an unknown beat field is an error', (c) => (beat(c, 'take').speed = 1), 'beats.take.speed'],
  ['empty frames are an error', (c) => (beat(c, 'take').frames = []), 'beats.take.frames'],
  ['more than 16 frames is an error', (c) => (beat(c, 'take').frames = Array.from({ length: 17 }, () => 0)), 'beats.take.frames'],
  ['a negative frame is an error', (c) => (beat(c, 'take').frames = [-1]), 'beats.take.frames[0]'],
  ['a frame past 15 is an error', (c) => (beat(c, 'take').frames = [16]), 'beats.take.frames[0]'],
  ['a fractional frame is an error', (c) => (beat(c, 'rock').frames = [0, 0.5]), 'beats.rock.frames[1]'],
  ['an unknown place is an error', (c) => (beat(c, 'take').place = 'under'), 'beats.take.place'],
  ['an unknown modster action is an error', (c) => (beat(c, 'take').modster = 'spin'), 'beats.take.modster'],
  ['a path on a beat other than throw is an error', (c) => (beat(c, 'take').path = 'arc'), 'beats.take.path'],
  ['an unknown throw path is an error', (c) => (beats(c).throw = { path: 'zigzag' }), 'beats.throw.path'],
  ['glowIndex 0 is an error: it is transparent', (c) => (c.glowIndex = 0), 'glowIndex'],
  ['glowIndex over 63 is an error', (c) => (c.glowIndex = 64), 'glowIndex'],
  ['a fractional rimIndex is an error', (c) => (c.rimIndex = 1.5), 'rimIndex'],
  ['lidRows of 0 is an error', (c) => (c.lidRows = 0), 'lidRows'],
  ['lidRows over 31 is an error', (c) => (c.lidRows = 32), 'lidRows'],
  ['a desktopSprite without frames is an error (0045)', (c) => (c.desktopSprite = { file: 'desktop.png' }), 'desktopSprite.frames'],
  ['17 desktopSprite frames is an error', (c) => (c.desktopSprite = { file: 'desktop.png', frames: 17 }), 'desktopSprite.frames'],
  ['a desktop glowColor that is not #rrggbb is an error', (c) => (c.desktopSprite = { file: 'desktop.png', frames: 2, glowColor: 'gold' }), 'desktopSprite.glowColor'],
  ['a desktop rimColor with alpha is an error', (c) => (c.desktopSprite = { file: 'desktop.png', frames: 2, rimColor: '#ffd54fff' }), 'desktopSprite.rimColor'],
  ['desktop lidRows of 0 is an error', (c) => (c.desktopSprite = { file: 'desktop.png', frames: 2, lidRows: 0 }), 'desktopSprite.lidRows'],
  ['desktop lidRows over 95 is an error', (c) => (c.desktopSprite = { file: 'desktop.png', frames: 2, lidRows: 96 }), 'desktopSprite.lidRows'],
  ['a desktop glowIndex is an error: PNGs have no palette (0045 point 5)', (c) => (c.desktopSprite = { file: 'desktop.png', frames: 2, glowIndex: 2 }), 'desktopSprite.glowIndex'],
]

describe('validateCatcher', () => {
  test('the CONTENT_FORMAT.md example passes with no issues', () => {
    const result = validateCatcher(validCatcher(), where)
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  test('only the required fields pass: a preset style needs no beats', () => {
    const { schemaVersion, id, name, style, sprite: file } = validCatcher()
    expect(validateCatcher({ schemaVersion, id, name, style, sprite: file }, where).issues).toEqual([])
    expect(validateCatcher({ schemaVersion, id, name, style: 'cover', sprite: file }, where).issues).toEqual([])
  })

  for (const [behavior, change, field] of INVALID) {
    test(behavior, () => {
      const catcher = validCatcher()
      change(catcher)
      const result = validateCatcher(catcher, where)
      expect(result.ok).toBe(false)
      expect(issuesAt(result, field).length).toBe(1)
    })
  }

  test('a custom catcher with all six beats passes', () => {
    expect(validateCatcher(validCustomCatcher(), where).issues).toEqual([])
  })

  test('a custom catcher needs beats, every beat, and a modster in each (0035 point 4)', () => {
    const withoutBeats = validCustomCatcher()
    delete withoutBeats.beats
    expect(issuesAt(validateCatcher(withoutBeats, where), 'beats')[0]?.problem).toBe(
      'is required with "style": "custom": give all six beats, throw, take, settle, rock, caught, broken',
    )

    const missingBeat = validCustomCatcher()
    delete beats(missingBeat).settle
    expect(issuesAt(validateCatcher(missingBeat, where), 'beats.settle')[0]?.problem).toBe('is required')

    const missingAction = validCustomCatcher()
    delete beat(missingAction, 'caught').modster
    expect(issuesAt(validateCatcher(missingAction, where), 'beats.caught.modster')[0]?.problem).toBe('is required')
  })

  test('a desktopSprite with colours and lidRows is valid, built-in or user (decision 0045)', () => {
    const desktopSprite = { file: 'desktop.png', frames: 16, glowColor: '#FFD54F', rimColor: '#000000', lidRows: 95 }
    for (const userContent of [false, true]) {
      expect(validateCatcher({ ...validCatcher(), desktopSprite }, { ...where, userContent }).issues).toEqual([])
    }
  })

  test('checkCatcherDesktop: a sheet that fits the catcher has no issues; frames, colours and lidRows past it are errors', () => {
    const sheet: DesktopSheet = { png: '', width: 24, height: 24, frames: 2, colors: ['#ffd54f', '#202020'], bounds: { x0: 0, y0: 0, x1: 23, y1: 23 }, mainColor: '#ffd54f' }
    const fits = { ...validCatcher(), desktopSprite: { file: 'desktop.png', frames: 2, glowColor: '#FFD54F', lidRows: 8 } } as unknown as Catcher
    expect(checkCatcherDesktop(fits, sheet, where.file)).toEqual([])

    const broken = {
      ...validCatcher(),
      beats: { rock: { frames: [1, 2] } },
      desktopSprite: { file: 'desktop.png', frames: 2, glowColor: '#00ff00', rimColor: '#202020', lidRows: 24 },
    } as unknown as Catcher
    expect(checkCatcherDesktop(broken, sheet, where.file).map(formatIssue)).toEqual([
      `${where.file}: beats.rock.frames[1] is frame 2, but the desktop sheet has 2 (0–1)`,
      `${where.file}: desktopSprite.glowColor is #00ff00, which isn't a colour in the desktop sheet`,
      `${where.file}: desktopSprite.lidRows must be less than the desktop sheet's height, 24 (it is 24)`,
    ])
  })

  test('a catcher may have desktop art only: a desktopSprite and no sprite (0045 point 2)', () => {
    const { sprite: _terminal, ...catcher } = validCatcher()
    expect(validateCatcher({ ...catcher, desktopSprite: { file: 'desktop.png', frames: 2 } }, where).issues).toEqual([])
    expect(issuesAt(validateCatcher(catcher, where), 'sprite').map((issue) => issue.problem)).toEqual([
      'is required, unless a desktopSprite gives the catcher desktop art only (decision 0045)',
    ])
  })

  test('user content may name a PNG sheet with up to 16 frames', () => {
    const catcher = { ...validCatcher(), sprite: { file: 'sprite.png', frames: 16 } }
    expect(validateCatcher(catcher, { ...where, userContent: true }).issues).toEqual([])
    const tooMany = { ...validCatcher(), sprite: { file: 'sprite.png', frames: 17 } }
    expect(issuesAt(validateCatcher(tooMany, { ...where, userContent: true }), 'sprite.frames').length).toBe(1)
  })

  test('messages name the field and say what fits', () => {
    const catcher = validCatcher()
    beat(catcher, 'take').modster = 'spin'
    expect(validateCatcher(catcher, where).issues.map(formatIssue)).toEqual([
      'catchers/firefly-jar/catcher.json: beats.take.modster must be one of visible, hidden, dim, shake, shrink-in, shrink, hop-out, pop-out (it is "spin")',
    ])
  })

  test('input that is not an object is one error, never a throw', () => {
    for (const input of [null, 'jar', 3, []]) {
      const result = validateCatcher(input, where)
      expect(result.ok).toBe(false)
      expect(result.issues.length).toBe(1)
    }
  })

  test('odd values in every field are reported, never thrown', () => {
    const odd = { schemaVersion: {}, id: 1, name: [], style: null, sprite: 'x', beats: { throw: { frames: 'all', path: 3 } }, glowIndex: '2', lidRows: null }
    const result = validateCatcher(odd, where)
    expect(result.ok).toBe(false)
    expect(result.issues.length > 5).toBe(true)
  })

  const loaded = (): Sprite => validSprite() as unknown as Sprite
  const asCatcher = (json: Json): Catcher => json as unknown as Catcher
  const file = where.file

  test('checkCatcherSprite: a catcher that fits its sprite has no issues', () => {
    expect(checkCatcherSprite(asCatcher(validCatcher()), loaded(), file)).toEqual([])
  })

  test('checkCatcherSprite: a frame past the sprite, a palette index past its palette, and lidRows past its height are errors', () => {
    const catcher = validCatcher()
    beat(catcher, 'rock').frames = [0, 2]
    catcher.glowIndex = 3
    catcher.rimIndex = 5
    catcher.lidRows = 8
    expect(checkCatcherSprite(asCatcher(catcher), loaded(), file).map(formatIssue)).toEqual([
      `${file}: beats.rock.frames[1] is frame 2, but the sprite has 2 (0–1)`,
      `${file}: glowIndex is palette index 3, but the sprite's palette has 3 colors (0–2)`,
      `${file}: rimIndex is palette index 5, but the sprite's palette has 3 colors (0–2)`,
      `${file}: lidRows must be less than the sprite's height, 8 (it is 8)`,
    ])
  })

  test('checkCatcherSprite: a sprite over 32×32 is an error (CONTENT_FORMAT "catcher.json")', () => {
    const big = { ...loaded(), width: 34, height: 32, frames: [encodeFrame(new Array(34 * 32).fill(0))] }
    expect(checkCatcherSprite(asCatcher({ ...validCatcher(), beats: {} }), big, file).map(formatIssue)).toEqual([
      `${file}: sprite.file points to a 34×32 sprite; a catcher's is at most 32×32`,
    ])
  })
})
