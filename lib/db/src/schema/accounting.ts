/**
 * F-7: Chart of Accounts (CoA) + Buku Besar
 * F-10: Rekonsiliasi Bank — tabel bank_mutations
 * F1-05: Accounting Periods (period locking)
 */

import {
  pgTable, text, integer, boolean, timestamp, numeric, date,
  index, unique,
} from "drizzle-orm/pg-core";
import { bookingPayments } from "./bookings";

// ── Chart of Accounts ─────────────────────────────────────────────────────────
// Kode akun standar akuntansi. Format kode: {type_digit}-{seq4}
// type: 1=asset, 2=liability, 3=equity, 4=revenue, 5=expense
export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),          // misal: 1-1101 (Kas), 4-1001 (Pendapatan Umroh)
  name: text("name").notNull(),
  type: text("type").notNull(),          // asset | liability | equity | revenue | expense
  category: text("category"),           // sub-grouping (mis: kas, piutang, utang-jangka-pendek)
  normalBalance: text("normal_balance"), // debit | credit  (asset/expense=debit, liability/equity/revenue=credit)
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  branchId: text("branch_id"), // NULL = akun global; terisi untuk branch tenant
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_coa_code").on(t.code),
  index("idx_coa_type").on(t.type),
  index("idx_coa_branch_id").on(t.branchId),
]);

// ── Bank Mutations ────────────────────────────────────────────────────────────
// F-10: Import mutasi rekening koran bank
export const bankMutations = pgTable("bank_mutations", {
  id: text("id").primaryKey(),
  mutationDate: date("mutation_date").notNull(),
  description: text("description"),
  amount: integer("amount").notNull(),     // positif = kredit (masuk), negatif = debit (keluar)
  balance: integer("balance"),             // saldo setelah mutasi
  refNumber: text("ref_number"),           // no referensi dari bank
  bankAccount: text("bank_account"),       // nama/nomor rekening
  bankName: text("bank_name"),             // BCA | Mandiri | BNI | BRI
  matchedTo: text("matched_to").references(() => bookingPayments.id, { onDelete: "set null" }), // F2-04: FK ke booking_payments.id (nullable, unique via migration)
  isMatched: boolean("is_matched").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_bank_mutations_date").on(t.mutationDate),
  index("idx_bank_mutations_is_matched").on(t.isMatched),
  index("idx_bank_mutations_bank_account").on(t.bankAccount),
]);

// ── Accounting Periods ────────────────────────────────────────────────────────
// F1-05: Kunci periode akuntansi — transaksi pada periode closed ditolak.
// Status: 'open' (masih bisa ditransaksikan) | 'closed' (dikunci)
export const accountingPeriods = pgTable("accounting_periods", {
  id: text("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),  // 1-12
  status: text("status").notNull().default("open"), // open | closed
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedBy: text("closed_by"),        // admin userId yang menutup periode
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  unique("uq_accounting_periods_year_month").on(t.year, t.month),
  index("idx_accounting_periods_status").on(t.status),
]);
