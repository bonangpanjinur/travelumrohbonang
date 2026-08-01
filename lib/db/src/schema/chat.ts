/**
 * Chat schema — Sprint 1 (chat_architecture.md)
 *
 * Two new tables:
 *  - conversations  : one row per chat thread (guest | member | booking)
 *  - conversation_messages : individual messages inside a conversation
 *
 * The old `chat_messages` table is NOT touched — it remains for backward
 * compatibility with the booking-specific chat flow.
 */

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import { bookings } from "./bookings";

// ── conversations ─────────────────────────────────────────────────────────────

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),                         // crypto.randomUUID()
    type: text("type").notNull(),                        // 'guest' | 'member' | 'booking'

    // User identity
    userId: uuid("user_id"),                             // NULL for guests; Supabase auth.users id
    guestName: text("guest_name"),
    guestPhone: text("guest_phone"),
    guestEmail: text("guest_email"),
    guestToken: text("guest_token").unique(),            // localStorage token to re-identify guest

    // Optional booking context
    bookingId: text("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),

    // Status
    status: text("status").notNull().default("open"),    // 'open' | 'closed'
    assignedAdminId: uuid("assigned_admin_id"),

    // Preview & sorting
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessagePreview: text("last_message_preview"),    // max 100 chars

    // Unread counters
    unreadAdmin: integer("unread_admin").notNull().default(0),
    unreadUser: integer("unread_user").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_conversations_user_id").on(t.userId),
    index("idx_conversations_guest_token").on(t.guestToken),
    index("idx_conversations_status").on(t.status),
    index("idx_conversations_last_msg").on(t.lastMessageAt),
  ],
);

// ── conversation_messages ─────────────────────────────────────────────────────

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),

    // Sender
    senderType: text("sender_type").notNull(),           // 'admin' | 'member' | 'guest'
    senderId: uuid("sender_id"),                         // Supabase user_id (null for guests)
    senderName: text("sender_name").notNull(),           // display name

    // Content
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_conv_messages_conv_id").on(t.conversationId),
    index("idx_conv_messages_created_at").on(t.conversationId, t.createdAt),
  ],
);
