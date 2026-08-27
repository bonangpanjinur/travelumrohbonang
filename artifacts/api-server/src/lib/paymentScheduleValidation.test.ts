import { describe, expect, it } from "vitest";
import { validatePaymentAgainstSchedule } from "./paymentScheduleValidation";

const schedule = [
  { code: "down_payment", label: "DP", amount: 3_000_000, status: "pending" },
  { code: "installment", label: "Cicilan 1", amount: 4_000_000, status: "pending" },
  { code: "final_payment_due", label: "Pelunasan", amount: 3_000_000, status: "pending" },
];

describe("payment schedule validation", () => {
  it("accepts the exact first DP amount", () => {
    const result = validatePaymentAgainstSchedule({
      amount: 3_000_000,
      paymentType: "dp",
      totalPrice: 10_000_000,
      schedule,
      existingPayments: [],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a manipulated DP amount", () => {
    const result = validatePaymentAgainstSchedule({
      amount: 1_000_000,
      paymentType: "dp",
      totalPrice: 10_000_000,
      schedule,
      existingPayments: [],
    });
    expect(result).toEqual({ ok: false, error: "Nominal pembayaran untuk tahap ini harus sebesar Rp 3.000.000" });
  });

  it("requires the next installment after the DP is verified", () => {
    const result = validatePaymentAgainstSchedule({
      amount: 4_000_000,
      paymentType: "installment",
      totalPrice: 10_000_000,
      schedule,
      existingPayments: [{ amount: 3_000_000, status: "verified" }],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects paying an installment before the DP stage", () => {
    const result = validatePaymentAgainstSchedule({
      amount: 4_000_000,
      paymentType: "installment",
      totalPrice: 10_000_000,
      schedule,
      existingPayments: [],
    });
    expect(result).toEqual({ ok: false, error: "Tahap cicilan berikutnya belum tersedia untuk dibayar" });
  });

  it("accepts full payment only for the remaining balance", () => {
    const result = validatePaymentAgainstSchedule({
      amount: 7_000_000,
      paymentType: "full",
      totalPrice: 10_000_000,
      schedule,
      existingPayments: [{ amount: 3_000_000, status: "verified" }],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects overpayment", () => {
    const result = validatePaymentAgainstSchedule({
      amount: 11_000_000,
      paymentType: "full",
      totalPrice: 10_000_000,
      schedule,
      existingPayments: [],
    });
    expect(result).toEqual({ ok: false, error: "Jumlah pembayaran melebihi sisa tagihan. Sisa yang perlu dibayar: Rp 10.000.000" });
  });

  it("blocks duplicate submissions while a payment is pending", () => {
    const result = validatePaymentAgainstSchedule({
      amount: 3_000_000,
      paymentType: "dp",
      totalPrice: 10_000_000,
      schedule,
      existingPayments: [{ amount: 3_000_000, status: "pending" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("menunggu verifikasi");
  });
});
