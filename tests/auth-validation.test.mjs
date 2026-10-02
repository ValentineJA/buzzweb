import test from "node:test";
import assert from "node:assert/strict";
import { ageFromBirthDate, isAdult, passwordProblem, safeNext, validHandle } from "../app/lib/auth/validation.ts";
const today = new Date("2026-09-28T12:00:00Z");
test("adult eligibility switches on the eighteenth birthday, not calendar year", () => {
  assert.equal(isAdult("2008-09-28", today), true);
  assert.equal(isAdult("2008-09-29", today), false);
  assert.equal(isAdult("2008-01-01", today), true);
  assert.equal(isAdult("2009-01-01", today), false);
});
test("invalid and future dates never qualify", () => {
  for (const value of ["", null, 2000, "2000-2-1", "2000-02-30", "2001-02-29", "2000-13-01", "2099-01-01", "1899-01-01", "2000-00-01", "2000-01-00"]) {
    assert.equal(isAdult(value, today), false);
    assert.equal(ageFromBirthDate(value, today), null);
  }
});
test("leap-day birthday uses a conservative March first threshold in non-leap years", () => {
  assert.equal(isAdult("2008-02-29", new Date("2026-02-28T23:59:59Z")), false);
  assert.equal(isAdult("2008-02-29", new Date("2026-03-01T00:00:00Z")), true);
});
test("redirects cannot send the user to an attacker-controlled address", () => {
  for (const value of [null, "https://evil.example", "//evil.example", "/\\evil.example", "/login?next=https://evil.example", "/%2f%2fevil.example"]) assert.equal(safeNext(value), "/");
  assert.equal(safeNext("/account/security"), "/account/security");
});
test("password and handle input boundaries", () => {
  assert.ok(passwordProblem("short"));
  assert.ok(passwordProblem("alllowercase123!"));
  assert.equal(passwordProblem("A-safe-demo-456"), null);
  assert.ok(passwordProblem("A".repeat(129) + "a1!"));
  assert.equal(validHandle("buzz_friend"), true);
  for (const value of ["ab", "a".repeat(26), "<script>", "a.b", null]) assert.equal(validHandle(value), false);
});