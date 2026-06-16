import { normalizePhone } from "../src/auth/phone-normalizer";

describe("normalizePhone", () => {
  it.each([
    ["08169212041", "+2348169212041"],
    ["8169212041", "+2348169212041"],
    ["2348169212041", "+2348169212041"],
    ["+234 816 921 2041", "+2348169212041"]
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("leaves unsupported values for validation to reject", () => {
    expect(normalizePhone("12345")).toBe("12345");
  });
});
