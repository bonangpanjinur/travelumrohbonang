import { describe, expect, it } from "vitest";
import { BookingPricingError, calculateAuthoritativeBookingPrice } from "./bookingPricing";

describe("authoritative booking pricing", () => {
  const officialPrices = [
    { roomType: "double", price: 25_000_000 },
    { roomType: "triple", price: 22_000_000 },
  ];

  it("calculates total and lines from official departure prices", () => {
    const result = calculateAuthoritativeBookingPrice(
      [{ roomType: "double", quantity: 2 }],
      officialPrices,
    );

    expect(result.total).toBe(50_000_000);
    expect(result.lines).toEqual([
      { roomType: "double", quantity: 2, price: 25_000_000, subtotal: 50_000_000 },
    ]);
  });

  it("does not use a client-supplied price field", () => {
    const result = calculateAuthoritativeBookingPrice(
      [{ roomType: "double", quantity: 1 }],
      officialPrices,
    );

    // A manipulated client total is not an input to this helper; the result is always DB price × quantity.
    expect(result.total).not.toBe(1_000);
    expect(result.total).toBe(25_000_000);
  });

  it("rejects an unavailable room type", () => {
    expect(() => calculateAuthoritativeBookingPrice(
      [{ roomType: "single", quantity: 1 }],
      officialPrices,
    )).toThrowError(new BookingPricingError("ROOM_UNAVAILABLE", "Tipe kamar 'single' tidak tersedia untuk keberangkatan ini"));
  });

  it("rejects duplicate room types", () => {
    expect(() => calculateAuthoritativeBookingPrice(
      [{ roomType: "double", quantity: 1 }, { roomType: "double", quantity: 1 }],
      officialPrices,
    )).toThrowError(new BookingPricingError("DUPLICATE_ROOM_TYPE", "Tipe kamar 'double' tidak boleh dikirim lebih dari satu kali"));
  });
});
