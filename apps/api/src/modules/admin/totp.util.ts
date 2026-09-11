import crypto from "crypto";

/**
 * Shared RFC 4226/6238 TOTP helpers.
 * Used by admin MFA enrollment (mfa.routes.ts) and by login-time MFA
 * enforcement (session.controller.ts).
 */

export function hmacSha1(key: Buffer, message: Buffer): Buffer {
  return crypto.createHmac("sha1", key).update(message).digest();
}

export function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter & 0xffffffff, 4);
  const hash = hmacSha1(secret, buf);
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

export function generateTotp(secret: Buffer, timeStep = 30): string {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  return hotp(secret, counter);
}

export function generateSecret(): string {
  const bytes = crypto.randomBytes(20);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    result += alphabet[parseInt(chunk, 2)];
  }
  return result;
}

export function base32Decode(str: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  str = str.replace(/[= ]/g, "").toUpperCase();
  let bits = "";
  for (const char of str) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

/**
 * Verify a 6-digit TOTP with ±1 time-step tolerance.
 */
export function verifyTotp(secretBase32: string, code: string): boolean {
  const secretBytes = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / 30);
  return (
    code === hotp(secretBytes, counter) ||
    code === hotp(secretBytes, counter - 1) ||
    code === hotp(secretBytes, counter + 1)
  );
}
