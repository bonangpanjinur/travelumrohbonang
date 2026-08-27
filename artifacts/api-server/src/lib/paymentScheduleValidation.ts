export type PaymentScheduleEntry = {
  code?: string;
  label?: string;
  amount: number;
  status?: string;
};

export type ExistingPayment = {
  amount: number;
  status?: string | null;
};

export type PaymentScheduleValidationInput = {
  amount: number;
  paymentType?: string | null;
  totalPrice: number;
  schedule: unknown;
  existingPayments: ExistingPayment[];
};

export type PaymentScheduleValidationResult = {
  expectedAmount: number | null;
  nextCode: string | null;
  remainingBalance: number;
};

function asSchedule(value: unknown): PaymentScheduleEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      code: typeof item.code === "string" ? item.code : undefined,
      label: typeof item.label === "string" ? item.label : undefined,
      amount: Number(item.amount),
      status: typeof item.status === "string" ? item.status : undefined,
    }))
    .filter((item) => Number.isSafeInteger(item.amount) && item.amount > 0);
}

export function validatePaymentAgainstSchedule(input: PaymentScheduleValidationInput): {
  ok: true;
  result: PaymentScheduleValidationResult;
} | {
  ok: false;
  error: string;
} {
  const { amount, paymentType, totalPrice } = input;
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { ok: false, error: "Jumlah pembayaran harus berupa nominal rupiah yang valid" };
  }

  const activePayments = input.existingPayments.filter((payment) => payment.status === "verified" || payment.status === "pending");
  const paidTotal = activePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const remainingBalance = Math.max(0, totalPrice - paidTotal);
  if (amount > remainingBalance) {
    return { ok: false, error: `Jumlah pembayaran melebihi sisa tagihan. Sisa yang perlu dibayar: Rp ${remainingBalance.toLocaleString("id-ID")}` };
  }

  const schedule = asSchedule(input.schedule);
  if (schedule.length === 0) {
    return { ok: true, result: { expectedAmount: null, nextCode: null, remainingBalance } };
  }

  if (activePayments.some((payment) => payment.status === "pending")) {
    return { ok: false, error: "Masih ada pembayaran yang menunggu verifikasi. Tunggu hasil verifikasi sebelum mengirim pembayaran berikutnya." };
  }

  let cursor = paidTotal;
  let next: PaymentScheduleEntry | null = null;
  for (const item of schedule) {
    if (cursor >= item.amount) {
      cursor -= item.amount;
      continue;
    }
    next = item;
    break;
  }

  if (!next) {
    return { ok: false, error: "Jadwal pembayaran pada booking sudah selesai" };
  }

  const expectedAmount = Math.min(next.amount - cursor, remainingBalance);
  const normalizedType = String(paymentType ?? "").toLowerCase();
  const nextCode = next.code ?? null;
  const isFullPayment = normalizedType === "full" || normalizedType === "balance";
  if (isFullPayment) {
    if (amount !== remainingBalance) {
      return { ok: false, error: `Pembayaran penuh harus sebesar sisa tagihan: Rp ${remainingBalance.toLocaleString("id-ID")}` };
    }
  } else {
    if (!normalizedType) {
      return { ok: false, error: "Tipe pembayaran wajib dipilih" };
    }
    if (normalizedType === "dp" && nextCode !== "down_payment") {
      return { ok: false, error: "Tahap DP pada booking ini sudah dibayar atau tidak lagi menjadi tahap berikutnya" };
    }
    if (normalizedType === "installment" && nextCode !== "installment") {
      return { ok: false, error: "Tahap cicilan berikutnya belum tersedia untuk dibayar" };
    }
    if (amount !== expectedAmount) {
      return { ok: false, error: `Nominal pembayaran untuk tahap ini harus sebesar Rp ${expectedAmount.toLocaleString("id-ID")}` };
    }
  }

  return { ok: true, result: { expectedAmount, nextCode, remainingBalance } };
}
