import { validateEmailOrUsername } from "./utils";

test("validateEmail returns false for non-emails", () => {
  expect(validateEmailOrUsername(undefined)).toBe(false);
  expect(validateEmailOrUsername(null)).toBe(false);
  expect(validateEmailOrUsername("")).toBe(false);
  expect(validateEmailOrUsername("not-an-email")).toBe(false);
  expect(validateEmailOrUsername("n@")).toBe(false);
});

test("validateEmail returns true for emails", () => {
  expect(validateEmailOrUsername("kody@example.com")).toBe(true);
});
