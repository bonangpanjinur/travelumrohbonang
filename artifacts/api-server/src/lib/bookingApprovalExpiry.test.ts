import { afterEach, describe, expect, it } from "vitest";
import { getApprovalExpiryDate, getApprovalExpiryHours } from "./bookingApprovalExpiry";

describe("booking approval expiry", () => {
  afterEach(() => {
    delete process.env.BOOKING_APPROVAL_EXPIRY_HOURS;
  });

  it("defaults to 24 hours", () => {
    expect(getApprovalExpiryHours()).toBe(24);
  });

  it("accepts a positive configured duration up to 30 days", () => {
    process.env.BOOKING_APPROVAL_EXPIRY_HOURS = "48";
    expect(getApprovalExpiryHours()).toBe(48);
  });

  it("calculates the expiry timestamp from approval time", () => {
    const approvedAt = new Date("2026-08-22T00:00:00.000Z");
    expect(getApprovalExpiryDate(approvedAt).toISOString()).toBe("2026-08-23T00:00:00.000Z");
  });
});
