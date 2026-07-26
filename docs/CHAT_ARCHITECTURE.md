# Arsitektur Chat: Live Chat + AI Chatbot
> Rancangan A–Z · Vins Tour Travel

---

## Ringkasan Eksekutif

Sistem chat dibangun dalam dua lapisan yang terintegrasi:

| Lapisan | Fungsi |
|---------|--------|
| **AI Chatbot** | Menjawab semua pertanyaan jamaah (umroh, paket, visa, dokumen, atau topik umum) secara otomatis 24/7 menggunakan Gemini AI |
| **Live Chat ke Admin** | Percakapan real-time antara jamaah dan admin, dengan handoff otomatis dari bot jika pertanyaan butuh sentuhan manusia |

Visitor **tidak perlu login**. Cukup isi nama dan nomor HP, langsung bisa chat.

---

## 1. Database Schema

### Tabel baru: `chat_sessions`
```sql
CREATE TABLE chat_sessions (
  id            TEXT PRIMARY KEY,                -- nanoid
  visitor_name  TEXT NOT NULL,
  visitor_phone TEXT,
  visitor_email TEXT,
  user_id       TEXT,                            -- NULL jika anonim
  booking_id    TEXT REFERENCES bookings(id),    -- NULL jika belum booking
  status        TEXT NOT NULL DEFAULT 'bot',    -- 'bot' | 'human' | 'resolved'
  assigned_to   TEXT,                            -- admin user_id yang handle
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON chat_sessions(status);
CREATE INDEX ON chat_sessions(user_id);
```

### Extend tabel `chat_messages` (kolom baru)
```sql
ALTER TABLE chat_messages
  ADD COLUMN session_id   TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
  ADD COLUMN is_bot_reply BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN needs_human  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN metadata     JSONB;   -- untuk menyimpan intent, confidence, dll.
```

> **Catatan:** `booking_id` tetap ada untuk backward compat. Session anonim
> menggunakan `session_id` saja (booking_id NULL).

### Alur data
```
chat_sessions (1) ──────── (N) chat_messages
     │
     └── booking_id (opsional, diisi setelah booking teridentifikasi)
```

---

## 2. Backend API

### File struktur baru
```
artifacts/api-server/src/
├── routes/
│   ├── chat/
│   │   ├── index.ts          ← mount router publik
│   │   ├── session.ts        ← POST /api/chat/session (buat/resume)
│   │   └── message.ts        ← POST /api/chat/message (kirim pesan)
│   └── admin/
│       └── chats.ts          ← EXISTING, tambah endpoint baru
└── lib/
    ├── chatBot/
    │   ├── index.ts          ← BotEngine utama
    │   ├── geminiClient.ts   ← wrapper Gemini AI
    │   ├── systemPrompt.ts   ← prompt utama bot
    │   ├── intentRouter.ts   ← deteksi intent sebelum kirim ke AI
    │   └── contextBuilder.ts ← inject konteks dari DB (paket, FAQ, dll.)
    └── chatNotifier.ts       ← notif ke admin saat escalation
```

### Endpoint publik

#### `POST /api/chat/session`
Buat session baru atau resume berdasarkan `sessionToken` di localStorage.
```typescript
// Request
{ visitorName: string, visitorPhone?: string, sessionToken?: string }

// Response
{ sessionId: string, sessionToken: string, status: 'bot'|'human' }
```

#### `POST /api/chat/message`
Kirim pesan dari visitor. Bot langsung membalas kecuali status session = `'human'`.
```typescript
// Request
{ sessionId: string, sessionToken: string, message: string }

// Response (streaming SSE)
data: { type: 'bot_typing' }
data: { type: 'bot_chunk', content: '...' }      // streaming Gemini
data: { type: 'bot_done', isBotReply: true }
// ATAU jika eskalasi:
data: { type: 'escalated', message: 'Menghubungkan ke admin...' }
// ATAU jika status = 'human' (bot tidak aktif):
{ queued: true }   // pesan disimpan, admin yang balas
```

#### `GET /api/chat/messages?sessionId=xxx&token=xxx`
Ambil riwayat pesan (untuk reload halaman).

### Endpoint admin baru

#### `GET /api/admin/chats/sessions` 
List semua session dengan filter status + unread count.

#### `PATCH /api/admin/chats/sessions/:id`
```typescript
{ status: 'human'|'resolved', assignedTo?: string }
```

#### `POST /api/admin/chats/sessions/:id/message`
Admin kirim balasan ke session tertentu.

---

## 3. Bot Engine (BotEngine)

### Alur pemrosesan pesan

```
Pesan masuk dari visitor
        │
        ▼
  [IntentRouter]
  Apakah pesan berisi kode booking? → cek DB → inject ke konteks
  Apakah minta status dokumen?       → cek DB → inject ke konteks
  Apakah minta eskalasi manual?      → langsung escalate
        │
        ▼
  [ContextBuilder]
  Inject ke system prompt:
  - Info agen (nama, alamat, kontak)
  - Paket umroh aktif (dari DB)
  - FAQ dari CMS
  - Info booking visitor (jika ada)
        │
        ▼
  [Gemini AI – gemini-2.5-flash]
  generateContentStream() → streaming response
        │
        ▼
  Analisis jawaban:
  - confidence rendah? → needs_human = true
  - bot bilang "tidak tahu"? → escalate
  - bot minta data privat? → escalate
        │
  ┌─────┴─────┐
  │           │
 Bot          Escalate
 balas        → ubah status session = 'human'
              → notif admin (via DB + realtime)
```

### System Prompt (inti)

```
Kamu adalah asisten virtual untuk agen perjalanan umroh "{{NAMA_AGEN}}".
Kamu membantu calon jamaah dan jamaah yang sudah booking.

KEMAMPUAN KAMU:
- Menjawab pertanyaan seputar umroh: rukun, syarat, persiapan fisik & spiritual
- Menjelaskan paket umroh yang tersedia: {{DAFTAR_PAKET}}
- Info visa, dokumen, vaksin meningitis, mahram
- Estimasi biaya, jadwal keberangkatan
- Pertanyaan umum lainnya seputar perjalanan

ATURAN:
- Jawab dalam Bahasa Indonesia yang ramah dan santun
- Jika ditanya status booking, gunakan data yang disediakan di konteks
- Jika kamu tidak yakin atau pertanyaan butuh konfirmasi data internal,
  katakan: "Saya akan hubungkan kamu ke tim kami ya."
- JANGAN mengarang data harga atau jadwal yang tidak ada di konteks
- Jika ada pertanyaan di luar umroh, tetap bantu sebaik mungkin
  tapi arahkan kembali ke layanan agen jika relevan

KONTEKS SESI INI:
Nama visitor: {{VISITOR_NAME}}
{{BOOKING_CONTEXT}}
{{PAKET_AKTIF}}
{{FAQ_CONTEXT}}
```

---

## 4. Real-time (Supabase Realtime)

Menggantikan polling yang ada saat ini. Dua channel:

### Channel 1: `chat:session:{sessionId}` (untuk visitor)
Subscribe ke perubahan `chat_messages` dengan filter `session_id = xxx`.
Ketika admin balas → visitor langsung terima tanpa polling.

### Channel 2: `chat:admin` (untuk admin)
Subscribe ke perubahan `chat_sessions`.
Ketika ada session baru atau `status = 'human'` → badge unread langsung update.

### Implementasi di frontend

```typescript
// hooks/useChatRealtime.ts
import { supabaseAuth } from '@/shared/integrations/supabase/auth-client';

export function useChatMessages(sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Initial load
    apiFetch(`/api/chat/messages?sessionId=${sessionId}&token=${token}`)
      .then(({ data }) => setMessages(data));

    // Realtime subscription
    const channel = supabaseAuth
      .channel(`chat:session:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabaseAuth.removeChannel(channel); };
  }, [sessionId]);

  return messages;
}
```

> **Catatan:** Supabase Realtime memerlukan Row Level Security (RLS) dikonfigurasi
> agar channel publik bisa subscribe. Detail di bagian Konfigurasi Supabase.

### Fallback (jika Realtime tidak aktif)
Jika `VITE_SUPABASE_URL` tidak tersedia di dev, hook otomatis fallback ke
polling setiap 5 detik — tidak ada kode yang crash.

---

## 5. Frontend Components

### Struktur file baru
```
artifacts/umroh-app/src/
├── features/
│   └── chat/
│       ├── hooks/
│       │   ├── useChatSession.ts     ← buat/resume session, simpan token
│       │   ├── useChatMessages.ts    ← realtime messages hook
│       │   └── useSendMessage.ts     ← kirim + handle streaming SSE
│       ├── components/
│       │   ├── PublicChatWidget.tsx  ← FAB + panel chat (gantikan ChatBox lama)
│       │   ├── ChatBubble.tsx        ← satu pesan (bot/visitor/admin)
│       │   ├── ChatInput.tsx         ← input + tombol kirim
│       │   ├── BotTypingIndicator.tsx ← animasi "..." saat bot typing
│       │   └── WelcomeForm.tsx       ← form nama + HP sebelum mulai chat
│       └── index.ts
└── shared/
    └── components/
        └── common/
            └── GlobalFloatingWidgets.tsx  ← tambahkan PublicChatWidget di sini
```

### UX Flow Visitor

```
1. Visitor buka website
2. Lihat FAB chat di kanan bawah (lingkaran + ikon chat)
3. Klik → slide-up panel terbuka
4. Jika session belum ada → tampil WelcomeForm (nama + HP, opsional)
5. Isi form → session dibuat → bot menyapa otomatis
6. Visitor ketik pertanyaan → bot streaming jawaban
7. Jika eskalasi → muncul pesan "Tim kami akan segera membalas"
8. Admin balas → muncul real-time di panel visitor
```

### Tampilan panel chat

```
┌─────────────────────────────────┐
│ 🕌 Vins Tour Travel     [×]     │
│ ─────────────────────────────── │
│                                 │
│   [Bot] Halo Budi! Saya         │
│   asisten umroh Vins Tour.      │
│   Ada yang bisa dibantu? 10:01  │
│                                 │
│              Berapa biaya       │
│         paket Ramadan? [Budi]   │
│                                 │
│   [Bot] Paket Ramadan 2026      │
│   mulai dari Rp 45jt/orang...   │
│   ████░░░ (streaming)           │
│                                 │
│ ─────────────────────────────── │
│ [Ketik pesan...        ] [►]    │
└─────────────────────────────────┘
```

### Admin Panel (upgrade existing)

`AdminFloatingChat.tsx` dan `/admin/chats`:
- Tab **"Bot"** (session masih ditangani bot)
- Tab **"Butuh Admin"** (session yang di-escalate, dengan badge merah)
- Tab **"Selesai"**
- Realtime badge update saat ada session baru masuk
- Tombol **"Ambil Alih"** → ubah status session ke `human`
- Tombol **"Selesai"** → ubah status ke `resolved`

---

## 6. Gemini AI Integration

Menggunakan **Replit AI Integrations** — **tidak butuh API key dari user**.
Biaya ditagih ke Replit credits.

### Setup (satu kali)
```javascript
// Di CodeExecution sandbox agent
await setupReplitAIIntegrations({ providerSlug: "gemini" });
// Otomatis set AI_INTEGRATIONS_GEMINI_BASE_URL + AI_INTEGRATIONS_GEMINI_API_KEY
```

### Model yang digunakan
- **`gemini-2.5-flash`** — untuk chat bot (cepat, hemat, cukup pintar)
- Streaming response untuk UX yang responsif

### Implementasi di server
```typescript
// lib/chatBot/geminiClient.ts
import { ai } from "@workspace/integrations-gemini-ai";

export async function streamBotReply(
  messages: { role: 'user' | 'model'; content: string }[],
  onChunk: (text: string) => void
): Promise<string> {
  let fullText = "";
  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    config: { maxOutputTokens: 8192 },
  });
  for await (const chunk of stream) {
    const text = chunk.text ?? "";
    fullText += text;
    onChunk(text);
  }
  return fullText;
}
```

---

## 7. Konfigurasi Supabase (Realtime)

Agar Supabase Realtime bisa subscribe ke `chat_messages` dari client publik,
perlu enable Realtime dan set RLS yang tepat di Supabase dashboard:

```sql
-- Enable realtime untuk tabel chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- RLS: visitor hanya bisa lihat pesan di session mereka sendiri
-- (validasi token dilakukan di level API, bukan RLS langsung)
-- Untuk simplicity di tahap awal: bisa pakai service role key di server
-- dan anon key + row filter di client
```

> Di dev (tanpa Supabase secrets): realtime tidak aktif → fallback ke polling.
> Di production: aktifkan secrets `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

---

## 8. Urutan Implementasi (Sprint)

### Sprint 1 — Fondasi (3–4 hari)
- [ ] Migrasi DB: tabel `chat_sessions` + kolom baru di `chat_messages`
- [ ] Setup Gemini AI Integration (Replit managed)
- [ ] Backend: `POST /api/chat/session` + `POST /api/chat/message` (tanpa streaming dulu)
- [ ] `BotEngine` dasar: system prompt + call Gemini + deteksi eskalasi

### Sprint 2 — Frontend Publik (2–3 hari)
- [ ] `PublicChatWidget.tsx`: FAB + panel + `WelcomeForm`
- [ ] `useChatSession` hook: buat/resume session dari localStorage
- [ ] `ChatBubble` + `ChatInput` + `BotTypingIndicator`
- [ ] Integrasikan ke `GlobalFloatingWidgets.tsx`

### Sprint 3 — Streaming + Realtime (2–3 hari)
- [ ] Upgrade endpoint ke SSE streaming
- [ ] `useSendMessage` hook: consume SSE stream → update bubble per chunk
- [ ] `useChatMessages` hook: Supabase Realtime + polling fallback
- [ ] Admin panel: realtime badge, tab status, tombol ambil alih

### Sprint 4 — Polish + Context (2 hari)
- [ ] `ContextBuilder`: inject paket aktif, FAQ, dan info booking ke prompt
- [ ] `IntentRouter`: shortcut untuk query status booking (tidak perlu AI)
- [ ] Admin notifikasi WhatsApp saat eskalasi (via Fonnte yang sudah ada)
- [ ] Rate limiting bot per session (maks 30 pesan/jam)

---

## 9. Hal yang Perlu Diputuskan Sebelum Build

| # | Pertanyaan | Dampak |
|---|------------|--------|
| 1 | Supabase Realtime aktif di production? | Jika tidak, pakai SSE dari Express saja |
| 2 | Bot balas dalam Bahasa Indonesia saja, atau bisa Inggris/Arab? | System prompt |
| 3 | Apakah admin dapat notif WhatsApp saat ada eskalasi? | `chatNotifier.ts` |
| 4 | Berapa lama history chat disimpan? | Data retention policy |
| 5 | Apakah visitor bisa upload foto/dokumen di chat? | Scope fase 1 atau fase 2 |

---

## 10. Diagram Lengkap

```
 VISITOR (Browser)                  EXPRESS API              SUPABASE DB
 ─────────────────                  ───────────              ───────────
 
 buka website
     │
     ▼
 PublicChatWidget
     │── POST /api/chat/session ──▶ buat chat_sessions row
     │◀─ { sessionId, token } ─────
     │
     │── POST /api/chat/message ──▶ simpan ke chat_messages
     │                              │
     │                              ▼
     │                          BotEngine
     │                              │
     │                              ├── IntentRouter
     │                              │   (cek keyword, query DB)
     │                              │
     │                              ├── ContextBuilder
     │                              │   (paket, FAQ, booking)
     │                              │
     │                              └── Gemini AI (streaming)
     │                                  │
     │◀── SSE stream chunks ────────────┘
     │    (bot typing + jawaban)
     │
     │   [jika eskalasi]
     │                              ubah session.status = 'human'
     │                              simpan chat_messages (bot reply)
     │
     │   Supabase Realtime ─────────────────────────────────────▶ ADMIN
     │   (chat_sessions INSERT/UPDATE)                           AdminFloatingChat
     │                                                               │
     │                                              admin klik "Ambil Alih"
     │                                              PATCH /api/admin/chats/sessions/:id
     │                                                               │
     │◀── Supabase Realtime ────────────────────────────────────────┘
     │   (chat_messages INSERT dari admin)
     │
     ▼
 Pesan admin muncul real-time
 di panel visitor
```

---

*Dokumen ini adalah rancangan. Implementasi dilakukan sprint per sprint.*
*File ini bisa diupdate saat ada perubahan keputusan arsitektur.*
