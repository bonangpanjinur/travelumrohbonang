import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const contracts = pgTable("contracts", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  userId: text("user_id").notNull(),
  htmlContent: text("html_content"),
  signatureDataUrl: text("signature_data_url"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signerName: text("signer_name"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  senderId: text("sender_id"),
  senderRole: text("sender_role").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const refundRequests = pgTable("refund_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  bookingId: text("booking_id").notNull(),
  reason: text("reason"),
  amount: integer("amount"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  accountHolder: text("account_holder"),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  processedBy: text("processed_by"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
