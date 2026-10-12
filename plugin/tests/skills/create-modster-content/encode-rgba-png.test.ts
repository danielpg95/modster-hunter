import { describe, expect, test } from 'claude-code/testing'
import { decodePng } from '../../../hooks/vendor/png'
import { encodeRgbaPng } from '../../../skills/create-modster-content/scripts/lib'
import { storedZlib } from '../../fixtures/encode-png'

describe('encodeRgbaPng', () => {
  test('the mod decodes what it writes, pixel for pixel', () => {
    const data = Array.from({ length: 5 * 3 * 4 }, (_, i) => (i * 53 + 7) & 0xff)
    const png = encodeRgbaPng({ width: 5, height: 3, data }, storedZlib)
    const decoded = decodePng(png, { maxWidth: 5, maxHeight: 3 })
    expect([decoded.width, decoded.height]).toEqual([5, 3])
    expect([...decoded.data]).toEqual(data)
  })
})
