import { validModster } from './valid-modster'

/** A modster.json that passes validation in the user folder: no dex number (decision 0017 point 3). */
export function validUserModster(): Record<string, unknown> {
  const modster = validModster()
  const { number: _number, ...dex } = modster.dex as Record<string, unknown>
  return { ...modster, dex }
}
