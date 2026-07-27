-- ============================================================
-- Fix: tambah tabel conversations dan conversation_messages
-- Tabel ini ada di Drizzle schema (lib/db/src/schema/chat.ts)
-- tapi belum pernah di-migrate ke production, menyebabkan
-- GET /api/admin/conversations → 500
-- ============================================================

-- ── conversations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                   text        PRIMARY KEY,
  type                 text        NOT NULL,                        -- 'guest' | 'member' | 'booking'

  -- User identity
  user_id              text,                                        -- NULL untuk guest
  guest_name           text,
  guest_phone          text,
  guest_email          text,
  guest_token          text        UNIQUE,                          -- localStorage token untuk re-identify guest

  -- Konteks booking (opsional)
  booking_id           text        REFERENCES bookings(id) ON DELETE SET NULL,

  -- Status
  status               text        NOT NULL DEFAULT 'open',         -- 'open' | 'closed'
  assigned_admin_id    text,

  -- Preview & sorting
  last_message_at      timestamptz,
  last_message_preview text,                                        -- max 100 chars

  -- Unread counters
  unread_admin         integer     NOT NULL DEFAULT 0,
  unread_user          integer     NOT NULL DEFAULT 0,

  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id    ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_guest_token ON conversations (guest_token);
CREATE INDEX IF NOT EXISTS idx_conversations_status     ON conversations (status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg   ON conversations (last_message_at);

-- ── conversation_messages ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_messages (
  id               text        PRIMARY KEY,
  conversation_id  text        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Pengirim
  sender_type      text        NOT NULL,   -- 'admin' | 'member' | 'guest'
  sender_id        text,                   -- Supabase user_id (null untuk guest)
  sender_name      text        NOT NULL,   -- nama tampilan

  -- Konten
  message          text        NOT NULL,
  is_read          boolean     NOT NULL DEFAULT false,

  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_conv_id    ON conversation_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_created_at ON conversation_messages (conversation_id, created_at);
