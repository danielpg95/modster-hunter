import { describe, expect, test } from 'claude-code/testing'
import { noBiomesMessage } from '../../hooks/content'

describe('noBiomesMessage', () => {
  test('with built-ins off, it names the user folder', () => {
    expect(noBiomesMessage(false, '~/x/')).toBe('No biomes to play: built-in content is off and no biome in ~/x/ loaded')
  })

  test('with built-ins on, it says every biome was disabled or broken', () => {
    expect(noBiomesMessage(true, '~/x/')).toBe('No biomes to play: every biome is disabled or failed to load')
  })
})
