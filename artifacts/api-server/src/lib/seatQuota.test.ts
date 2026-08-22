import { describe, expect, it } from "vitest";
import { isSeatReservedStatus } from "./seatQuota";

describe("seat reservation status", () => {
  it("reserves seats for an approved booking even when unpaid", () => {
    expect(isSeatReservedStatus("confirmed")).toBe(true);
  });

  it("keeps unapproved and payment-only states out of the seat count", () => {
    for (const status of ["draft", "pending", "waiting_payment", "paid", "partial", null, undefined]) {
      expect(isSeatReservedStatus(status)).toBe(false);
    }
  });

  it("keeps completed bookings reserved and releases cancelled bookings", () => {
    expect(isSeatReservedStatus("completed")).toBe(true);
    expect(isSeatReservedStatus("cancelled")).toBe(false);
  });
});
