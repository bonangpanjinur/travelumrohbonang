import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  paymentMethod: text("payment_method"),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  proofUrl: text("proof_url"),
  paymentType: text("payment_type"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const paymentProofAccessLogs = pgTable("payment_proof_access_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  bookingId: text("booking_id"),
  paymentId: text("payment_id"),
  context: text("context"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
