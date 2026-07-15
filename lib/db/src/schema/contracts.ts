import {
  pgTable, text, integer, boolean, timestamp,
  index,
} from "drizzle-orm/pg-core";
import { bookings } from "./bookings";

export const contracts = pgTable("contracts", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),        // references auth.users — no local FK
  htmlContent: text("html_content"),
  signatureDataUrl: text("signature_data_url"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signerName: text("signer_name"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_contracts_booking_id").on(t.bookingId),
  index("idx_contracts_user_id").on(t.userId),
]);

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  senderId: text("sender_id"),
  senderRole: text("sender_role").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_chat_messages_booking_id").on(t.bookingId),
]);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),        // references auth.users — no local FK
  title: text("title").notNull(),
  message: text("message"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_notifications_user_id").on(t.userId),
  index("idx_notifications_user_is_read").on(t.userId, t.isRead),
]);

export const refundRequests = pgTable("refund_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),        // references auth.users — no local FK
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
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
}, (t) => [
  index("idx_refund_requests_booking_id").on(t.bookingId),
  index("idx_refund_requests_user_id").on(t.userId),
]);
