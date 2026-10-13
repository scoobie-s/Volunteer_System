import test from "node:test";
import assert from "node:assert/strict";
import { getLoginCodeLookup, hashLoginCode, verifyLoginCode } from "../lib/credentials";

process.env.LOGIN_CODE_LOOKUP_SECRET = "test-login-code-lookup-secret";

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

test("login-code lookup is deterministic and does not expose the code", () => {
  const lookup = getLoginCodeLookup("2468");
  assert.equal(lookup, getLoginCodeLookup("2468"));
  assert.notEqual(lookup, getLoginCodeLookup("1357"));
  assert.notEqual(lookup, "2468");
});
