/** The bytes of a base64 string (Uint8Array.fromBase64 isn't in the es2023 lib). */
export function bytesFromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}
