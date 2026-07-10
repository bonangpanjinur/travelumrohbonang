# UmrohPlus — Laporan Audit & Perbaikan (10 Juli 2026)

Dokumen ini merangkum hasil audit menyeluruh (kesiapan deploy, potensi error API,
menu admin + CRUD, dan fitur frontend publik) beserta apa yang **sudah**
diperbaiki dan apa yang **masih terbuka**.

---

## 1. Kesiapan Konektivitas Vercel + Supabase

| Item | Status |
|---|---|
| `vercel.json` (rewrites `/api`, `/rest/v1`, `/storage/v1`, build command, output dir) | ✅ Siap |
| `rest.ts` auto-switch ke Supabase REST proxy saat `DATABASE_URL` kosong/placeholder | ✅ Siap |
| `envValidation.ts` — `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` wajib | ✅ Siap |
| Tidak ada hardcoded `localhost` yang bocor ke production | ✅ Siap |
| `server/db.ts` (root) — file legacy, tidak dipakai di `artifacts/` maupun `api/` | ⚠️ Boleh dihapus (bukan blocker) |
| `functions.maxDuration` belum diset di `vercel.json` | ⚠️ Perlu dinaikkan kalau pakai plan Pro & endpoint analytics/report lambat |

**Tidak ada tindakan kode yang diperlukan** — kesiapan sudah baik. Dua item ⚠️ bersifat rapi-rapi/opsional, belum dieksekusi.

---

## 2. API — Bug yang Sudah Diperbaiki

| File | Masalah | Perbaikan |
|---|---|---|
| `artifacts/api-server/src/routes/admin/content.ts` | CRUD generik CMS menerima `req.body` mentah — klien bisa override `id`/`createdAt` | Ditambahkan `stripImmutableFields()` |
| `artifacts/api-server/src/routes/admin/analytics.ts` | Hasil query SQL mentah diketik `any` di seluruh response mapping | Ditambahkan interface `TrendRow`, `PackageRevenueRow`, `StatusCountRow`, `DepartureRow` |
| `artifacts/api-server/src/routes/admin/pilgrims.ts` | POST/PATCH men-spread `req.body` langsung ke insert/update tanpa whitelist — kolom apa pun bisa di-override | Ditambahkan `pickPilgrimFields()` whitelist (sesuai kolom asli di schema `booking_pilgrims`), validasi field wajib (`bookingId`, `name`) saat create, 404 saat update ID tidak ada |
| `artifacts/api-server/src/routes/admin/costs.ts` | `POST /bulk-copy` mendestrukturisasi `sourceCosts`/`targetPackageIds`/`targetDepartureIds` tanpa cek array — bisa throw 500 mentah kalau field kosong/salah tipe | Ditambahkan validasi `mode`, `Array.isArray`, dan field wajib per mode sebelum diproses |

## API — Ditemukan Tapi Belum Diperbaiki (Prioritas Lebih Rendah)

| File | Masalah | Alasan ditunda |
|---|---|---|
| `admin/bookings.ts` | Bentuk response tidak konsisten (POST bare object vs GET `{data,total}`) | Risiko rendah — frontend saat ini hanya refetch, tidak parsing response POST secara langsung |
| `admin/pilgrims.ts` | Handler diketik `any` di semua route | Kosmetik/type-safety, tidak menyebabkan bug fungsional saat ini |

## API — Klaim Awal yang Ternyata TIDAK Valid (setelah verifikasi manual)
- `payment-gateway.ts` (Midtrans/Xendit fetch) — **sudah ada** `AbortSignal.timeout` & pengecekan `resp.ok`. Tidak ada bug.
- `envValidation.ts` — `SUPABASE_SERVICE_ROLE_KEY` **sudah** wajib divalidasi. Tidak ada bug.

---

## 3. Menu Admin — Prioritas & Status CRUD

**CRITICAL**: Paket Umroh, Keberangkatan, Booking, Pembayaran, Jemaah — CRUD sudah dicek, jalur front↔back **cocok**. (Perbaikan whitelist pada Jemaah/Pilgrims di atas menutup satu celah keamanan di sini.)

**IMPORTANT**: Agen, CRM & Follow-up, Akuntansi, Laporan, Refund — CRUD **cocok**, tidak ada endpoint hilang (klaim awal soal DELETE agen hilang & CRM leads delete salah syntax **tidak valid** setelah verifikasi kode langsung).

**SUPPORTING**: Master Data, CMS, Settings — sudah diperkuat lewat perbaikan `content.ts` di atas.
- Menu **"Multi-Bahasa"** di sidebar masih `AdminPlaceholder` — belum diimplementasikan. **Belum dikerjakan**, menunggu arahan (bangun fiturnya, atau sembunyikan dulu dari menu).

---

## 4. Frontend Publik — Bug yang Sudah Diperbaiki

| File | Masalah | Perbaikan |
|---|---|---|
| `features/jamaah/pages/MyDocuments.tsx` | Upload dokumen tanpa validasi tipe/ukuran file | Ditambahkan validasi tipe (`jpg/png/webp/pdf`) & ukuran maks 5MB sebelum upload |
| `features/paket/hooks/useWishlist.tsx` | Toggle wishlist terasa lag (tidak optimistic) | Ditambahkan optimistic update + rollback otomatis kalau request gagal |
| `features/paket/pages/Compare.tsx` | Tidak ada UI error/loading — tabel kosong tanpa pesan kalau fetch gagal | Ditambahkan state `loading` & `error` dengan pesan yang jelas |

## Frontend — Ditemukan Tapi Belum Diperbaiki

| File | Masalah | Alasan ditunda |
|---|---|---|
| `features/booking/pages/Booking.tsx` | 3 `apiFetch` berurutan (booking → rooms → pilgrims) tanpa rollback kalau step 2/3 gagal, bisa menyisakan booking "setengah jadi" | **Scope besar** — perlu endpoint transaksional baru di backend (bukan sekadar patch kecil di frontend). Perlu keputusan desain: satu endpoint atomik, atau job cleanup, atau retry manual. **Rekomendasi: jadikan task terpisah.** |
| `features/auth/pages/Auth.tsx` | Validasi form manual, tidak pakai schema (Zod/RHF), UX tidak konsisten | Prioritas rendah, tidak menyebabkan bug data — bersifat peningkatan UX |
| `features/booking/pages/Payment.tsx` | Diklaim pesan "Booking tidak ditemukan" muncul untuk network error | **Diverifikasi tidak valid** — `apiFetch` sudah melempar pesan error server/network yang berbeda dari kasus data kosong |

---

## Ringkasan Status
- **Sudah dikerjakan** (6 perbaikan kode, terverifikasi build bersih & workflow jalan normal): `content.ts`, `analytics.ts`, `pilgrims.ts`, `costs.ts`, `MyDocuments.tsx`, `useWishlist.tsx`, `Compare.tsx`.
- **Belum dikerjakan / perlu keputusan Anda**:
  1. Rollback/atomicity pada `Booking.tsx` (scope besar, sebaiknya task terpisah).
  2. Menu "Multi-Bahasa" — bangun atau sembunyikan.
  3. Validasi form berbasis schema di `Auth.tsx` (peningkatan UX, tidak mendesak).
  4. Bersih-bersih `server/db.ts` legacy & `functions.maxDuration` di `vercel.json` (opsional, tidak mendesak).
