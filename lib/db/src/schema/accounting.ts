/**
 * F-7: Chart of Accounts (CoA) + Buku Besar
 * F-10: Rekonsiliasi Bank — tabel bank_mutations
 */

import {
  pgTable, text, integer, boolean, timestamp, numeric, date,
  index,
} from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_coa_code").on(t.code),
  index("idx_coa_type").on(t.type),
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
  matchedTo: text("matched_to"),           // FK ke booking_payments.id (nullable)
  isMatched: boolean("is_matched").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_bank_mutations_date").on(t.mutationDate),
  index("idx_bank_mutations_is_matched").on(t.isMatched),
  index("idx_bank_mutations_bank_account").on(t.bankAccount),
]);
