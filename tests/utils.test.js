import test from "node:test";
import assert from "node:assert/strict";
import { isPositiveInteger, isValidEmail, parseDate } from "../src/utils.js";

test("validates positive integer ids", () => {
  assert.equal(isPositiveInteger(1), true);
  assert.equal(isPositiveInteger("12"), true);
  assert.equal(isPositiveInteger(0), false);
  assert.equal(isPositiveInteger("abc"), false);
});

test("validates email format", () => {
  assert.equal(isValidEmail("user@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
});

test("parses appointment dates", () => {
  assert.ok(parseDate("2030-01-01T10:00:00Z") instanceof Date);
  assert.equal(parseDate("not-a-date"), null);
});
