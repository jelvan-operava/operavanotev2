// Base32 decoding and Web Crypto / HMAC-SHA1 based TOTP generator

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32ToBytes(base32: string): Uint8Array {
  const cleanBase32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (let i = 0; i < cleanBase32.length; i++) {
    const val = BASE32_CHARS.indexOf(cleanBase32.charAt(i));
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

// Fallback pure JS SHA1 & HMAC-SHA1 for non-crypto environments or quick sync rendering
function sha1(bytes: Uint8Array): Uint8Array {
  let h0 = 0x67452301;
  let h1 = 0xEFCDAB89;
  let h2 = 0x98BADCFE;
  let h3 = 0x10325476;
  let h4 = 0xC3D2E1F0;

  const len = bytes.length;
  const bitLen = len * 8;
  const k1 = Math.ceil((len + 9) / 64) * 64;
  const padded = new Uint8Array(k1);
  padded.set(bytes);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(k1 - 4, bitLen, false);

  const words = new Uint32Array(k1 / 4);
  for (let i = 0; i < words.length; i++) {
    words[i] = view.getUint32(i * 4, false);
  }

  const w = new Uint32Array(80);
  for (let i = 0; i < words.length; i += 16) {
    for (let j = 0; j < 16; j++) w[j] = words[i + j];
    for (let j = 16; j < 80; j++) {
      const x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (x << 1) | (x >>> 31);
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f = 0, k = 0;
      if (j < 20) {
        f = (b & c) | ((~b) & d);
        k = 0x5A827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ED9EBA1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8F1BBCDC;
      } else {
        f = b ^ c ^ d;
        k = 0xCA62C1D6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const res = new Uint8Array(20);
  const resView = new DataView(res.buffer);
  resView.setUint32(0, h0, false);
  resView.setUint32(4, h1, false);
  resView.setUint32(8, h2, false);
  resView.setUint32(12, h3, false);
  resView.setUint32(16, h4, false);
  return res;
}

function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  let k = key;
  if (k.length > 64) {
    k = sha1(k);
  }
  if (k.length < 64) {
    const tmp = new Uint8Array(64);
    tmp.set(k);
    k = tmp;
  }

  const oPad = new Uint8Array(64);
  const iPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oPad[i] = k[i] ^ 0x5c;
    iPad[i] = k[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(64 + message.length);
  innerMsg.set(iPad, 0);
  innerMsg.set(message, 64);
  const innerHash = sha1(innerMsg);

  const outerMsg = new Uint8Array(64 + innerHash.length);
  outerMsg.set(oPad, 0);
  outerMsg.set(innerHash, 64);
  return sha1(outerMsg);
}

export function generateTOTPCode(secretBase32: string, timeSeconds: number = Math.floor(Date.now() / 1000), period: number = 30): string {
  try {
    const key = base32ToBytes(secretBase32);
    if (key.length === 0) return '123 456';

    const counter = Math.floor(timeSeconds / period);
    const msg = new Uint8Array(8);
    let tmpCounter = counter;
    for (let i = 7; i >= 0; i--) {
      msg[i] = tmpCounter & 0xff;
      tmpCounter = Math.floor(tmpCounter / 256);
    }

    const hmac = hmacSha1(key, msg);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    return `${otp.substring(0, 3)} ${otp.substring(3)}`;
  } catch (e) {
    console.error('Failed to calculate TOTP:', e);
    return '000 000';
  }
}

export function generateNextTOTPCode(secretBase32: string, timeSeconds: number = Math.floor(Date.now() / 1000), period: number = 30): string {
  return generateTOTPCode(secretBase32, timeSeconds + period, period);
}

export function getSecondsRemaining(period: number = 30): number {
  const currentSeconds = Math.floor(Date.now() / 1000);
  return period - (currentSeconds % period);
}

export function generateRandomSecret(): string {
  const bytes = new Uint8Array(10);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 10; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += BASE32_CHARS[bytes[i] % 32];
  }
  return result;
}
