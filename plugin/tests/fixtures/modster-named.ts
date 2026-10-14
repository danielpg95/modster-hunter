import type { Modster } from '../../hooks/content'

/** A valid common Modster with the given id, name defaults to the id; overrides replace fields. */
export function modsterNamed(id: string, overrides: Partial<Modster> = {}): Modster {
  return { schemaVersion: 1, id, name: id, rarity: 'common', sprite: { file: 'sprite.sprite.json' }, ...overrides }
}
