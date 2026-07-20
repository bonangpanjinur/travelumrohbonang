/**
 * Umroh Tabungan (Savings) Schema
 *
 * savings_accounts  — rekening tabungan per jamaah
 * savings_transactions — setiap mutasi saldo (deposit, penarikan, booking payment, refund)
 */

import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// We intentionally skip FK to profiles (uuid vs text type mismatch risk)
// and to packages to avoid circular imports; references are enforced at app level.

export const savingsAccounts = pgTable("savings_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),                      // → profiles.id
  targetPackageId: text("target_package_id"),             // → packages.id (optional)
  targetPackageName: text("target_package_name"),         // denormalized label
  targetAmount: integer("target_amount").notNull().default(0),
  currentBalance: integer("current_balance").notNull().default(0),
  status: text("status").notNull().default("active"),     // active | closed | withdrawn
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
  index("idx_savings_accounts_user_id").on(t.userId),
  index("idx_savings_accounts_status").on(t.status),
]);

export const savingsTransactions = pgTable("savings_transactions", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),                // → savingsAccounts.id
  amount: integer("amount").notNull(),                    // positive = kredit, negative = debit
  type: text("type").notNull(),                           // deposit | withdrawal | booking_payment | refund
  status: text("status").notNull().default("pending"),    // pending | verified | rejected
  proofUrl: text("proof_url"),
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  bookingId: text("booking_id"),                          // set when type = booking_payment
  recordedBy: text("recorded_by"),                        // admin id yang verifikasi
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_savings_tx_account_id").on(t.accountId),
  index("idx_savings_tx_status").on(t.status),
  index("idx_savings_tx_type").on(t.type),
]);
