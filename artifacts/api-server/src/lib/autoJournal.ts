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
 * Double-entry map (B1 fix):
 *
 * Event                   | DEBIT account   | CREDIT account
 * ─────────────────────── | ─────────────── | ──────────────────────
 * payment_verified        | 1-1101 (Kas)    | 4-1001 (Pendapatan Umroh)
 * installment_paid        | 1-1101 (Kas)    | 4-1002 (Pendapatan DP/Cicilan)
 * refund_approved         | 2-1101 (Hutang) | 2-1101 (Hutang Refund — liability)
 * refund_processed        | 2-1101 (Hutang) | 1-1101 (Kas keluar)
 * commission_withdrawal   | 5-2004 (Komisi) | 1-1101 (Kas keluar)
 * savings_deposit         | 1-1101 (Kas)    | 2-1103 (Hutang Tabungan)
 * savings_used            | 2-1103 (Hutang) | 4-1001 (Pendapatan Umroh)
 */

import { db, financialTransactions, chartOfAccounts, accountingPeriods, bookings, branches, agents, savingsTransactions, savingsAccounts, eq, and } from "@workspace/db";
import { recordFinancialTransaction } from "./paymentSync";

// Tipe generik untuk transaksi Drizzle (dipakai di semua fungsi jurnal)
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// ── B2: CoA Lookup Cache ──────────────────────────────────────────────────────

/** In-memory cache: CoA code → row id (populated lazily on first use) */
const coaCache = new Map<string, string>();

async function assertOpenAccountingPeriod(date: Date, runner: DbOrTx = db): Promise<void> {
  const [period] = await runner
    .select({ status: accountingPeriods.status })
    .from(accountingPeriods)
    .where(and(
      eq(accountingPeriods.year, date.getFullYear()),
      eq(accountingPeriods.month, date.getMonth() + 1),
    ))
    .limit(1);
  if (period?.status === "closed") {
    throw new Error(`Accounting period ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")} is closed`);
  }
}

/**
 * Look up a CoA account id by its code.
 * Returns null if the account hasn't been seeded yet — callers fall back
 * to inserting a journal entry with accountId=null (backward-compatible).
 */
async function getCoaId(code: string, runner: DbOrTx = db): Promise<string | null> {
  const cached = coaCache.get(code);
  if (cached) return cached;

  try {
    const [row] = await runner
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.code, code))
      .limit(1);

    if (row?.id) {
      coaCache.set(code, row.id);
      return row.id;
    }
  } catch {
    // CoA table may not be seeded yet — degrade gracefully
  }
  return null;
}

async function resolveTenantBranchId(candidate: string | null | undefined, runner: DbOrTx = db): Promise<string> {
  if (candidate) return candidate;
  const [hq] = await runner.select({ id: branches.id }).from(branches).where(eq(branches.id, "hq")).limit(1);
  if (!hq?.id) throw new Error("Branch HQ belum tersedia; jalankan migration 20260815000006 terlebih dahulu");
  return hq.id;
}

// ── B1: Double-Entry Helper ───────────────────────────────────────────────────

/**
 * Insert two financial_transactions rows for one economic event:
 *   1. DEBIT  debitCode  (asset or expense account increases)
 *   2. CREDIT creditCode (liability, equity, or revenue account increases)
 *
 * Each row shares the same referenceNumber but gets a unique id.
 * If either CoA account hasn't been seeded, accountId is stored as null
 * (backward-compatible with existing queries that don't filter by accountId).
 */
async function recordDoubleEntry(opts: {
  bookingId?: string | null;
  branchId?: string | null;
  amount: number;
  debitCode: string;   // e.g. '1-1101'
  creditCode: string;  // e.g. '4-1001'
  debitType: "income" | "expense" | "refund";
  creditType: "income" | "expense" | "refund";
  category: string;
  description: string;
  referenceNumber: string;
  recordedBy?: string;
}, tx?: DbOrTx): Promise<void> {
  const [debitAccountId, creditAccountId] = await Promise.all([
    getCoaId(opts.debitCode, tx),
    getCoaId(opts.creditCode, tx),
  ]);

  const now = new Date();
  const runner = tx ?? db;
  await assertOpenAccountingPeriod(now, runner);

  let branchId = opts.branchId ?? null;
  if (!branchId && opts.bookingId) {
    const [booking] = await runner
      .select({ branchId: bookings.branchId })
      .from(bookings)
      .where(eq(bookings.id, opts.bookingId))
      .limit(1);
    branchId = booking?.branchId ?? null;
  }
  branchId = await resolveTenantBranchId(branchId, runner);

  await (runner as typeof db).insert(financialTransactions).values([
    {
      id: crypto.randomUUID(),
      bookingId: opts.bookingId ?? null,
      branchId,
      amount: String(opts.amount),
      type: opts.debitType,
      category: opts.category,
      description: opts.description,
      referenceNumber: opts.referenceNumber,
      transactionDate: now,
      recordedBy: opts.recordedBy ?? null,
      accountId: debitAccountId,
      entryType: "debit",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      bookingId: opts.bookingId ?? null,
      branchId,
      amount: String(opts.amount),
      type: opts.creditType,
      category: opts.category,
      description: opts.description,
      referenceNumber: opts.referenceNumber,
      transactionDate: now,
      recordedBy: opts.recordedBy ?? null,
      accountId: creditAccountId,
      entryType: "credit",
      createdAt: now,
    },
  ]);
}

// ── Idempotency Guard ─────────────────────────────────────────────────────────

/** Cek apakah jurnal dengan referenceNumber ini sudah ada (idempotency guard) */
async function alreadyJournaled(ref: string, tx?: DbOrTx): Promise<boolean> {
  const runner = tx ?? db;
  const rows = await (runner as typeof db)
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
 * DEBIT : 1-1101 Kas (asset+)
 * CREDIT: 4-1001 Pendapatan Paket Umroh (revenue+)
 *
 * Dipanggil dari: PATCH /admin/payments/verify/:id
 *                 POST  /admin/payments/bulk-verify
 */
export async function journalPaymentVerified(opts: {
  bookingId: string;
  amount: number;
  paymentId: string;
  adminId?: string;
}, tx?: DbOrTx): Promise<void> {
  const ref = `auto:payment_verified:${opts.paymentId}`;
  if (await alreadyJournaled(ref, tx)) return;

  await recordDoubleEntry({
    bookingId: opts.bookingId,
    amount: opts.amount,
    debitCode: "1-1101",
    creditCode: "4-1001",
    debitType: "income",
    creditType: "income",
    category: "booking_payment",
    description: `[Auto] Bukti bayar diverifikasi — payment #${opts.paymentId}`,
    referenceNumber: ref,
    recordedBy: opts.adminId,
  }, tx);
}

/**
 * F-6.2 — Cicilan (installment) dibayar.
 *
 * DEBIT : 1-1101 Kas (asset+)
 * CREDIT: 4-1002 Pendapatan DP / Cicilan (revenue+)
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

  await recordDoubleEntry({
    bookingId: opts.bookingId,
    amount: opts.amount,
    debitCode: "1-1101",
    creditCode: "4-1002",
    debitType: "income",
    creditType: "income",
    category: "installment_payment",
    description: `[Auto] Cicilan ke-${opts.installmentNumber} dibayar — installment #${opts.installmentId}`,
    referenceNumber: ref,
    recordedBy: opts.adminId,
  });
}

/**
 * F-6.3 — Refund disetujui admin (liability: uang harus dikembalikan).
 *
 * DEBIT : 2-1101 Hutang Usaha (liability — pengakuan kewajiban refund)
 * CREDIT: 2-1101 Hutang Usaha (liability+) — kedua sisi di liability, net = 0
 *
 * Pendekatan sederhana: catat sebagai expense single-entry karena
 * refund_approved belum mengeluarkan kas — kas keluar saat refund_processed.
 *
 * Dipanggil dari: PATCH /admin/refunds/:id  saat status → "approved"
 */
export async function journalRefundApproved(opts: {
  bookingId: string;
  amount: number;
  refundId: string;
  adminId?: string;
}, tx?: DbOrTx): Promise<void> {
  const ref = `auto:refund_approved:${opts.refundId}`;
  if (await alreadyJournaled(ref, tx)) return;

  // Refund approved = kewajiban diakui (DEBIT Beban Refund, CREDIT Hutang Refund)
  // Gunakan 5-2001 (Biaya Operasional) sebagai proxy untuk Beban Refund karena
  // tidak ada kode refund khusus di seed default.
  await recordDoubleEntry({
    bookingId: opts.bookingId,
    amount: opts.amount,
    debitCode: "5-2001",   // Biaya Operasional (expense proxy untuk beban refund)
    creditCode: "2-1101",  // Hutang Usaha (liability: wajib kembalikan kas)
    debitType: "expense",
    creditType: "expense",
    category: "refund_approved",
    description: `[Auto] Refund disetujui — refund #${opts.refundId}`,
    referenceNumber: ref,
    recordedBy: opts.adminId,
  }, tx);
}

/**
 * F-6.4 — Refund sudah dicairkan ke rekening jemaah (kas keluar).
 *
 * DEBIT : 2-1101 Hutang Usaha (liability — hapus kewajiban)
 * CREDIT: 1-1101 Kas (asset— kas keluar)
 *
 * Dipanggil dari: PATCH /admin/refunds/:id  saat status → "refunded"
 */
export async function journalRefundProcessed(opts: {
  bookingId: string;
  amount: number;
  refundId: string;
  adminId?: string;
}, tx?: DbOrTx): Promise<void> {
  const ref = `auto:refund_processed:${opts.refundId}`;
  if (await alreadyJournaled(ref, tx)) return;

  await recordDoubleEntry({
    bookingId: opts.bookingId,
    amount: opts.amount,
    debitCode: "2-1101",  // Hutang Usaha (hapus kewajiban, debit liability)
    creditCode: "1-1101", // Kas (kas keluar, credit asset)
    debitType: "refund",
    creditType: "refund",
    category: "refund_processed",
    description: `[Auto] Refund dicairkan ke jemaah — refund #${opts.refundId}`,
    referenceNumber: ref,
    recordedBy: opts.adminId,
  }, tx);
}

/**
 * F-6.5 — Withdrawal komisi agen diproses/dibayar (kas keluar).
 *
 * DEBIT : 5-2004 Komisi Agen & Referral (expense+)
 * CREDIT: 1-1101 Kas (asset— kas keluar)
 *
 * Dipanggil dari: PATCH /admin/agents/withdrawals/:id  saat status → "paid"
 */
export async function journalCommissionWithdrawal(opts: {
  agentId: string;
  amount: number;
  withdrawalId: string;
  adminId?: string;
}): Promise<void> {
  const ref = `auto:commission_withdrawal:${opts.withdrawalId}`;
  if (await alreadyJournaled(ref)) return;

  const [agent] = await db
    .select({ branchId: agents.branchId })
    .from(agents)
    .where(eq(agents.id, opts.agentId))
    .limit(1);
  if (!agent) throw new Error(`Agent ${opts.agentId} tidak ditemukan untuk auto-journal komisi`);
  const branchId = await resolveTenantBranchId(agent.branchId);

  const [debitAccountId, creditAccountId] = await Promise.all([
    getCoaId("5-2004"),
    getCoaId("1-1101"),
  ]);

  const now = new Date();
  await assertOpenAccountingPeriod(now);
  await db.insert(financialTransactions).values([
    {
      id: crypto.randomUUID(),
      bookingId: null,
      branchId,
      amount: String(opts.amount),
      type: "expense",
      category: "commission_withdrawal",
      description: `[Auto] Komisi agen dicairkan — agent ${opts.agentId} withdrawal #${opts.withdrawalId}`,
      referenceNumber: ref,
      transactionDate: now,
      recordedBy: opts.adminId ?? null,
      accountId: debitAccountId,
      entryType: "debit",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      bookingId: null,
      branchId,
      amount: String(opts.amount),
      type: "expense",
      category: "commission_withdrawal",
      description: `[Auto] Komisi agen dicairkan — agent ${opts.agentId} withdrawal #${opts.withdrawalId}`,
      referenceNumber: ref,
      transactionDate: now,
      recordedBy: opts.adminId ?? null,
      accountId: creditAccountId,
      entryType: "credit",
      createdAt: now,
    },
  ]);
}

/**
 * F-6.6 — Setoran tabungan umroh diterima.
 *
 * DEBIT : 1-1101 Kas (asset+)
 * CREDIT: 2-1103 Tabungan Umroh Jemaah (liability+)
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

  const [savingTx] = await db
    .select({ branchId: savingsTransactions.branchId, accountId: savingsTransactions.accountId })
    .from(savingsTransactions)
    .where(eq(savingsTransactions.id, opts.transactionId))
    .limit(1);
  let branchId = savingTx?.branchId ?? null;
  if (!branchId && savingTx?.accountId) {
    const [account] = await db
      .select({ branchId: savingsAccounts.branchId })
      .from(savingsAccounts)
      .where(eq(savingsAccounts.id, savingTx.accountId))
      .limit(1);
    branchId = account?.branchId ?? null;
  }
  branchId = await resolveTenantBranchId(branchId);

  const [debitAccountId, creditAccountId] = await Promise.all([
    getCoaId("1-1101"),
    getCoaId("2-1103"),
  ]);

  const now = new Date();
  await assertOpenAccountingPeriod(now);
  await db.insert(financialTransactions).values([
    {
      id: crypto.randomUUID(),
      bookingId: null,
      branchId,
      amount: String(opts.amount),
      type: "income",
      category: "savings_deposit",
      description: `[Auto] Setoran tabungan umroh — user ${opts.userId} txn #${opts.transactionId}`,
      referenceNumber: ref,
      transactionDate: now,
      recordedBy: opts.adminId ?? null,
      accountId: debitAccountId,
      entryType: "debit",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      bookingId: null,
      branchId,
      amount: String(opts.amount),
      type: "income",
      category: "savings_deposit",
      description: `[Auto] Setoran tabungan umroh — user ${opts.userId} txn #${opts.transactionId}`,
      referenceNumber: ref,
      transactionDate: now,
      recordedBy: opts.adminId ?? null,
      accountId: creditAccountId,
      entryType: "credit",
      createdAt: now,
    },
  ]);
}

/**
 * F-6.7 — Tabungan umroh digunakan untuk booking.
 *
 * DEBIT : 2-1103 Tabungan Umroh Jemaah (liability— hapus kewajiban)
 * CREDIT: 4-1001 Pendapatan Paket Umroh (revenue+)
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

  await recordDoubleEntry({
    bookingId: opts.bookingId,
    amount: opts.amount,
    debitCode: "2-1103",  // Tabungan Umroh Jemaah (hapus liability, debit)
    creditCode: "4-1001", // Pendapatan Paket Umroh (revenue+)
    debitType: "income",
    creditType: "income",
    category: "savings_used",
    description: `[Auto] Tabungan digunakan untuk booking — txn #${opts.transactionId}`,
    referenceNumber: ref,
  });
}
