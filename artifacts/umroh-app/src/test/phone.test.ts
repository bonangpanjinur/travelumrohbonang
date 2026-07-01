import { describe, it, expect } from "vitest";
import { normalizePhone, isValidIndonesianPhone } from "@/lib/phone";

describe("normalizePhone — edge cases", () => {
  const cases: [string, string][] = [
    ["08123456789", "+628123456789"],
    ["8123456789", "+628123456789"],
    ["628123456789", "+628123456789"],
    ["+628123456789", "+628123456789"],
    ["+62 812-3456-789", "+628123456789"],
    ["0812 3456 789", "+628123456789"],
    [" (0812) 3456.789 ", "+628123456789"],
    ["62-812-3456-789", "+628123456789"],
    ["", ""],
    ["   ", ""],
    ["----", ""],
    ["abc", ""],
  ];
  it.each(cases)("normalizes %s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("handles null/undefined", () => {
    expect(normalizePhone(null)).toBe("");
    expect(normalizePhone(undefined)).toBe("");
  });
});

describe("isValidIndonesianPhone", () => {
  it("accepts proper +62 mobile numbers", () => {
    expect(isValidIndonesianPhone("+628123456789")).toBe(true);
    expect(isValidIndonesianPhone("+6281234567890")).toBe(true);
  });
  it("rejects too short / too long / wrong prefix", () => {
    expect(isValidIndonesianPhone("+6281234567")).toBe(false); // <8 after 8
    expect(isValidIndonesianPhone("+62812345678901234")).toBe(false);
    expect(isValidIndonesianPhone("08123456789")).toBe(false);
    expect(isValidIndonesianPhone("+621234567890")).toBe(false);
    expect(isValidIndonesianPhone("")).toBe(false);
  });
});
