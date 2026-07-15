import {
  pgTable, text, integer, numeric, timestamp,
  index,
} from "drizzle-orm/pg-core";
import { bookings } from "./bookings";

// ── Installment Schedules ─────────────────────────────────────────────────────
// F-05: Auto-generated cicilan schedule for bookings with paymentScheme
// 'dp' | 'installment' | 'cicilan'.
// installmentNumber = 0 → DP; 1..n → monthly installments.
export const installmentSchedules = pgTable("installment_schedules", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  installmentNumber: integer("installment_number").notNull(), // 0=DP, 1..n=cicilan ke-n
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending | paid | overdue
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paymentGatewayOrderId: text("payment_gateway_order_id"), // VA/QRIS orderId jika dibayar via gateway
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_installment_schedules_booking_id").on(t.bookingId),
  index("idx_installment_schedules_due_date").on(t.dueDate),
  index("idx_installment_schedules_status").on(t.status),
]);

// ── Payment Gateway Transactions ─────────────────────────────────────────────
// P1-2: Stores all payment gateway transactions (Midtrans / Xendit).
// Created via /api/admin/payment-gateway/transactions endpoint.
export const paymentGatewayTransactions = pgTable("payment_gateway_transactions", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  gateway: text("gateway").notNull(),                  // midtrans | xendit
  orderId: text("order_id").notNull(),
  gatewayTransactionId: text("gateway_transaction_id"),
  amount: integer("amount").notNull(),
  paymentMethod: text("payment_method"),               // bank_transfer | qris
  bankCode: text("bank_code"),
  vaNumber: text("va_number"),
  status: text("status").notNull().default("pending"), // pending | paid | expired | cancelled | failed
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  expiryTime: timestamp("expiry_time", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  rawResponse: text("raw_response"),
  // F-05: links this gateway transaction to a specific installment (nullable)
  installmentScheduleId: text("installment_schedule_id"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
  index("idx_pgt_booking_id").on(t.bookingId),
  index("idx_pgt_status").on(t.status),
  index("idx_pgt_order_id").on(t.orderId),
]);

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  paymentMethod: text("payment_method"),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  // 'pending' | 'verified' | 'rejected'
  proofUrl: text("proof_url"),
  paymentType: text("payment_type"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
  // ── Audit fields (added Sprint 1) ─────────────────────────────────────────
  verifiedBy: text("verified_by"),              // admin userId who verified/rejected
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),   // set when status = 'rejected'
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
