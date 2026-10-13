import { validModster } from './valid-modster'
import { validSprite } from './valid-sprite'

/**
 * Content files (for stubContentFs) of one forest with `count` numbered Modsters
 * `mon-01`… (dex numbers given in reverse file order, so sorting shows) and one
 * Modster without a number, `aardvark`, which must list last. Every sprite is
 * validSprite(): 8×8, two frames.
 */
export function collectionForest(count = 3): Record<string, string> {
  const files: Record<string, string> = {}
  const ids: string[] = []
  for (let i = 1; i <= count; i++) {
    const id = `mon-${String(i).padStart(2, '0')}`
    ids.push(id)
    const modster = validModster()
    files[`modsters/${id}/modster.json`] = JSON.stringify({
      ...modster,
      id,
      name: `Mon ${String(i).padStart(2, '0')}`,
      dex: { ...(modster.dex as object), number: count + 1 - i },
    })
    files[`modsters/${id}/sprite.sprite.json`] = JSON.stringify(validSprite())
  }
  const { dex, ...plain } = validModster()
  const { number, ...unnumbered } = dex as Record<string, unknown>
  files['modsters/aardvark/modster.json'] = JSON.stringify({ ...plain, id: 'aardvark', name: 'Aardvark', dex: unnumbered })
  files['modsters/aardvark/sprite.sprite.json'] = JSON.stringify(validSprite())
  files['biomes/whispering-forest/biome.json'] = JSON.stringify({
    schemaVersion: 1,
    id: 'whispering-forest',
    name: 'Whispering Forest',
    modsters: [...ids, 'aardvark'].map((id) => ({ id, weight: 1 })),
  })
  return files
}
