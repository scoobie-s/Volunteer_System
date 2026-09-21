import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

function deriveKey(loginCode: string, salt: string) {
  return scryptSync(loginCode, salt, KEY_LENGTH).toString("hex");
}

export function hashLoginCode(loginCode: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = deriveKey(loginCode, salt);
  return `${HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyLoginCode(loginCode: string, storedValue: string) {
  if (!storedValue) {
    return false;
  }

  if (!storedValue.startsWith(`${HASH_PREFIX}$`)) {
    return storedValue === loginCode;
  }

  const [, salt, storedHash] = storedValue.split("$");
  if (!salt || !storedHash) {
    return false;
  }

  const expected = Buffer.from(storedHash, "hex");
  const candidate = Buffer.from(deriveKey(loginCode, salt), "hex");

  if (expected.length !== candidate.length) {
    return false;
  }

  return timingSafeEqual(expected, candidate);
}
