# Arsitektur Fitur Chat Real-Time — Vins Tour Travel

> **Fokus:** Live chat antara Admin ↔ Jemaah (login) dan Admin ↔ Calon Jemaah (anonim/tamu)  
> **Bukan:** Chatbot otomatis — semua balasan dilakukan manual oleh admin manusia  
> **Real-time engine:** Supabase `postgres_changes` (sudah ada polanya di `useNotifications.ts`)

---

## 1. Analisis Codebase Existing

### ✅ Yang Sudah Ada

| Komponen | File | Status |
|---|---|---|
| DB: `chat_messages` | `lib/db/src/schema/contracts.ts` | Ada, tapi terikat `bookingId NOT NULL` |
| DB: `notifications` | `lib/db/src/schema/contracts.ts` | Ada, dipakai notif sistem |
| API: `GET/POST /api/admin/chats` | `artifacts/api-server/src/routes/admin/chats.ts` | Ada, booking-centric |
| API: `GET /api/cms/chat-messages` | routes CMS | Ada, booking-centric |
| UI Admin: `AdminFloatingChat.tsx` | `artifacts/umroh-app/src/features/admin/components/` | Ada, polling 15–20s |
| UI Admin: `Chats.tsx` (full page) | `artifacts/umroh-app/src/features/admin/pages/` | Ada, polling, booking-centric |
| UI User: `ChatBox.tsx` | `artifacts/umroh-app/src/features/cms/components/` | Ada, tempel di detail booking |
| Real-time pattern | `artifacts/umroh-app/src/shared/hooks/useNotifications.ts` | Ada, pakai `supabase.channel` + `postgres_changes` |
| Auth middleware | `artifacts/api-server/src/middlewares/authMiddleware.ts` | Ada, JWT Supabase + role resolution |

### ❌ Yang Belum Ada / Harus Dibuat Baru

| Kebutuhan | Keterangan |
|---|---|
| Chat tanpa booking | `chatMessages.bookingId` adalah NOT NULL FK — anonim/calon jemaah tidak punya booking |
| Percakapan mandiri (`conversations`) | Tabel percakapan universal — bisa dari booking, member, atau tamu |
| Session tamu (anonymous) | Guest token di `localStorage` untuk identifikasi tanpa akun |
| Real-time di chat | Chat saat ini polling 15–20s; harus pakai `postgres_changes` |
| UI chat untuk jemaah | Hanya ada `ChatBox` embed di booking detail, belum ada halaman chat mandiri |
| UI chat untuk tamu | Zero — tidak ada floating chat di halaman publik |
| Admin: unread badge real-time | Badge admin saat ini hitung manual dari polling, bukan real-time |
| Admin: inbox terpadu | Saat ini inbox hanya dari `bookingId`, tidak bisa lihat tamu |

### ⚠️ Yang Perlu Di-Refactor (Bukan Dihapus)

- `AdminFloatingChat.tsx` → panelnya diganti pakai sistem `conversations` baru, tapi UI-nya dipertahankan
- `Chats.tsx` (halaman admin) → diperluas jadi inbox terpadu (booking + member + tamu)
- `ChatBox.tsx` → tetap dipakai untuk konteks booking, tapi diupgrade pakai real-time

---

## 2. Peran & Identitas Pengguna

### 2.1 Admin
- **Siapa:** user dengan role `super_admin`, `admin`, `branch_manager`, `staff`
- **Akses:** Semua percakapan (tamu + jemaah + booking)
- **Identitas:** JWT Supabase (via middleware `authMiddleware`)
- **Label di chat:** "Admin" + nama admin (dari `profiles.name`)

### 2.2 Jemaah (Logged-in)
- **Siapa:** user dengan role `buyer` atau `user`, sudah punya akun Supabase
- **Akses:** Hanya percakapan miliknya sendiri
- **Identitas:** JWT Supabase
- **Label di chat:** Nama lengkap dari `profiles.name`
- **Skenario:** Sudah booking ATAU belum booking (bisa chat tanya info)

### 2.3 Calon Jemaah / Tamu (Anonymous)
- **Siapa:** Pengunjung website yang belum punya akun
- **Akses:** Hanya percakapan miliknya (diidentifikasi via `guest_token` di `localStorage`)
- **Identitas:** Guest token + nama + nomor HP (diisi saat pertama chat)
- **Label di chat:** Nama yang diinput + "(Tamu)"
- **Skenario:** Lihat paket → mau tanya → tidak mau daftar dulu

---

## 3. Desain Database Baru

### 3.1 Tabel `conversations` (BARU)

```sql
CREATE TABLE conversations (
  id              TEXT PRIMARY KEY,               -- crypto.randomUUID()
  type            TEXT NOT NULL,                  -- 'guest' | 'member' | 'booking'
  
  -- Identitas pengguna
  user_id         TEXT,                           -- NULL untuk tamu; references auth.users
  guest_name      TEXT,                           -- untuk tamu
  guest_phone     TEXT,                           -- untuk tamu
  guest_email     TEXT,                           -- opsional, untuk tamu
  guest_token     TEXT UNIQUE,                    -- localStorage token untuk re-identify tamu
  
  -- Konteks opsional
  booking_id      TEXT REFERENCES bookings(id),   -- NULL kecuali type='booking'
  
  -- Status
  status          TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'closed'
  assigned_admin_id TEXT,                         -- admin yang handle (optional)
  
  -- Preview & sorting
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,                      -- preview pesan terakhir (max 100 char)
  
  -- Unread counters
  unread_admin    INTEGER NOT NULL DEFAULT 0,     -- berapa pesan belum dibaca admin
  unread_user     INTEGER NOT NULL DEFAULT 0,     -- berapa pesan belum dibaca user/tamu
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_user_id      ON conversations(user_id);
CREATE INDEX idx_conversations_guest_token  ON conversations(guest_token);
CREATE INDEX idx_conversations_status       ON conversations(status);
CREATE INDEX idx_conversations_last_msg     ON conversations(last_message_at DESC);
```

### 3.2 Tabel `conversation_messages` (BARU)

```sql
CREATE TABLE conversation_messages (
  id                TEXT PRIMARY KEY,
  conversation_id   TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Pengirim
  sender_type       TEXT NOT NULL,    -- 'admin' | 'member' | 'guest'
  sender_id         TEXT,             -- user_id Supabase (null untuk tamu)
  sender_name       TEXT NOT NULL,    -- display name ("Admin Budi", "Ahmad", "Pak Hasan (Tamu)")
  
  -- Konten
  message           TEXT NOT NULL,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conv_messages_conv_id    ON conversation_messages(conversation_id);
CREATE INDEX idx_conv_messages_created_at ON conversation_messages(conversation_id, created_at ASC);
```

### 3.3 Tabel Existing — Dipertahankan

`chat_messages` tetap ada untuk backward compatibility (booking-specific chat lama).  
Fitur baru tidak menulis ke `chat_messages`. Migrasi data lama ke `conversations` adalah opsional (sprint terpisah jika dibutuhkan).

---

## 4. Desain UI/UX Per Peran

### 4.1 UI Admin — Inbox Terpadu (Full Page)

```
┌─────────────────────────────────────────────────────────────┐
│  💬 Chat Inbox                                    [Filter ▼] │
├──────────────────────────┬──────────────────────────────────┤
│  DAFTAR PERCAKAPAN       │  JENDELA CHAT                    │
│  ┌────────────────────┐  │                                  │
│  │ 🔴 Ahmad Fauzi (Tamu) │  ← Pilih dari kiri              │
│  │ "Harga paket reguler?" │                                 │
│  │ 14:32 • Belum dibaca  │  ┌──────────────────────────┐   │
│  ├────────────────────┤  │  │ Ahmad Fauzi (Tamu) 📞    │   │
│  │ 🔵 Siti Aminah     │  │  │ 0812-xxxx • Buka: 14:30  │   │
│  │ "Syaratnya apa aja?" │  │  ├──────────────────────────┤   │
│  │ 13:15 • 2 pesan baru│  │  │                          │   │
│  ├────────────────────┤  │  │  [14:30] Ahmad:           │   │
│  │ ✓  Booking #BK-001  │  │  │  "Harga paket reguler?" │   │
│  │ "Kapan berangkat?"  │  │  │                          │   │
│  │ Kemarin             │  │  │       [14:35] Admin Budi: │   │
│  ├────────────────────┤  │  │       "Harga mulai 25jt"  │   │
│  │ [Filter tabs:]      │  │  │                          │   │
│  │ Semua | Tamu | Member│  │  │  [14:36] Ahmad:          │   │
│  │ Booking | Belum Dibls│  │  │  "Ada cicilan?"          │   │
│  └────────────────────┘  │  │                          │   │
│                          │  └──────────────────────────┘   │
│                          │  ┌──────────────────────────┐   │
│                          │  │ [Ketik balasan...] [Kirim]│   │
│                          │  │ [Tutup Percakapan] [Assign]│  │
│                          │  └──────────────────────────┘   │
└──────────────────────────┴──────────────────────────────────┘
```

**Fitur admin full-page:**
- Tabs filter: Semua / Tamu / Member / Booking / Belum Dibalas
- Pencarian nama, no HP, kata kunci
- Label tipe percakapan (Tamu / Member / Booking)
- Info pengirim: nama, HP (jika tamu)
- Tombol "Tutup Percakapan" & "Assign ke saya"
- Real-time: pesan baru langsung muncul tanpa refresh

### 4.2 UI Admin — Floating Chat (FAB)

```
                          ┌─────────────────────────┐
                          │ 💬 Chat Inbox         [×]│
                          ├─────────────────────────┤
           Mode: List     │ [Cari percakapan...  🔄] │
                          │ ─────────────────────── │
                          │ 🔴 Ahmad Fauzi (Tamu)   │
                          │   "Ada cicilan?"  14:32  │
                          │ ─────────────────────── │
                          │ 🔵 Siti Aminah (Member) │
                          │   "Syarat dokumen?" 13:15│
                          │ ─────────────────────── │
                          │ ✓  BK-001 (Booking)     │
                          │   "Kapan berangkat?" Kmrn│
                          └─────────────────────────┘
                          ┌─────────────────────────┐
                          │ ← Ahmad Fauzi (Tamu) [×]│
                          │   📞 0812-xxxx           │
          Mode: Chat      ├─────────────────────────┤
                          │ Ahmad: "Ada cicilan?"    │
                          │             Admin: "Ada" │
                          ├─────────────────────────┤
                          │ [Balas...]       [Kirim] │
                          └─────────────────────────┘
                                         [💬 3]  ← FAB
```

### 4.3 UI Jemaah (Logged-in) — Halaman Chat

```
┌───────────────────────────────────────────────┐
│  💬 Chat dengan Admin                          │
│  Tanya apa saja seputar paket & keberangkatan │
├───────────────────────────────────────────────┤
│                                               │
│  Halo, Siti! 👋                               │
│  Admin kami siap membantu.                    │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │ [13:10] Siti:                          │   │
│  │ "Apakah bisa upgrade kamar?"          │   │
│  │                                        │   │
│  │              [13:15] Admin Budi:       │   │
│  │              "Bisa, silakan hubungi    │   │
│  │               kami H-30 sebelum       │   │
│  │               keberangkatan"          │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  ┌─────────────────────────────────┐ [Kirim] │
│  │ Ketik pesan...                  │         │
│  └─────────────────────────────────┘         │
└───────────────────────────────────────────────┘
```

**Akses via:**
- Menu user → "💬 Chat Admin"
- Atau tombol "Hubungi Admin" di halaman detail booking

### 4.4 UI Tamu / Calon Jemaah (Anonymous) — Floating Widget

**Step 1: FAB muncul di halaman publik**
```
                     ┌─────────────────────────┐
      Halaman Paket  │    [Tutup ×]            │
      /packages      │  💬 Ada pertanyaan?     │
      /packages/:id  │  Admin kami siap membantu│
      /home          │                         │
                     │  Sebelum mulai, isi dulu:│
                     │                         │
                     │  Nama *                 │
                     │  ┌─────────────────────┐│
                     │  │ Nama lengkap Anda   ││
                     │  └─────────────────────┘│
                     │  No. WhatsApp *         │
                     │  ┌─────────────────────┐│
                     │  │ 0812-xxxx-xxxx      ││
                     │  └─────────────────────┘│
                     │  Email (opsional)       │
                     │  ┌─────────────────────┐│
                     │  │ email@contoh.com    ││
                     │  └─────────────────────┘│
                     │  [Mulai Chat →]         │
                     └─────────────────────────┘
                                      [💬] ← FAB pojok kanan bawah
```

**Step 2: Setelah isi form → jendela chat terbuka**
```
                     ┌─────────────────────────┐
                     │ 💬 Chat dengan Admin [×]│
                     │ Ahmad Fauzi • Tamu      │
                     ├─────────────────────────┤
                     │                         │
                     │   [Hari ini, 14:30]     │
                     │                         │
                     │ Ahmad:                  │
                     │ "Harga paket reguler?"  │
                     │                         │
                     │         Admin Budi:     │
                     │  "Harga mulai 25 juta,  │
                     │   sudah termasuk ..."   │
                     │                         │
                     │ Ahmad:                  │
                     │ "Ada cicilan?"          │
                     │                  ·  ·  ·│ ← admin sedang mengetik
                     ├─────────────────────────┤
                     │ [Ketik pesan...]  [Send]│
                     └─────────────────────────┘
```

**Step 3: Jika tamu kembali lagi (tab/browser baru)**
- Token guest ada di `localStorage` → langsung masuk ke percakapan lama
- Tidak perlu isi form lagi

---

## 5. Arsitektur Teknis

### 5.1 Alur Real-Time (Supabase postgres_changes)

```
┌──────────────┐    POST /api/chat/...    ┌─────────────────┐
│  User/Guest  │ ───────────────────────► │  API Server     │
│  (Browser)   │                          │  (Express)      │
└──────────────┘                          └────────┬────────┘
       │                                           │ INSERT ke
       │                                           ▼
       │                                  ┌─────────────────┐
       │  Supabase Realtime               │   PostgreSQL    │
       │  postgres_changes                │  (Supabase)     │
       │  channel: conv_{id}              └────────┬────────┘
       │ ◄────────────────────────────────────────┘
       │  event: INSERT on conversation_messages
       ▼
  [Pesan langsung muncul di UI]


┌──────────────┐    Supabase Realtime     ┌──────────────────┐
│   Admin      │ ◄──────────────────────  │  admin_inbox     │
│  (Browser)   │  channel: admin_inbox    │  channel         │
└──────────────┘  filter: new INSERT on   └──────────────────┘
                  conversations /
                  conversation_messages
```

### 5.2 Guest Token Flow

```
Browser                     API Server              DB
  │                              │                   │
  │── GET localStorage ─────────►│                   │
  │   guest_token = null         │                   │
  │                              │                   │
  │── POST /api/chat/start ─────►│                   │
  │   { name, phone, email? }    │                   │
  │                              │─ INSERT conversations ─►│
  │                              │  type='guest'     │
  │                              │  guest_token=uuid │
  │◄─── { conversationId,        │◄──────────────────│
  │       guestToken }           │
  │                              │
  │── localStorage.set(token) ──►│
  │                              │
  │── (Selanjutnya semua req) ──►│
  │   Header: X-Guest-Token: xxx │
```

### 5.3 Struktur API Baru

```
# Chat publik (untuk jemaah & tamu)
POST   /api/chat/start                    # buat/resume percakapan
GET    /api/chat/conversations/:id        # info percakapan
GET    /api/chat/conversations/:id/messages  # ambil pesan
POST   /api/chat/conversations/:id/messages  # kirim pesan
PATCH  /api/chat/conversations/:id/read   # tandai sudah dibaca

# Chat admin (perlu auth admin)
GET    /api/admin/conversations           # daftar semua percakapan
GET    /api/admin/conversations/:id       # detail percakapan
GET    /api/admin/conversations/:id/messages
POST   /api/admin/conversations/:id/messages  # balas
PATCH  /api/admin/conversations/:id       # close / assign
```

### 5.4 Middleware Guest Auth

```typescript
// Pesan bisa dari 3 sumber:
// 1. JWT valid → AuthUser (jemaah login / admin)
// 2. X-Guest-Token header → GuestUser (tamu)
// 3. Keduanya tidak ada → 401

export const chatAuth = async (req, res, next) => {
  // Coba JWT dulu
  const bearer = req.headers.authorization?.replace('Bearer ', '');
  if (bearer) {
    // jalur existing authMiddleware
    return resolveAuthUser(bearer, req, res, next);
  }
  
  // Fallback ke guest token
  const guestToken = req.headers['x-guest-token'] as string;
  if (guestToken) {
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.guestToken, guestToken)
    });
    if (conv) {
      req.guestConversationId = conv.id;
      req.guestName = conv.guestName;
      return next();
    }
  }
  
  return res.status(401).json({ error: 'Unauthorized' });
};
```

---

## 6. Rencana Sprint

### Sprint 1 — Fondasi Database & API (Backend Only) ✅ SELESAI
**Selesai: 26 Juli 2026**

**Goal:** API siap, bisa diuji via curl/Postman. Belum ada UI baru.

**DB Changes:**
- [x] Tambah tabel `conversations` di `lib/db/src/schema/chat.ts` (file baru)
- [x] Tambah tabel `conversation_messages` di file yang sama
- [x] Export dari `lib/db/src/schema/index.ts`
- [x] Jalankan `pnpm drizzle-kit push` → tabel berhasil dibuat di PostgreSQL

**API:**
- [x] File baru: `artifacts/api-server/src/routes/chat.ts` (publik)
  - `POST /api/chat/start` → buat/resume conversation (guest atau member)
  - `GET /api/chat/conversations/:id/messages`
  - `POST /api/chat/conversations/:id/messages`
  - `PATCH /api/chat/conversations/:id/read`
- [x] File baru: `artifacts/api-server/src/routes/admin/conversations.ts`
  - `GET /api/admin/conversations` (dengan filter: type, status, unread)
  - `GET /api/admin/conversations/:id` (detail + member name)
  - `GET /api/admin/conversations/:id/messages`
  - `POST /api/admin/conversations/:id/messages` (balas)
  - `PATCH /api/admin/conversations/:id` (close, assign)
  - `PATCH /api/admin/conversations/:id/read` (reset unread_admin)
- [x] Middleware `artifacts/api-server/src/middlewares/chatAuth.ts` → JWT atau X-Guest-Token
- [x] Mount `/api/chat` di `artifacts/api-server/src/routes/index.ts`
- [x] Mount `/api/admin/conversations` di `artifacts/api-server/src/routes/admin/index.ts`

**Supabase Realtime:**
- [ ] Aktifkan `REPLICA IDENTITY FULL` pada tabel `conversation_messages` via SQL di Supabase dashboard
- [ ] Pastikan RLS policy di Supabase mengizinkan `postgres_changes` subscription (atau bypass via service role dari backend)
> ⚠️ Item Realtime membutuhkan akses Supabase Dashboard — perlu dilakukan manual oleh owner project

**Done criteria — semua terpenuhi ✅:**
- ✅ `POST /api/chat/start` tanpa token → dapat `conversationId` + `guestToken`
- ✅ `POST /api/chat/conversations/:id/messages` dengan `X-Guest-Token` → pesan tersimpan
- ✅ `GET /api/admin/conversations` tanpa JWT → 401 (protected); dengan JWT admin → data percakapan
- ✅ Resume session: `POST /api/chat/start` dengan token yang sama → `resumed: true`, ID sama

---

### Sprint 2 — Admin Inbox Full Page (UI Admin) ✅ SELESAI
**Selesai: 26 Juli 2026**

**Goal:** Admin bisa melihat dan membalas semua percakapan secara real-time di halaman `/admin/chat`.

**Hook baru:**
- [x] `artifacts/umroh-app/src/features/admin/hooks/useAdminInbox.ts`
  - Fetch percakapan via `GET /api/admin/conversations`
  - Subscribe Supabase realtime channel `admin_inbox` untuk INSERT baru di `conversation_messages` dan `conversations`
  - Update unread badge tanpa refresh

**Komponen baru:**
- [x] `artifacts/umroh-app/src/features/admin/pages/ChatInbox.tsx` (halaman baru)
  - Layout: dua kolom (list kiri, chat kanan)
  - Left panel: daftar percakapan dengan tabs filter (Semua / Tamu / Member / Belum Dibalas)
  - Left panel: search bar (nama, no HP, kata kunci pesan)
  - Left panel: badge merah untuk percakapan belum dibalas
  - Right panel: header (nama, tipe, info tamu: HP/email)
  - Right panel: scroll area pesan (bubble chat, timestamp, nama pengirim)
  - Right panel: input kirim + tombol Tutup Percakapan + Assign ke Saya
  - Pesan baru muncul real-time (supabase subscription)

**Routing:**
- [x] Tambah route `/admin/chat` di `App.tsx`
- [x] Route `/admin/chats` lama redirect ke `/admin/chat`
- [x] Update link sidebar admin ke `/admin/chat` (`adminMenuConfig.ts`)

**Done criteria:**
- ✅ Admin bisa melihat semua percakapan (tamu + jemaah + booking)
- ✅ Pesan baru dari user muncul di panel admin tanpa refresh (Supabase realtime)
- ✅ Admin bisa membalas dan pesan langsung terkirim
- ✅ TypeScript typecheck bersih

---

### Sprint 3 — Upgrade AdminFloatingChat (FAB Admin)
**Estimasi: 1–2 hari**

**Goal:** FAB chat di pojok kanan bawah admin diupgrade — pakai data dari sistem `conversations` baru (bukan `bookingId` lama), real-time badge.

**Perubahan di `AdminFloatingChat.tsx`:**
- [ ] Ganti fetch `GET /api/admin/chats` → `GET /api/admin/conversations`
- [ ] Ganti `ConversationList` agar tampilkan nama user/tamu (bukan bookingCode)
- [ ] Ganti `MiniChatBox` agar fetch dari `GET /api/admin/conversations/:id/messages`
- [ ] Kirim pesan via `POST /api/admin/conversations/:id/messages`
- [ ] Ganti polling 20s → Supabase realtime subscription untuk badge unread
- [ ] Tampilkan label tipe: "(Tamu)", "(Member)", "(Booking)"

**Done criteria:**
- FAB admin menampilkan percakapan tamu dan member, bukan hanya booking
- Badge unread update real-time tanpa polling

---

### Sprint 4 — Chat Widget Jemaah (Logged-in)
**Estimasi: 2–3 hari**

**Goal:** Jemaah yang sudah login bisa buka chat dengan admin — baik dari menu profil maupun dari halaman detail booking.

**Hook baru:**
- [ ] `artifacts/umroh-app/src/features/user/hooks/useMyChat.ts`
  - Buat atau ambil conversation milik user (type='member')
  - Subscribe real-time untuk pesan baru
  - Mark as read otomatis saat panel dibuka

**Komponen baru:**
- [ ] `artifacts/umroh-app/src/features/user/pages/ChatPage.tsx`
  - Header: "Chat dengan Admin"
  - Body: scroll area pesan, bubble kanan (milik user) / kiri (admin)
  - Input + kirim
  - Status: admin "Sedang Online" / "Biasanya membalas dalam 1 jam"

**Integrasi:**
- [ ] Tambah menu "💬 Chat Admin" di dashboard jemaah / sidebar user
- [ ] Tambah tombol "Hubungi Admin" di halaman `MyBookings` → buka halaman chat
- [ ] Pastikan `senderName` tampil nama dari `profiles.name`

**Done criteria:**
- Jemaah login bisa buka halaman chat dan kirim pesan
- Pesan admin muncul real-time tanpa refresh
- Nama jemaah (bukan ID) tampil di sisi admin

---

### Sprint 5 — Chat Widget Tamu / Calon Jemaah (Anonymous)
**Estimasi: 3–4 hari**

**Goal:** Pengunjung biasa (belum punya akun) bisa mulai chat dari halaman publik — paket, home, dsb.

**Hook baru:**
- [ ] `artifacts/umroh-app/src/shared/hooks/useGuestChat.ts`
  - Cek `localStorage` untuk `guest_token`
  - Jika ada → langsung resume conversation
  - Jika tidak ada → tampilkan form identitas
  - Subscribe real-time untuk pesan baru

**Komponen baru:**
- [ ] `artifacts/umroh-app/src/shared/components/chat/GuestChatWidget.tsx`
  - FAB (floating action button) di pojok kanan bawah
  - State 1: Panel form identitas (nama*, no HP*, email opsional)
  - State 2: Panel chat (jendela pesan + input kirim)
  - State 3: Collapsed (hanya FAB dengan badge jika ada pesan masuk)
  - Guest token disimpan ke `localStorage('vins_guest_chat_token')`
  - Animasi buka/tutup smooth

**Integrasi:**
- [ ] Render `GuestChatWidget` di:
  - `TenantClassicTemplate.tsx`
  - `TenantModernTemplate.tsx`
  - `TenantPremiumTemplate.tsx`
  - Halaman publik lain (packages list, packages detail)
- [ ] Jangan render jika user sudah login (tampilkan `useMyChat` versi jemaah)

**Done criteria:**
- Tamu bisa isi nama + HP → mulai chat
- Jika buka browser lagi → chat lama muncul kembali (via localStorage token)
- Pesan admin muncul real-time
- Admin dapat melihat nama + HP tamu di inbox

---

### Sprint 6 — Polish, Notifikasi & Edge Cases
**Estimasi: 2–3 hari**

**Goal:** Sistem chat siap production — UX lengkap, edge case tertangani.

**Notifikasi admin:**
- [ ] Saat tamu/jemaah kirim pesan baru → INSERT ke tabel `notifications` untuk semua admin (gunakan fungsi notifikasi existing)
- [ ] Browser notification (Notification API) jika admin di tab lain

**UX Polish:**
- [ ] Timestamp format: "Baru saja", "5 menit lalu", "Kemarin 14:30", tanggal lengkap (gunakan `date-fns`)
- [ ] Pesan terkirim → tanda centang ✓ (sent) / ✓✓ (delivered/read)
- [ ] Typing indicator ("Admin sedang mengetik...") — opsional via Supabase presence
- [ ] Mobile responsive: widget tamu full-screen di HP
- [ ] Empty state: "Belum ada percakapan — mulai chat sekarang!"
- [ ] Error state: "Gagal memuat pesan, coba lagi"

**Admin Quality of Life:**
- [ ] Auto-scroll ke pesan terbaru saat panel dibuka
- [ ] Shortcut keyboard: Enter untuk kirim, Shift+Enter untuk baris baru
- [ ] Tandai semua sudah dibaca saat conversation dibuka
- [ ] Cari percakapan by kata kunci (search across messages)

**Auto-close (opsional):**
- [ ] Cron job: percakapan `open` yang tidak ada pesan > 7 hari → otomatis `closed`
- [ ] Admin bisa buka kembali percakapan yang sudah closed

**Done criteria:**
- Tidak ada polling tersisa (semua real-time atau on-demand)
- Nama pengirim selalu tampil (bukan ID)
- Widget tamu works di mobile
- Admin inbox terasa seperti WhatsApp Web ringan

---

## 7. Urutan Implementasi & Dependensi

```
Sprint 1 (DB + API)
      │
      ├──► Sprint 2 (Admin Full Page)    ← depends on Sprint 1
      │         │
      │         └──► Sprint 3 (FAB Upgrade)  ← depends on Sprint 1 & 2
      │
      ├──► Sprint 4 (Jemaah Widget)      ← depends on Sprint 1
      │
      └──► Sprint 5 (Tamu Widget)        ← depends on Sprint 1
                │
                └──► Sprint 6 (Polish)   ← depends on Sprint 2–5
```

Sprint 2, 4, dan 5 bisa paralel setelah Sprint 1 selesai.

---

## 8. Catatan Teknis Penting

### 8.1 Supabase Realtime — Harus Diaktifkan Manual
Supabase Realtime `postgres_changes` butuh:
1. `REPLICA IDENTITY FULL` pada tabel target
2. Table masuk dalam Replication di Supabase Dashboard (Settings → Replication)
3. RLS policy mengizinkan SELECT (atau gunakan service role key dari server)

```sql
-- Jalankan di Supabase SQL Editor setelah push schema
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE conversation_messages REPLICA IDENTITY FULL;
```

### 8.2 Pola Subscription (sama dengan useNotifications.ts)

```typescript
// useGuestChat.ts / useMyChat.ts
const channel = supabase
  .channel(`conv_${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'conversation_messages',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    setMessages(prev => [...prev, payload.new as ConversationMessage]);
  })
  .subscribe();

return () => supabase.removeChannel(channel);
```

### 8.3 Admin Inbox Subscription

```typescript
// useAdminInbox.ts — dengarkan semua percakapan baru
const channel = supabase
  .channel('admin_inbox')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'conversations',
  }, (payload) => {
    // Tambah percakapan baru ke daftar
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'conversations',
  }, (payload) => {
    // Update last_message_preview, unread_admin
  })
  .subscribe();
```

### 8.4 Tidak Menggunakan WebSocket Custom
Tidak perlu Socket.io atau WebSocket server sendiri. Supabase Realtime sudah cukup dan polanya sudah proven di codebase (useNotifications.ts). Ini meminimalkan infrastruktur baru.

### 8.5 Backward Compatibility
- Tabel `chat_messages` lama TIDAK dihapus
- Halaman admin `Chats.tsx` di-refactor menjadi `ChatInbox.tsx` (route baru `/admin/chat`)
- Route `/admin/chats` (lama) bisa redirect ke `/admin/chat` (baru)

---

## 9. File Summary — Apa Yang Dibuat vs Diubah

### File Baru (Dibuat dari Nol)
```
lib/db/src/schema/chat.ts                          # schema conversations + conversation_messages
artifacts/api-server/src/routes/chat.ts            # API publik (guest + member)
artifacts/api-server/src/routes/admin/conversations.ts  # API admin
artifacts/api-server/src/middlewares/chatAuth.ts   # guest token middleware
artifacts/umroh-app/src/features/admin/hooks/useAdminInbox.ts
artifacts/umroh-app/src/features/admin/pages/ChatInbox.tsx   # halaman admin baru
artifacts/umroh-app/src/features/user/hooks/useMyChat.ts
artifacts/umroh-app/src/features/user/pages/ChatPage.tsx     # halaman jemaah
artifacts/umroh-app/src/shared/hooks/useGuestChat.ts
artifacts/umroh-app/src/shared/components/chat/GuestChatWidget.tsx  # widget tamu
artifacts/umroh-app/src/shared/components/chat/ConversationPanel.tsx # shared panel
artifacts/umroh-app/src/shared/components/chat/MessageBubble.tsx     # shared bubble
```

### File Dimodifikasi
```
lib/db/src/index.ts                                # export schema baru
artifacts/api-server/src/index.ts                  # mount route baru
artifacts/umroh-app/src/App.tsx                    # tambah route /admin/chat, /chat
artifacts/umroh-app/src/features/admin/components/AdminFloatingChat.tsx  # upgrade Sprint 3
artifacts/umroh-app/src/features/admin/components/AdminLayout.tsx        # tambah link Chat
artifacts/umroh-app/src/features/tenant/components/TenantClassicTemplate.tsx   # embed GuestChatWidget
artifacts/umroh-app/src/features/tenant/components/TenantModernTemplate.tsx    # embed GuestChatWidget
artifacts/umroh-app/src/features/tenant/components/TenantPremiumTemplate.tsx   # embed GuestChatWidget
```

### File Tidak Diubah (Backward Compat)
```
lib/db/src/schema/contracts.ts                     # chatMessages lama tetap ada
artifacts/api-server/src/routes/admin/chats.ts     # endpoint lama tetap berjalan
artifacts/umroh-app/src/features/cms/components/ChatBox.tsx  # tetap dipakai di booking detail
artifacts/umroh-app/src/features/admin/pages/Chats.tsx       # nanti bisa redirect
```
