# Audit Layanan Chat

## Arsitektur yang ditemukan

Sistem memiliki dua stack chat aktif. Stack baru memakai `conversations` dan `conversation_messages`, dengan chat tamu, anggota, dan booking, endpoint `/api/chat/*`, inbox admin `/api/admin/conversations/*`, polling, Supabase Realtime, unread counters, assignment, dan status open/closed. Stack lama memakai tabel `chat_messages`, endpoint `/api/cms/chat-messages` dan `/api/admin/chats`, serta komponen `ChatBox` yang polling setiap lima detik.

## Temuan prioritas tinggi

1. **Dua stack chat berjalan bersamaan.** Chat publik/anggota baru dan inbox admin memakai stack baru, tetapi halaman admin lama dan chat berbasis booking masih memakai stack lama. Riwayat, unread, notifikasi, status, dan audit dapat terpecah.
2. **Endpoint legacy admin chat menerima `req.body` secara spread langsung.** Route `/api/admin/chats` membentuk insert dengan `...req.body`; ini berisiko menerima field yang tidak semestinya dan tidak memvalidasi panjang/format pesan secara eksplisit. Perlu schema Zod dan whitelist field.
3. **Payload inbox admin mengekspos `guest_token`.** Token ini dipakai untuk mengakses percakapan guest. Token seharusnya tidak dikirim ke frontend admin kecuali benar-benar diperlukan, dan idealnya di-hash atau diputar setelah kompromi.
4. **RLS terbaru tidak menyediakan SELECT untuk anon/guest.** Guest flow API masih memakai server DB, tetapi guest realtime langsung dari Supabase berpotensi tidak menerima event karena migration terakhir hanya memberi SELECT kepada `authenticated`. Perlu pengujian guest realtime dan kebijakan yang aman atau tetap gunakan server relay.
5. **Update metadata percakapan berpotensi dobel.** Migration membuat trigger untuk preview/unread, sementara endpoint admin reply juga mengubah `last_message_at`, preview, dan counters secara manual. Ini dapat menyebabkan counter bertambah dua kali atau konflik nilai.

## Temuan prioritas sedang

6. Listing inbox membatasi 100 data dan pagination backend ada, tetapi frontend hanya meminta `limit=100` tanpa kontrol pagination/infinite scroll.
7. Polling tetap berjalan bersamaan dengan Realtime: inbox 15 detik dan pesan 5 detik. Ini menambah beban database dan dapat menimbulkan race antara hasil polling dan event realtime.
8. Optimistic mark-read menghapus unread di UI walaupun request API gagal; state dapat menyesatkan sampai polling berikutnya.
9. Hook member tidak mendengarkan UPDATE message secara realtime, sehingga status `isRead`/centang pesan pengguna tidak selalu langsung berubah.
10. Endpoint admin `GET /:id/messages` tidak melakukan pengecekan keberadaan conversation secara eksplisit sebelum query pesan; hasil kosong dan 404 tidak dibedakan.
11. Assignment hanya menyimpan UUID admin tanpa nama/riwayat assignment. Belum terlihat audit trail assignment dan belum jelas pembatasan berdasarkan cabang.
12. Notifikasi dibuat untuk semua admin/staff pada pesan guest/member. Ini dapat menimbulkan spam ketika banyak admin aktif; belum ada deduplikasi atau notifikasi hanya untuk assignee.

## Temuan UX/operasional

13. Halaman baru menampilkan label campuran seperti `Chat Inbox`, `Member`, `Assign`, dan `Refresh`.
14. Ada dua pintu masuk admin: inbox terpadu baru dan halaman Chat Jamaah lama. User dapat bingung memilih tempat yang benar.
15. Guest menggunakan token di localStorage. Ini praktis untuk resume, tetapi akses siapa pun yang memperoleh token dapat mengambil alih percakapan guest.
16. Tidak terlihat dukungan attachment, template jawaban, SLA, pencarian berdasarkan booking code, transfer antar admin dengan alasan, atau export transcript.
17. Legacy chat melakukan polling lima detik dan fetch ulang setelah kirim; belum ada status read, presence, typing, atau notifikasi terpadu seperti stack baru.

## Rekomendasi urutan

### P0

Tetapkan stack baru sebagai satu-satunya sumber chat, migrasikan atau tampilkan riwayat legacy, matikan route/UI legacy secara bertahap, hapus guest_token dari payload inbox, dan putuskan satu sumber kebenaran untuk unread/preview (trigger database atau endpoint, bukan keduanya).

### P1

Tambahkan validasi Zod dan whitelist pada seluruh route chat, uji RLS guest/member/admin pada staging, tambahkan pagination/infinite scroll, kurangi polling ketika Realtime aktif, dan buat notifikasi hanya ke assignee atau kelompok bertugas.

### P2

Seragamkan UX Bahasa Indonesia, tambahkan SLA/status menunggu, assignment history, filter booking, template balasan, lampiran terkontrol, dan audit transcript.

## Kesimpulan

Fungsi dasar chat baru sudah cukup lengkap dan memiliki fondasi keamanan yang lebih baik daripada stack lama. Namun kondisi saat ini belum ideal untuk operasional karena **dual-stack** adalah risiko terbesar: percakapan dapat masuk ke jalur berbeda, sehingga admin bisa melihat inbox yang tidak lengkap dan pengguna menerima pengalaman yang tidak konsisten.

## Referensi kode

- `lib/db/src/schema/chat.ts`
- `lib/db/src/schema/contracts.ts`
- `artifacts/api-server/src/routes/chat.ts`
- `artifacts/api-server/src/routes/admin/conversations.ts`
- `artifacts/api-server/src/routes/admin/chats.ts`
- `artifacts/api-server/src/middlewares/chatAuth.ts`
- `artifacts/umroh-app/src/features/admin/hooks/useAdminInbox.ts`
- `artifacts/umroh-app/src/features/cms/components/ChatBox.tsx`
- `supabase/migrations/20260801000002_chat_rls_realtime.sql`
