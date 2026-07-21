/**
 * autoJournal.ts — F-6: Jurnal Otomatis (Auto-Posting ke Ledger)
 *
 * Wrapper idempoten di atas recordFinancialTransaction.
 * Setiap event bisnis yang berdampak keuangan HARUS memanggil
 * fungsi di sini — bukan memanggil recordFinancialTransaction langsung
 * dari route handler — agar pencatatan konsisten dan tidak duplikat.
 *
 * Idempotency: setiap jurnal punya `referenceNumber` unik per event.
 * Jika sudah ada record dengan referenceNumber yang sama → skip (no-op).
 *
 * ─────────────────────────────────────────────────────────────────────
 * Peta Jurnal (disederhanakan, belum double-entry penuh — F-7 untuk CoA):
 *
 * Event                   | Type    | Category
 * ─────────────────────── | ─────── | ────────────────────────
 * payment_verified        | income  | booking_payment
 * installment_paid        | income  | installment_payment
 * refund_approved         | expense | refund_approved
 * refund_processed        | refund  | refund_processed
 * commission_withdrawal   | expense | commission_withdrawal
 * savings_deposit         | income  | savings_deposit
 * savings_used            | expense | savings_used
 */

import { db, financialTransactions, eq } from "@workspace/db";
import { recordFinancialTransaction } from "./paymentSync";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cek apakah jurnal dengan referenceNumber ini sudah ada (idempotency guard) */
async function alreadyJournaled(ref: string): Promise<boolean> {
  const rows = await db
    .select({ id: financialTransactions.id })
    .from(financialTransactions)
    .where(eq(financialTransactions.referenceNumber, ref))
    .limit(1);
  return rows.length > 0;
}

// ── Journal Functions ─────────────────────────────────────────────────────────

/**
 * F-6.1 — Pembayaran manual diverifikasi admin.
 *
 * Debit : Kas / Bank
 * Kredit: Pendapatan Umroh (booking_payment)
 *
 * Dipanggil dari: PATCH /admin/payments/verify/:id
 *                 POST  /admin/payments/bulk-verify
 */
export async function journalPaymentVerified(opts: {
  bookingId: string;
  amount: number;
  paymentId: string;
  adminId?: string;
}): Promise<void> {
  const ref = `auto:payment_verified:${opts.paymentId}`;
  if (await alreadyJournaled(ref)) return;
  await recordFinancialTransaction({
    bookingId: opts.bookingId,
    amount: opts.amount,
    type: "income",
    category: "booking_payment",
    description: `[Auto] Bukti bayar diverifikasi — payment #${opts.paymentId}`,
    referenceNumber: ref,
    recordedBy: opts.adminId,
  });
}

/**
 * F-6.2 — Cicilan (installment) dibayar, baik via gateway maupun manual.
 *
 * Debit : Kas / Bank
 * Kredit: Pendapatan Umroh (installment_payment)
 *
 * Dipanggil dari: POST /admin/installments/:id (mark paid)
 *                 Webhook Midtrans/Xendit saat installment terbayar
 */
export async function journalInstallmentPaid(opts: {
  bookingId: string;
  amount: number;
  installmentId: string;
  installmentNumber: number;
  adminId?: string;
}): Promise<void> {
  const ref = `auto:installment_paid:${opts.installmentId}`;
  if (await alreadyJournaled(ref)) return;
  await recordFinancialTransaction({
    bookingId: opts.bookingId,
    amount: opts.amount,
    type: "income",
    category: "installment_payment",
    description: `[Auto] Cicilan ke-${opts.installmentNumber} dibayar — installment #${opts.installmentId}`,
    referenceNumber: ref,
    recordedBy: opts.adminId,
  });
}

/**
 * F-6.3 — Refund disetujui admin (liability: uang harus dikembalikan).
 *
 * Debit : Beban Refund (refund_approved)
 * Kredit: Hutang Refund
 *
 * Dipanggil dari: PATCH /admin/refunds/:id  saat status → "approved"
 */
export async function journalRefundApproved(opts: {
  bookingId: string;
  amount: number;
  refundId: string;
  adminId?: string;
}): Promise<void> {
  const ref = `auto:refund_approved:${opts.refundId}`;
  if (await alreadyJournaled(ref)) return;
  await recordFinancialTransaction({
    bookingId: opts.bookingId,
    amount: opts.amount,
    type: "expense",
    category: "refund_approved",
    description: `[Auto] Refund disetujui — refund #${opts.refundId}`,
    referenceNumber: ref,
    recordedBy: opts.adminId,
  });
}

/**
 * F-6.4 — Refund sudah dicairkan ke rekening jemaah (kas keluar).
 *
 * Debit : Hutang Refund
 * Kredit: Kas / Bank (refund_processed)
 *
 * Dipanggil dari: PATCH /admin/refunds/:id  saat status → "refunded"
 */
export async function journalRefundProcessed(opts: {
  bookingId: string;
  amount: number;
  refundId: string;
  adminId?: string;
}): Promise<void> {
  const ref = `auto:refund_processed:${opts.refundId}`;
  if (await alreadyJournaled(ref)) return;
  await recordFinancialTransaction({
    bookingId: opts.bookingId,
    amount: opts.amount,
    type: "refund",
    category: "refund_processed",
    description: `[Auto] Refund dicairkan ke jemaah — refund #${opts.refundId}`,
    referenceNumber: ref,
    recordedBy: opts.adminId,
  });
}

/**
 * F-6.5 — Withdrawal komisi agen diproses/dibayar (kas keluar).
 *
 * Debit : Hutang Komisi Agen
 * Kredit: Kas / Bank (commission_withdrawal)
 *
 * Dipanggil dari: PATCH /admin/agents/withdrawals/:id  saat status → "paid"
 *
 * Catatan: withdrawal tidak terikat satu booking, bookingId = null.
 */
export async function journalCommissionWithdrawal(opts: {
  agentId: string;
  amount: number;
  withdrawalId: string;
  adminId?: string;
}): Promise<void> {
  const ref = `auto:commission_withdrawal:${opts.withdrawalId}`;
  if (await alreadyJournaled(ref)) return;
  // Gunakan insert langsung karena bookingId bisa null
  await db.insert(financialTransactions).values({
    id: crypto.randomUUID(),
    bookingId: null,
    amount: String(opts.amount),
    type: "expense",
    category: "commission_withdrawal",
    description: `[Auto] Komisi agen dicairkan — agent ${opts.agentId} withdrawal #${opts.withdrawalId}`,
    referenceNumber: ref,
    transactionDate: new Date(),
    recordedBy: opts.adminId ?? null,
    createdAt: new Date(),
  });
}

/**
 * F-6.6 — Setoran tabungan umroh diterima.
 *
 * Debit : Kas / Bank
 * Kredit: Hutang Tabungan Jemaah (savings_deposit)
 *
 * Dipanggil dari: POST /savings/:id/deposit
 */
export async function journalSavingsDeposit(opts: {
  userId: string;
  amount: number;
  transactionId: string;
  adminId?: string;
}): Promise<void> {
  const ref = `auto:savings_deposit:${opts.transactionId}`;
  if (await alreadyJournaled(ref)) return;
  await db.insert(financialTransactions).values({
    id: crypto.randomUUID(),
    bookingId: null,
    amount: String(opts.amount),
    type: "income",
    category: "savings_deposit",
    description: `[Auto] Setoran tabungan umroh — user ${opts.userId} txn #${opts.transactionId}`,
    referenceNumber: ref,
    transactionDate: new Date(),
    recordedBy: opts.adminId ?? null,
    createdAt: new Date(),
  });
}

/**
 * F-6.7 — Tabungan umroh digunakan untuk booking.
 *
 * Debit : Hutang Tabungan Jemaah
 * Kredit: Pendapatan Umroh (savings_used)
 *
 * Dipanggil dari: POST /savings/:id/use
 */
export async function journalSavingsUsed(opts: {
  bookingId: string;
  amount: number;
  transactionId: string;
}): Promise<void> {
  const ref = `auto:savings_used:${opts.transactionId}`;
  if (await alreadyJournaled(ref)) return;
  await recordFinancialTransaction({
    bookingId: opts.bookingId,
    amount: opts.amount,
    type: "income",
    category: "savings_used",
    description: `[Auto] Tabungan digunakan untuk booking — txn #${opts.transactionId}`,
    referenceNumber: ref,
  });
}
