/** Base64 of some bytes, in chunks: a spread of a whole sheet would pass too many arguments. */
export function base64FromBytes(bytes: Uint8Array): string {
  let binary = ''
  for (let at = 0; at < bytes.length; at += 8192) binary += String.fromCharCode(...bytes.subarray(at, at + 8192))
  return btoa(binary)
}
