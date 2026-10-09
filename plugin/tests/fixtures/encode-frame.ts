/** base64 of the given bytes, the way `.sprite.json` frames store palette indexes. */
export function encodeFrame(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes))
}
