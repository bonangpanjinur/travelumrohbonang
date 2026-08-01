# Analisis & Rencana Perbaikan Live Chat

## Temuan (terverifikasi dari kode)

**1. Realtime chat tidak pernah aktif (penyebab utama "pesan tidak muncul")**
`supabase/migrations/20260727000007_add_conversations_tables.sql` membuat tabel `conversations` dan `conversation_messages`, tetapi **tanpa** `ENABLE ROW LEVEL SECURITY`, tanpa `GRANT`, dan tanpa `ALTER PUBLICATION supabase_realtime ADD TABLE`. Sementara `useGuestChat.ts`, `useMyChat.ts`, dan `useAdminInbox.ts` semuanya subscribe `postgres_changes` ke kedua tabel itu. Tanpa keanggotaan publication + grant/RLS, subscription tidak pernah menerima event.

**2. Tamu & jemaah tidak punya fallback**
`sendMessage()` di `useGuestChat.ts` dan `useMyChat.ts` hanya POST ke API dan mengandalkan realtime untuk menambahkan pesan ke layar ("Realtime subscription will append the message"). Tidak ada optimistic update maupun polling. Akibatnya pesan yang dikirim tamu/jemaah baru terlihat setelah reload, dan balasan admin tidak pernah masuk secara live. Sisi admin (`useAdminInbox`) sudah punya polling 15 detik sehingga terlihat "hanya admin yang jalan".

**3. Dua sistem chat admin berjalan paralel dan yang lama rusak**
- `/admin/chat` → `ChatInbox` + tabel `conversations` (sistem baru).
- `/admin/chats` → di-redirect, tapi komponen lama masih dipakai: `features/admin/pages/Chats.tsx` memakai `c.booking_id` / `selected?.booking_id` padahal API mengembalikan camelCase `bookingId` → key React undefined dan pemilihan percakapan tidak pernah cocok.
- `features/cms/components/ChatBox.tsx` membandingkan `m.sender_id === user?.id` padahal field-nya `senderId` → semua gelembung pesan tampil di sisi kiri (seolah bukan pesan sendiri). ChatBox juga tidak punya refresh otomatis sama sekali.

**4. Query admin lama menyebabkan 500**
Log `attached_assets/Pasted--admin-conversations-GET-...` menunjukkan `LEFT JOIN profiles p ON p.id = c.user_id` (uuid vs text). Sumber saat ini sudah diperbaiki menjadi `p.id::text = c.user_id`, jadi ini tinggal masalah build lama yang ter-deploy — perlu redeploy, bukan perubahan kode.

## Rencana Perbaikan

### Tahap 1 — Database (akar masalah)
Migrasi baru yang idempoten:
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` pada `conversations` dan `conversation_messages`.
- `GRANT SELECT` ke `authenticated` (+ `anon` khusus untuk realtime tamu), `GRANT ALL` ke `service_role` (API server memakai service role, jadi tulis tetap lewat backend).
- Policy SELECT: member hanya percakapan miliknya (`user_id = auth.uid()::text`), admin lewat `is_admin(auth.uid())`, pesan mengikuti kepemilikan percakapan induknya.
- `ALTER PUBLICATION supabase_realtime ADD TABLE conversations, conversation_messages` (dibungkus cek agar aman diulang).
- `REPLICA IDENTITY FULL` pada kedua tabel agar payload realtime lengkap.

Catatan: tamu (anon) tidak bisa difilter oleh RLS berbasis `auth.uid()`. Untuk tamu, realtime tetap tidak akan dipercaya sebagai satu-satunya jalur — Tahap 2 menutupinya.

### Tahap 2 — Fallback yang membuat chat selalu jalan
- `useGuestChat.ts` dan `useMyChat.ts`: tambahkan **optimistic append** setelah kirim (pakai respons `data` dari API, dedupe by id) dan **polling ringan** setiap 5 detik saat panel chat terbuka, berhenti saat ditutup/tab tidak aktif.
- Dedupe tetap dipertahankan agar tidak dobel ketika realtime akhirnya aktif.

### Tahap 3 — Bereskan sistem chat lama
- Perbaiki `ChatBox.tsx`: gunakan `senderId`/`createdAt` camelCase, tambah polling saat terbuka.
- Perbaiki `Chats.tsx`: gunakan `bookingId` untuk key dan perbandingan seleksi.
- Alternatif yang direkomendasikan: pensiunkan halaman lama sepenuhnya dan arahkan semua ke `/admin/chat` agar tidak ada dua sumber kebenaran. Perlu keputusan Anda.

### Tahap 4 — Verifikasi
- Uji alur: tamu kirim pesan → muncul di inbox admin < 5 detik; admin balas → muncul di widget tamu dan halaman `/chat` jemaah tanpa reload; hitungan belum dibaca kembali nol setelah dibuka.
- Cek console tanpa error langganan realtime.

## Detail teknis
File yang akan diubah: satu migrasi SQL baru di `supabase/migrations/`, `artifacts/umroh-app/src/shared/hooks/useGuestChat.ts`, `artifacts/umroh-app/src/features/user/hooks/useMyChat.ts`, `artifacts/umroh-app/src/features/cms/components/ChatBox.tsx`, `artifacts/umroh-app/src/features/admin/pages/Chats.tsx`. Tidak ada perubahan pada kontrak API `/api/chat/*` maupun `/api/admin/conversations`.
