import { describe, expect, test } from 'claude-code/testing'
import { formatIssue, spriteFromGif } from '../../hooks/content'
import { bytesFromBase64 } from '../fixtures/bytes-from-base64'
import { rawGif } from '../fixtures/raw-gif'
import { REAL_GIFS } from '../fixtures/real-gifs'

const file = 'modsters/blobby/sprite.gif'

describe('spriteFromGif', () => {
  test('an animated GIF becomes one sprite frame per GIF frame', () => {
    const result = spriteFromGif(bytesFromBase64(REAL_GIFS.pilAnim.gif), file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect([result.value.width, result.value.height, result.value.frames.length]).toEqual([16, 12, 3])
    expect(result.value.palette).toEqual(['#00000000', '#dc2828ff', '#28c83cff', '#1e3cdcff'])
  })

  test('a GIF bigger than the largest sprite is one error', () => {
    const result = spriteFromGif(bytesFromBase64(REAL_GIFS.pilNoise64.gif), file)
    expect(result.issues.map(formatIssue)).toEqual([`${file} can't be read as a sprite: GIF is 64×64 px; at most 48×48 fits`])
  })

  test('the sprite rules of spriteFromSheet still apply', () => {
    // A 2×1 GIF decodes, but is smaller than any sprite
    const result = spriteFromGif(rawGif([{ data: [0x0c, 0x0a] }]), file)
    expect(result.ok).toBe(false)
    expect(result.issues[0]?.problem).toMatch(/2×1/)
  })

  test('a broken file is an error, never a throw', () => {
    const result = spriteFromGif(Uint8Array.from([1, 2, 3]), file)
    expect(result.ok).toBe(false)
    expect(result.issues[0]?.problem).toBe("can't be read as a sprite: not a GIF file")
  })
})
