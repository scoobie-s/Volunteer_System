import test from "node:test";
import assert from "node:assert/strict";
import { hashLoginCode, verifyLoginCode } from "../lib/credentials";

test("hashLoginCode produces a verifiable hash", () => {
  const hashed = hashLoginCode("1234");

  assert.notEqual(hashed, "1234");
  assert.equal(verifyLoginCode("1234", hashed), true);
  assert.equal(verifyLoginCode("9999", hashed), false);
});

test("verifyLoginCode remains compatible with legacy plain codes", () => {
  assert.equal(verifyLoginCode("2468", "2468"), true);
  assert.equal(verifyLoginCode("1357", "2468"), false);
});
