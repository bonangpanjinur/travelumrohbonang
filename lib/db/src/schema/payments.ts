import {
  pgTable, text, integer, numeric, timestamp,
  index,
} from "drizzle-orm/pg-core";
import { bookings } from "./bookings";

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  paymentMethod: text("payment_method"),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  proofUrl: text("proof_url"),
  paymentType: text("payment_type"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_payments_booking_id").on(t.bookingId),
  index("idx_payments_status").on(t.status),
]);

export const paymentProofAccessLogs = pgTable("payment_proof_access_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  paymentId: text("payment_id").references(() => payments.id, { onDelete: "set null" }),
  context: text("context"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_payment_proof_logs_booking_id").on(t.bookingId),
  index("idx_payment_proof_logs_user_id").on(t.userId),
]);

export const financialTransactions = pgTable("financial_transactions", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  category: text("category").notNull(),
  type: text("type").notNull(),
  amount: numeric("amount").notNull(),
  description: text("description"),
  referenceNumber: text("reference_number"),
  transactionDate: timestamp("transaction_date", { withTimezone: true }),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_financial_transactions_booking_id").on(t.bookingId),
  index("idx_financial_transactions_type").on(t.type),
]);
