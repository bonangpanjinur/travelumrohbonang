# Analisis Panel Admin — Seksi Operasional
> Dibuat: 2026-07-18  
> Cakupan: Paket Umroh · Keberangkatan · Itinerary · Booking · Jemaah · Manifest

---

## 1. Ringkasan Alur Operasional

```
Paket Umroh
  └─► Keberangkatan (departure dari sebuah paket)
        ├─► Itinerary (jadwal harian per keberangkatan)
        ├─► Booking (reservasi jamaah ke keberangkatan)
        │     └─► Jemaah / Booking Pilgrims (data personal per booking)
        └─► Manifest (tampilan semua jamaah dalam satu keberangkatan)
```

### Pola Arsitektur
| Lapisan | Teknologi | Pola Fetch |
|---|---|---|
| Frontend (umroh-app) | React 19 + Vite + Wouter | `apiFetch` → `/api/admin/*` |
| Backend (api-server) | Express 5 + Drizzle ORM | REST JSON |
| REST Proxy | `api-server/src/routes/rest.ts` | `/rest/v1/*` → PostgreSQL / Supabase forward |
| Database | PostgreSQL via Drizzle | Schema di `lib/db/src/schema/` |

---

## 2. Bug yang Ditemukan

### 🔴 BUG-01 — Itinerary: API mengembalikan HTML bukan JSON

**Severity:** Critical  
**File:** `artifacts/umroh-app/src/features/admin/pages/Itineraries.tsx`  
**Error di console:**
```
[itineraries] fetch error: Error: Server returned non-JSON response (200): <!doctype html>
[itineraries] departures fetch error: Error: Server returned non-JSON response (200): <!doctype html>
```

**Penyebab:**  
`Itineraries.tsx` memanggil endpoint PostgREST proxy (`/rest/v1/itineraries`, `/rest/v1/package_departures`). REST proxy di api-server (`rest.ts`) meneruskan request ke Supabase jika `DATABASE_URL` tidak mengarah ke instance lokal. Ketika Supabase credentials tidak tersedia atau koneksi gagal, proxy tidak memberikan error JSON—melainkan request jatuh ke SPA fallback handler dan mengembalikan `index.html`.

**Dampak:** Halaman Itinerary **selalu kosong**. Data tidak pernah termuat. Semua operasi CRUD gagal diam-diam.

**Perbaikan:**  
- Pastikan `DATABASE_URL` terkonfigurasi di environment Replit, **atau** tambahkan fallback error handler di `rest.ts` yang mengembalikan `{ error: "...", status: 503 }` alih-alih membiarkan request pass-through ke SPA.
- Tambahkan dedicated route `/api/admin/itineraries` di api-server (sama seperti modul lain) agar tidak bergantung pada proxy.
- Di frontend, tampilkan pesan error yang jelas ketika response bukan JSON.

---

### 🔴 BUG-02 — PackageCommissions: Supabase client langsung → 401 Unauthorized

**Severity:** Critical  
**File:** `artifacts/umroh-app/src/features/admin/components/PackageCommissions.tsx`  
**Error di console:**
```
supabase.co/rest/v1/package_commissions?...package_id=eq.pkg_plus  →  400 Bad Request
supabase.co/rest/v1/ Failed to load resource: 401 Unauthorized (×9)
```

**Penyebab:**  
`PackageCommissions.tsx` mengimpor dan menggunakan `supabase` client secara **langsung** (bukan via `apiFetch`). Komponen ini, dan beberapa komponen admin lain, bypass seluruh api-server:

| File | Penggunaan Supabase Langsung |
|---|---|
| `PackageCommissions.tsx` | `supabase.from("package_commissions").select/upsert` |
| `Users.tsx` | `supabase.from(...)` + Edge Function invoke |
| `CommissionReport.tsx` | `supabase.from(...)` |
| `Documents.tsx` | `supabase.from(...)` |
| `Gallery.tsx` | `supabase.storage` upload |
| `Settings.tsx` | `supabase.storage` upload |
| `DepartureGallery.tsx` | `supabase.storage` upload |
| `AdminRoute.tsx` | `supabase.auth` session check |

Ketika `SUPABASE_ANON_KEY` tidak ada atau expired, semua call ini menghasilkan 401.

**Masalah tambahan (BUG-02b):**  
`package_id=eq.pkg_plus` — nilai `pkg_plus` adalah slug/string, bukan UUID. Kolom `package_commissions.package_id` kemungkinan bertipe UUID, sehingga Supabase menolak dengan 400.

**Dampak:** Panel komisi paket tidak bisa dibaca maupun disimpan. Upload gambar (gallery, settings, departure gallery) gagal. Auth admin potensial rusak jika Supabase session expired.

**Perbaikan:**  
- Pindahkan semua operasi `package_commissions` ke endpoint `/api/admin/packages/:id/commissions` di api-server.
- Ganti `supabase.from(...)` di `PackageCommissions.tsx` dan `CommissionReport.tsx` dengan `apiFetch(...)`.
- Untuk upload storage: tambahkan endpoint upload di api-server yang menggunakan Supabase Admin SDK server-side, bukan client-side anon key.
- Fix query commission: gunakan `package_id` (UUID) bukan `slug` saat memanggil.

---

### 🔴 BUG-03 — WebSocket Supabase Realtime: Koneksi gagal berulang

**Severity:** Critical (performance)  
**Error di console:**
```
WebSocket connection to 'wss://yakjpqqobknrmhfmybhe.supabase.co/realtime/v1/websocket?...' 
failed: WebSocket is closed before the connection is established. (berulang)
```

**Penyebab:**  
Supabase JS client mencoba membuka koneksi Realtime secara otomatis saat diinisialisasi. Di lingkungan Replit tanpa Supabase credentials yang valid, koneksi ini gagal, lalu di-retry terus-menerus (backoff eksponensial), menyebabkan noise di console dan overhead jaringan.

**Dampak:** Performa aplikasi menurun, console penuh error, potensi memory leak dari retry loop.

**Perbaikan:**  
- Disable Realtime saat inisialisasi Supabase client di Replit dev: `createClient(url, key, { realtime: { enabled: false } })`.
- Atau deteksi environment dan hanya aktifkan Realtime di production.

---

### 🟠 BUG-04 — Bookings: Race condition pada filter/page

**Severity:** Medium  
**File:** `artifacts/umroh-app/src/features/admin/pages/Bookings.tsx`

**Penyebab:**  
Terdapat dua `useEffect` yang saling beririsan:
1. `useEffect` pertama: reset `page` ke 0 ketika filter berubah.
2. `useEffect` kedua: memanggil `fetchBookings` ketika `page`, filter, atau search berubah.

Ketika filter berubah, kedua effect aktif hampir bersamaan:
- Effect #1 → set `page = 0` (state update async)
- Effect #2 → `fetchBookings` dengan `page` lama (stale)
- React re-render → Effect #2 kembali dijalankan dengan `page = 0`

Hasil: **2 API call** setiap kali filter berubah, data bisa tampil dari request yang lebih lama (stale data).

**Perbaikan:**  
Gabungkan kedua effect menjadi satu. Gunakan `useCallback` + debounce, atau gunakan `useMemo` untuk params query dan satu `useEffect` saja:
```ts
// Satu effect, reset page di dalam effect itu sendiri
useEffect(() => {
  setPage(0); // reset dulu
}, [filter, search, branchFilter]);

useEffect(() => {
  fetchBookings();
}, [page, filter, search, branchFilter]);
// ← MASALAH: page reset dan fetch trigger dua kali
```
→ Solusi benar: satukan jadi satu effect, atau pakai React Query dengan `queryKey` yang menyertakan semua filter sekaligus.

---

### 🟠 BUG-05 — Packages: Extra Hotels dalam state tidak konsisten

**Severity:** Medium  
**File:** `artifacts/umroh-app/src/features/admin/pages/Packages.tsx`

**Penyebab:**  
Saat menyimpan paket baru/edit, ada dua API call terpisah:
1. `POST/PATCH /api/admin/packages` — simpan data utama paket.
2. `POST /api/admin/packages/:id/extra-hotels` — simpan hotel tambahan.

Keduanya **tidak dalam satu transaksi**. Jika call #1 berhasil dan call #2 gagal, paket tersimpan tanpa extra hotels. User mendapat toast warning, tapi data di database tidak konsisten.

**Perbaikan:**  
- Sisi backend: gabungkan extra-hotels ke dalam body request utama `POST/PATCH /api/admin/packages` dan wrap dalam satu database transaction.
- Atau: implementasi rollback — jika extra-hotels gagal, rollback paket (DELETE paket yang baru dibuat).

---

### 🟠 BUG-06 — Bookings Backend: Tidak ada validasi transisi status

**Severity:** Medium  
**File:** `artifacts/api-server/src/routes/admin/bookings.ts`

**Penyebab:**  
Handler `PATCH /:id/status` menerima status baru apa pun tanpa memeriksa status saat ini. Ini memungkinkan transisi ilegal seperti:
- `cancelled` → `completed` (booking yang dibatalkan tiba-tiba jadi selesai)
- `completed` → `pending` (mundur ke awal)

Kondisi ini juga bisa memicu `awardLoyaltyPointsForBooking` lebih dari sekali jika status bolak-balik ke `completed`.

**State Machine yang seharusnya:**
```
pending → confirmed → completed
pending → cancelled
confirmed → cancelled
```

**Perbaikan:**  
Tambahkan validasi transisi di handler:
```ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],  // terminal
  cancelled: [],  // terminal
};

const currentStatus = booking.status;
if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
  return res.status(400).json({ error: `Transisi ${currentStatus} → ${newStatus} tidak diizinkan` });
}
```

---

### 🟠 BUG-07 — Itinerary: Upload gambar tidak tersedia (hanya URL manual)

**Severity:** Medium  
**File:** `artifacts/umroh-app/src/features/admin/pages/Itineraries.tsx`

**Penyebab:**  
Form tambah/edit hari itinerary menggunakan `<Input>` biasa untuk `image_url` — user harus mengetik URL gambar secara manual. Berbeda dengan `Packages.tsx` yang sudah memiliki komponen upload ke Supabase Storage.

**Dampak:** UX buruk. Admin harus upload gambar ke tempat lain dulu, lalu copy URL-nya.

**Perbaikan:**  
Tambahkan komponen upload gambar yang sama seperti di Packages (atau buat shared `<ImageUploader>` component). Gunakan endpoint upload server-side jika Supabase credentials tersedia.

---

### 🟡 BUG-08 — Pilgrims: Validasi client-side tidak lengkap

**Severity:** Low  
**File:** `artifacts/umroh-app/src/features/admin/pages/Pilgrims.tsx`

**Penyebab:**  
- NIK: hanya ada `maxLength={16}` di input, tidak ada validasi format (harus 16 digit angka).
- Email: tidak ada validasi format email sebelum submit.
- Nomor telepon: tidak ada validasi format (harus angka, panjang minimum).
- Tanggal lahir/expiry passport: tidak ada validasi logis (lahir tidak boleh di masa depan, expiry harus di masa depan).

**Dampak:** Data kotor masuk ke database. Potensi error di PDF manifest generation jika data tidak valid.

**Perbaikan:**  
Tambahkan validasi Zod di frontend sebelum `handleSave`:
```ts
const pilgrimSchema = z.object({
  name: z.string().min(2),
  nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().regex(/^(\+62|0)\d{8,12}$/),
  // ...
});
```

---

### 🟡 BUG-09 — Manifest: Tidak ada paginasi

**Severity:** Low  
**File:** `artifacts/umroh-app/src/features/admin/pages/Manifest.tsx`

**Penyebab:**  
Semua jamaah dalam satu keberangkatan dimuat sekaligus tanpa paginasi. Untuk keberangkatan dengan 200+ jamaah, ini bisa memperlambat render dan membebani API.

**Perbaikan:**  
Tambahkan paginasi atau virtual scrolling (misalnya TanStack Virtual). Atau setidaknya batasi query dengan `limit` + `offset` di endpoint manifest.

---

### 🟡 BUG-10 — Pilgrims: Limit hardcoded saat fetch bookings untuk linking

**Severity:** Low  
**File:** `artifacts/umroh-app/src/features/admin/pages/Pilgrims.tsx`

**Penyebab:**  
`GET /api/admin/bookings?limit=200` — limit di-hardcode 200. Jika jumlah booking melebihi 200, admin tidak bisa melinkkan jamaah ke booking yang lebih lama.

**Perbaikan:**  
Tambahkan search/autocomplete untuk pemilihan booking, bukan load semua sekaligus.

---

## 3. Ringkasan Bug

| ID | Modul | Severity | Kategori | Status |
|---|---|---|---|---|
| BUG-01 | Itinerary | 🔴 Critical | Data tidak termuat | ✅ Diperbaiki (proxy error handler + Supabase dikonfigurasi) |
| BUG-02 | Paket (Komisi) | 🔴 Critical | 401/400 Unauthorized | ✅ Diperbaiki (migrasi ke apiFetch + endpoint baru) |
| BUG-02b | Paket (Komisi) | 🔴 Critical | ID mismatch (slug vs UUID) | ✅ Diperbaiki (endpoint pakai UUID langsung) |
| BUG-03 | Seluruh admin | 🔴 Critical | WebSocket retry loop | ✅ Diperbaiki (realtime.disconnect() di dev) |
| BUG-04 | Booking | 🟠 Medium | Race condition double-fetch | Belum diperbaiki |
| BUG-05 | Paket | 🟠 Medium | Inkonsistensi data (extra hotels) | Belum diperbaiki |
| BUG-06 | Booking Backend | 🟠 Medium | Status transition tidak tervalidasi | Belum diperbaiki |
| BUG-07 | Itinerary | 🟠 Medium | Upload gambar tidak ada | Belum diperbaiki |
| BUG-08 | Jemaah | 🟡 Low | Validasi form tidak lengkap | Belum diperbaiki |
| BUG-09 | Manifest | 🟡 Low | Tidak ada paginasi | Belum diperbaiki |
| BUG-10 | Jemaah | 🟡 Low | Limit hardcoded 200 | Belum diperbaiki |

---

## 4. Rencana Perbaikan

### Fase 1 — Critical (prioritas segera)

#### F1-T1: Konfigurasi database & environment (prasyarat semua)
- Set `DATABASE_URL` di Replit Secrets mengarah ke PostgreSQL Supabase
- Set `SUPABASE_URL` dan `SUPABASE_ANON_KEY` 
- Jalankan `cd lib/db && pnpm drizzle-kit push` untuk sync schema
- Verifikasi REST proxy (`/rest/v1/*`) bisa query ke DB

#### F1-T2: Fix BUG-01 — REST proxy error handling
**File:** `artifacts/api-server/src/routes/rest.ts`
- Tambahkan try-catch global di setiap handler (GET/POST/PATCH/DELETE)
- Jika error, kembalikan `res.status(503).json({ error: "Database unavailable" })` bukan biarkan pass-through
- Tambahkan dedicated route `/api/admin/itineraries` dan `/api/admin/itinerary-days` di api-server sebagai alternatif yang lebih stabil

#### F1-T3: Fix BUG-02 — Pindahkan PackageCommissions ke apiFetch
**Files:** 
- `artifacts/umroh-app/src/features/admin/components/PackageCommissions.tsx`
- `artifacts/api-server/src/routes/admin/packages.ts`

Langkah:
1. Tambahkan endpoint `GET /api/admin/packages/:id/commissions` dan `PUT /api/admin/packages/:id/commissions` di api-server
2. Di `PackageCommissions.tsx`: ganti semua `supabase.from("package_commissions")` dengan `apiFetch(...)`
3. Pastikan `package_id` yang dikirim adalah UUID, bukan slug

#### F1-T4: Fix BUG-03 — Disable Supabase Realtime di dev
**File:** `artifacts/umroh-app/src/shared/lib/supabaseClient.ts` (atau lokasi inisialisasi client)
```ts
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: { eventsPerSecond: 0 }
  },
  // atau:
  // global: { fetch: customFetch }
});
// Di dev, disable realtime:
if (import.meta.env.DEV) {
  supabase.realtime.disconnect();
}
```

---

### Fase 2 — Medium (sprint berikutnya)

#### F2-T1: Fix BUG-04 — Race condition Bookings
**File:** `artifacts/umroh-app/src/features/admin/pages/Bookings.tsx`
- Migrasi data fetching ke React Query: `useQuery({ queryKey: ['bookings', filter, search, branchFilter, page], queryFn: fetchBookings })`
- React Query otomatis handle deduplication dan stale data

#### F2-T2: Fix BUG-05 — Extra Hotels atomic save
**Files:**
- `artifacts/api-server/src/routes/admin/packages.ts`
- `artifacts/umroh-app/src/features/admin/pages/Packages.tsx`

Backend: wrap insert paket + insert extra-hotels dalam satu `db.transaction(async (tx) => { ... })`.  
Frontend: hapus call terpisah untuk extra-hotels, sertakan dalam body request utama.

#### F2-T3: Fix BUG-06 — Status transition validation
**File:** `artifacts/api-server/src/routes/admin/bookings.ts`
- Implementasi state machine `VALID_TRANSITIONS` (lihat contoh di atas)
- Fetch status saat ini dulu, validasi transisi, baru update

#### F2-T4: Fix BUG-07 — Itinerary image upload
**File:** `artifacts/umroh-app/src/features/admin/pages/Itineraries.tsx`
- Ekstrak komponen `<ImageUploader>` dari `Packages.tsx` menjadi shared component
- Gunakan di form itinerary days
- Upload ke Supabase storage bucket `itinerary-images` via server-side endpoint

---

### Fase 3 — Low (backlog)

#### F3-T1: Fix BUG-08 — Validasi Pilgrims
- Buat `pilgrimSchema` dengan Zod di frontend
- Validasi sebelum `handleSave`, tampilkan field-level error

#### F3-T2: Fix BUG-09 — Paginasi Manifest
- Tambahkan `limit`/`offset` di endpoint `GET /api/admin/departures/:id/manifest-data`
- Implementasi paginasi atau infinite scroll di `Manifest.tsx`

#### F3-T3: Fix BUG-10 — Bookings autocomplete di Pilgrims
- Ganti dropdown dengan `<Combobox>` yang search server-side
- Endpoint: `GET /api/admin/bookings?search=<query>&limit=10`

---

## 5. Konsistensi Arsitektur yang Perlu Diselesaikan

Saat ini terdapat **3 pola fetch berbeda** yang bercampur di halaman admin:

| Pola | Digunakan di | Masalah |
|---|---|---|
| `apiFetch("/api/admin/...")` | Packages, Departures, Bookings, Pilgrims, Manifest | ✅ Standar yang benar |
| `apiFetch("/rest/v1/...")` | Itineraries | ⚠️ Bergantung pada proxy + DB connection |
| `supabase.from(...)` langsung | PackageCommissions, Gallery, Users, dll | ❌ Bypass auth server, gagal tanpa kredensial valid |

**Target arsitektur yang sehat:** Semua halaman admin hanya menggunakan `apiFetch("/api/admin/...")`. Supabase client di frontend hanya untuk: auth session check (`AdminRoute.tsx`) dan tidak ada lagi yang lain.

---

## 6. Urutan Pengerjaan yang Disarankan

```
[Minggu 1]
  F1-T1: Setup environment/secrets (prasyarat)
  F1-T4: Disable Realtime (cepat, 15 menit)
  F1-T2: Fix REST proxy error handling
  F1-T3: Migrate PackageCommissions ke apiFetch

[Minggu 2]  
  F2-T1: Race condition Bookings → React Query
  F2-T3: Status transition validation (backend)
  F2-T2: Extra Hotels atomic transaction

[Minggu 3]
  F2-T4: Itinerary image upload component
  F3-T1: Pilgrim form validation
  F3-T2 + F3-T3: Paginasi & autocomplete
```

---

*Dokumen ini dihasilkan dari analisis statis kode + error console. Verifikasi masing-masing bug dengan testing langsung setelah environment tersedia.*
