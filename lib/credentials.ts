import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

// Deterministic lookup only; the scrypt hash is still the credential verifier.
export function getLoginCodeLookup(loginCode: string) {
  const secret = process.env.LOGIN_CODE_LOOKUP_SECRET ?? process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("LOGIN_CODE_LOOKUP_SECRET or BETTER_AUTH_SECRET must be configured.");
  return createHmac("sha256", secret).update(loginCode).digest("hex");
}

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
