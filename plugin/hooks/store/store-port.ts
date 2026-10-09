/**
 * What the store code needs from `$.store` (decision 0013): `register.tsx`
 * builds it from `$.store`, tests from a map. Values are JSON.
 */
export interface StorePort {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
}
