# Rencana Perbaikan Menu Operasional
**Proyek:** Vinstour Travel — Platform Manajemen Umroh  
**Tanggal Analisis:** 18 Juli 2026  
**Dibuat oleh:** Replit Agent  

---

## Ringkasan Eksekutif

Analisis terhadap 6 sub-menu di bawah menu **Operasional** menemukan:

| Kategori | Jumlah |
|----------|--------|
| 🐛 Bug Aktif (langsung berdampak ke data/user) | 5 |
| ⚠️ Fitur Setengah Jadi / Risiko | 6 |
| ❌ Fitur Hilang (belum ada sama sekali) | 10 |

---

## Status Sprint

| Sprint | Status | Tanggal |
|--------|--------|---------|
| Sprint 1 — Bug Kritikal P1 | ✅ **SELESAI** | 18 Juli 2026 |
| Sprint 2 — Fitur Setengah Jadi P2 | ✅ **SELESAI** | 18 Juli 2026 |
| Sprint 3 — Fitur Baru P3 (export & dokumen) | ✅ **SELESAI** | 18 Juli 2026 |
| Sprint 4 — Fitur Tambahan P3 | ✅ **SELESAI** | 18 Juli 2026 |

---

## Daftar Prioritas Perbaikan

### 🔴 PRIORITAS 1 — Kritikal (Perbaiki Secepatnya)

> Bug yang menyebabkan data tidak tersimpan, akses tidak aman, atau informasi error hilang dari user.

---

#### P1-01 · Bug `birth_date` vs `birthDate` di Jemaah
- **Lokasi:** `artifacts/umroh-app/src/features/admin/pages/Pilgrims.tsx`
- **Masalah:** Form menggunakan key `birth_date` (snake_case) saat membaca, tapi payload yang dikirim ke API menggunakan `birthDate` (camelCase). Akibatnya data tanggal lahir jemaah **tidak tersimpan** ke database.
- **Dampak:** Data jemaah tidak lengkap, berpotensi menyebabkan masalah manifest dan dokumen perjalanan.
- **Langkah Perbaikan:**
  1. Audit semua field di form Jemaah — samakan konvensi naming (camelCase ke API).
  2. Pastikan `mapPilgrimFromApi` dan payload POST/PATCH konsisten.
  3. Tambahkan validasi di backend untuk field wajib.

---

#### P1-02 · Error Ditelan Diam-diam di Itinerary
- **Lokasi:** `artifacts/umroh-app/src/features/admin/pages/Itineraries.tsx` (sekitar baris `fetchData`)
- **Masalah:** Blok `catch` dibiarkan kosong dengan komentar *"Itinerary table may not exist on Supabase yet"*. Jika fetch gagal, user tidak mendapat notifikasi apapun — halaman terlihat kosong tanpa alasan.
- **Dampak:** Admin mengira tidak ada itinerary padahal ada error koneksi/DB.
- **Langkah Perbaikan:**
  1. Ganti empty catch dengan `toast.error(...)` yang informatif.
  2. Tambahkan state `isError` dan tampilkan UI error fallback.
  3. Hapus komentar placeholder — pastikan tabel sudah ada di DB.

---

#### P1-03 · Error Ditelan Diam-diam di Keberangkatan
- **Lokasi:** `artifacts/umroh-app/src/features/admin/pages/Departures.tsx` (baris ~98)
- **Masalah:** `fetchData` memiliki blok `catch` yang hanya menampilkan generic toast tanpa detail error, sehingga admin tidak tahu penyebab kegagalan.
- **Dampak:** Debugging sulit, admin tidak bisa bertindak tepat saat terjadi error.
- **Langkah Perbaikan:**
  1. Log error ke console dan tampilkan pesan error spesifik di toast.
  2. Tambahkan retry button pada UI jika fetch gagal.

---

#### P1-04 · Bypass Auth Middleware di Itinerary
- **Lokasi:** `artifacts/umroh-app/src/features/admin/pages/Itineraries.tsx`
- **Masalah:** Beberapa query langsung ke endpoint `/rest/v1/itineraries` (Supabase REST API), bukan melalui `/api/admin/...`. Endpoint Supabase REST tidak melewati middleware autentikasi Express yang mengecek role admin.
- **Dampak:** Potensi akses tidak sah ke data itinerary jika Supabase RLS tidak dikonfigurasi ketat.
- **Langkah Perbaikan:**
  1. Pindahkan semua query itinerary ke route `/api/admin/itineraries` di Express.
  2. Tambahkan middleware `requireAuth` + role check di route tersebut.
  3. Pastikan Supabase RLS tetap aktif sebagai lapisan kedua.

---

### 🟡 PRIORITAS 2 — Penting (Selesaikan dalam Sprint Berikutnya)

> Fitur setengah jadi yang menipu user atau validasi yang hilang.

---

#### P2-01 · Drag-and-Drop Itinerary Belum Diimplementasi
- **Lokasi:** `artifacts/umroh-app/src/features/admin/pages/Itineraries.tsx`
- **Masalah:** Icon `GripVertical` (drag handle) sudah ditampilkan di setiap baris hari itinerary, memberi kesan user bisa drag untuk mengurutkan — tapi fungsionalitasnya **belum ada**. Ini menipu user.
- **Dampak:** Ekspektasi user tidak terpenuhi, UX membingungkan.
- **Langkah Perbaikan:**
  1. Implementasi DnD menggunakan `@dnd-kit/core` (sudah umum di project React/Vite).
  2. Setelah drop, kirim PATCH ke API untuk update `sort_order` tiap hari.
  3. Atau: hapus icon `GripVertical` sementara sampai DnD siap.

---

#### P2-02 · Validasi Tanggal Keberangkatan Tidak Ada
- **Lokasi:** `artifacts/umroh-app/src/features/admin/pages/Departures.tsx`
- **Masalah:** Tidak ada validasi bahwa `return_date` harus setelah `departure_date`. Admin bisa menyimpan data dengan tanggal kembali lebih awal dari tanggal berangkat.
- **Dampak:** Data keberangkatan tidak valid, berdampak ke tampilan paket dan manifest.
- **Langkah Perbaikan:**
  1. Tambahkan validasi di form (sebelum submit).
  2. Tambahkan validasi di backend route `POST/PATCH /api/admin/departures`.

---

#### P2-03 · Print Manifest Tanpa CSS Khusus
- **Lokasi:** `artifacts/umroh-app/src/features/admin/pages/Manifest.tsx`
- **Masalah:** Tombol "Print" memanggil `window.print()` tanpa CSS `@media print` yang spesifik. Hasil cetak akan menyertakan navbar, sidebar, dan elemen UI lain yang tidak relevan.
- **Dampak:** Dokumen manifest tidak bisa langsung dipakai — berantakan saat dicetak.
- **Langkah Perbaikan:**
  1. Tambahkan `@media print` CSS: sembunyikan sidebar, navbar, tombol aksi.
  2. Atur ukuran font, margin, dan page break antar jemaah.
  3. Pertimbangkan generate PDF via backend (React-PDF / Puppeteer) untuk kualitas lebih baik.

---

#### P2-04 · Nomor Urut Manifest Melompat saat Filter Aktif
- **Lokasi:** `artifacts/umroh-app/src/features/admin/pages/Manifest.tsx`
- **Masalah:** `globalIndex` dihitung dari `page × MANIFEST_PAGE_SIZE + index`, tapi filtering terjadi di sisi client setelah data diambil. Jika ada filter aktif, nomor urut bisa melompat.
- **Dampak:** Manifest resmi dengan nomor urut tidak berurutan — tidak profesional.
- **Langkah Perbaikan:**
  1. Pindahkan filtering ke server-side (query param ke API).
  2. Hitung `globalIndex` dari total data terfilter, bukan data mentah.

---

#### P2-05 · Inkonsistensi Data Fetching (useQuery vs useEffect Manual)
- **Lokasi:** Seluruh halaman Operasional
- **Masalah:** Manifest menggunakan `useQuery` (TanStack Query), sementara semua halaman lain (Packages, Departures, Itineraries, Bookings, Pilgrims) menggunakan `useEffect` + `apiFetch` manual tanpa caching, loading state standar, atau retry otomatis.
- **Dampak:** Inkonsistensi membuat maintenance lebih sulit dan fitur (cache, refetch, stale) tidak merata.
- **Langkah Perbaikan:**
  1. Migrasi halaman-halaman tersebut ke `useQuery` / `useMutation` secara bertahap.
  2. Prioritaskan Bookings dan Pilgrims dulu (paling sering diakses).

---

### 🟢 PRIORITAS 3 — Peningkatan (Backlog)

> Fitur yang belum ada tapi dibutuhkan untuk operasional lengkap.

---

#### P3-01 · Export Manifest ke PDF
- **Sub-menu:** Manifest
- **Deskripsi:** Tambahkan tombol "Download PDF" yang menghasilkan file manifest siap cetak dengan format profesional (kop surat, QR code, tabel jemaah).
- **Teknologi Saran:** `@react-pdf/renderer` (sudah ada di project) atau endpoint backend dengan Puppeteer.

---

#### P3-02 · Kolom Status Dokumen di Manifest
- **Sub-menu:** Manifest
- **Deskripsi:** Tambahkan kolom status paspor, visa, dan vaksin per jemaah di halaman manifest agar petugas bisa langsung melihat kelengkapan dokumen.
- **Catatan:** Membutuhkan field baru di tabel `pilgrims` atau tabel `booking_documents`.

---

#### P3-03 · Import Jemaah Massal via CSV/Excel
- **Sub-menu:** Jemaah
- **Deskripsi:** Admin bisa upload file CSV/Excel untuk menambahkan banyak jemaah sekaligus, alih-alih input satu per satu.
- **Teknologi Saran:** Library `xlsx` atau `papaparse` di frontend + validasi batch di backend.

---

#### P3-04 · Upload Dokumen Jemaah (Paspor, Visa)
- **Sub-menu:** Jemaah
- **Deskripsi:** Setiap jemaah bisa memiliki dokumen terlampir (scan paspor, visa, sertifikat vaksin). Saat ini tidak ada manajemen dokumen sama sekali.
- **Catatan:** Butuh tabel `pilgrim_documents` dan integrasi object storage.

---

#### P3-05 · Filter Booking by Tanggal Keberangkatan
- **Sub-menu:** Booking
- **Deskripsi:** Tambahkan filter tanggal di halaman Booking agar admin bisa melihat booking berdasarkan jadwal keberangkatan tertentu.

---

#### P3-06 · Export Booking ke Excel
- **Sub-menu:** Booking
- **Deskripsi:** Tombol export untuk mendownload daftar booking (sesuai filter aktif) ke format Excel/CSV.

---

#### P3-07 · Bulk Aktivasi/Nonaktivasi Paket
- **Sub-menu:** Paket Umroh
- **Deskripsi:** Checkbox per baris + tombol "Aktifkan Semua" / "Nonaktifkan Semua" untuk manajemen paket massal.

---

#### P3-08 · Clone/Duplikasi Paket Umroh
- **Sub-menu:** Paket Umroh
- **Deskripsi:** Tombol "Duplikat" pada paket yang sudah ada untuk membuat paket baru dengan data yang sama (berguna untuk paket musiman yang berulang).

---

#### P3-09 · Status Keberangkatan (Buka/Tutup/Penuh)
- **Sub-menu:** Keberangkatan
- **Deskripsi:** Tambahkan status per keberangkatan yang otomatis berubah berdasarkan kapasitas terisi dari data booking.

---

#### P3-10 · Validasi Kapasitas Booking
- **Sub-menu:** Keberangkatan + Booking
- **Deskripsi:** Sistem otomatis menolak booking baru jika kapasitas keberangkatan sudah penuh, dengan notifikasi yang jelas ke admin dan jamaah.

---

## Timeline Rekomendasi

| Sprint | Prioritas | Item | Estimasi |
|--------|-----------|------|----------|
| Sprint 1 | 🔴 P1 | P1-01 s/d P1-04 | 3–5 hari |
| Sprint 2 | 🟡 P2 | P2-01 s/d P2-05 | 5–7 hari |
| Sprint 3 | 🟢 P3 | P3-01, P3-02, P3-03 (export & dokumen) | 5–7 hari |
| Sprint 4 | 🟢 P3 | P3-04 s/d P3-10 (fitur tambahan) | 7–10 hari |

---

## Catatan Teknis

- Semua perbaikan backend harus melalui route `/api/admin/...` dengan middleware `requireAuth`.
- Setiap perubahan skema DB harus diikuti dengan migrasi Drizzle (`drizzle-kit push`).
- Konsistensi naming: gunakan **camelCase** untuk semua payload API request/response; konversi di layer service/mapper.
- Target: migrasi semua halaman Operasional ke `useQuery` / `useMutation` sebelum Sprint 4.

---

*Dokumen ini akan diperbarui seiring progress perbaikan.*
