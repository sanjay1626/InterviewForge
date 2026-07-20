/**
 * Decode a base64 string to raw bytes. Used to upload the original picked file
 * (e.g. a PDF) to Supabase Storage without a TextEncoder. Handles an optional
 * `data:` URI prefix.
 */

const LOOKUP = (() => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const table = new Int16Array(256).fill(-1);
  for (let i = 0; i < chars.length; i++) table[chars.charCodeAt(i)] = i;
  return table;
})();

export function base64ToBytes(input: string): Uint8Array {
  const b64 = input.includes(',') ? input.slice(input.indexOf(',') + 1) : input;
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const outLen = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(outLen);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c0 = LOOKUP[clean.charCodeAt(i)] ?? 0;
    const c1 = LOOKUP[clean.charCodeAt(i + 1)] ?? 0;
    const c2 = i + 2 < len ? (LOOKUP[clean.charCodeAt(i + 2)] ?? 0) : 0;
    const c3 = i + 3 < len ? (LOOKUP[clean.charCodeAt(i + 3)] ?? 0) : 0;

    if (p < outLen) bytes[p++] = (c0 << 2) | (c1 >> 4);
    if (p < outLen) bytes[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (p < outLen) bytes[p++] = ((c2 & 3) << 6) | c3;
  }
  return bytes;
}
