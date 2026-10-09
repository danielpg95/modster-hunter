import type { StorePort } from '../../hooks/store'

/**
 * A StorePort over a plain object (values copied in and out, like JSON), with
 * `beforeGet` to act as another session writing just before a read.
 */
export function memoryStore(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = structuredClone(initial)
  let beforeGet: ((key: string, data: Record<string, unknown>) => void) | undefined
  const store: StorePort = {
    async get(key) {
      beforeGet?.(key, data)
      return structuredClone(data[key])
    },
    async set(key, value) {
      data[key] = structuredClone(value)
    },
  }
  return {
    store,
    data,
    onGet(hook: (key: string, data: Record<string, unknown>) => void) {
      beforeGet = hook
    },
  }
}
