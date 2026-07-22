# Rencana Perbaikan Menu Operasional

> Dibuat: 22 Juli 2026  
> Scope: `artifacts/umroh-app` — Menu Operasional Admin

---

## 1. Apa yang Sudah Diperbaiki (Done)

### ✅ Struktur & Urutan Menu
Menu Operasional (19 item) sekarang mengikuti alur kerja yang logis:

| # | Grup | Menu |
|---|------|------|
| 1 | **Setup Paket** | Paket → Jadwal Keberangkatan → Itinerary Perjalanan |
| 2 | **Booking & Jemaah** | Booking → Jemaah per Booking → Data Induk Jemaah |
| 3 | **Dokumen & Visa** | Dokumen Jemaah → Tracking Dokumen → Tracking Visa |
| 4 | **Perlengkapan** | Materi Manasik → Distribusi Perlengkapan |
| 5 | **Persiapan Keberangkatan** | Penempatan Kamar → Assignment Kursi → Manifest → Checklist → Kesiapan → Check-In |
| 6 | **Laporan Operasional** | Laporan Perlengkapan → Laporan Insiden |

### ✅ Ikon Duplikat Dihilangkan

| Menu | Ikon Lama | Ikon Baru |
|------|-----------|-----------|
| Distribusi Perlengkapan | `Backpack` (sama dgn Laporan) | `Truck` |
| Laporan Perlengkapan | `Backpack` (sama dgn Distribusi) | `PackageCheck` |
| Assignment Kursi | `ClipboardList` (sama dgn Manifest & Checklist) | `Armchair` |
| Checklist Keberangkatan | `ClipboardList` (sama dgn 2 menu lain) | `ListChecks` |
| Tracking Visa | `FileCheck` (sama dgn Dokumen Jemaah) | `IdCard` |

### ✅ Penamaan Diperjelas
- **"Perlengkapan Manasik"** → **"Materi Manasik"**  
  *(Halaman ini berisi materi/modul pembelajaran manasik, bukan distribusi fisik perlengkapan)*

---

## 2. Daftar Bug & Error

### 🔴 CRITICAL

#### B-01 — QR Code Check-In Tidak Bisa Dibaca
- **File**: `artifacts/umroh-app/src/features/admin/pages/CheckIn.tsx` (L122, L126) vs `Manifest.tsx` (L389)
- **Masalah**: QR generator di Manifest menggunakan key `pid`, tapi parser di Check-In mengharapkan `pilgrim_id`. Setiap scan QR akan menghasilkan error **"QR tidak valid"**.
- **Fix**: Samakan key QR — pilih salah satu dan konsisten di kedua file.
- **Prioritas**: 🔴 High — fitur Check-In tidak berfungsi sama sekali

---

### 🟠 HIGH

#### B-02 — Kolom DB Belum Ada di Equipment Report
- **File**: `artifacts/api-server/src/routes/admin/equipment-report.ts` (L37)
- **Masalah**: Endpoint `/api/admin/equipment-report/detail` mengembalikan `NULL` untuk kolom `returnedAt`, `size`, `quantity` karena kolom tersebut belum ada di skema DB.
- **Fix**: Buat migrasi Drizzle untuk menambah kolom tersebut di tabel equipment.
- **Prioritas**: 🟠 High — data laporan perlengkapan tidak lengkap

#### B-03 — Relasi Salah di Documents.tsx
- **File**: `artifacts/umroh-app/src/features/admin/pages/AdminDocuments.tsx` (L84)
- **Masalah**: Query memilih `bookings(..., packages(title))` dari `booking_pilgrims`. Relasi/path ini kemungkinan tidak cocok dengan skema aktual (tidak ada FK langsung dari `booking_pilgrims` ke `packages`).
- **Fix**: Sesuaikan query dengan relasi aktual di skema Drizzle — gunakan join bertahap atau endpoint API yang sudah ada.
- **Prioritas**: 🟠 High — halaman Dokumen Jemaah kemungkinan crash atau data kosong

---

### 🟡 MEDIUM

#### B-04 — `window.confirm` Dipakai, Bukan Dialog Konsisten
- **File**: 
  - `AdminIncidentManagement.tsx` (L268) — hapus insiden
  - `DepartureChecklist.tsx` (L216) — hapus item checklist
- **Masalah**: Menggunakan browser native `confirm()` alih-alih `DeleteAlertDialog` yang dipakai di halaman lain (misal `Manasik.tsx`). Tampilan tidak konsisten dan tidak bisa dikustomisasi.
- **Fix**: Ganti `window.confirm(...)` dengan komponen `DeleteAlertDialog`.
- **Prioritas**: 🟡 Medium — UX tidak konsisten

#### B-05 — Manasik.tsx Tidak Ada Upload File
- **File**: `artifacts/umroh-app/src/features/admin/pages/AdminManasik.tsx` (L165)
- **Masalah**: Form hanya menerima URL manual — tidak ada upload file PDF/gambar. User harus hosting file sendiri lalu tempel URL-nya.
- **Fix**: Integrasikan file upload ke storage (Supabase Storage / Object Storage) dengan komponen `FileUpload`.
- **Prioritas**: 🟡 Medium — fitur tidak lengkap

#### B-06 — VisaTracking.tsx: Warning 90 Hari Hardcoded
- **File**: `artifacts/umroh-app/src/features/admin/pages/VisaTracking.tsx` (L194)
- **Masalah**: Threshold peringatan masa berlaku visa dikodekan 90 hari, tidak fleksibel untuk semua jenis visa.
- **Fix**: Jadikan threshold configurable (settings atau parameter per tipe visa).
- **Prioritas**: 🟡 Medium

#### B-07 — SeatAssignment.tsx Tidak Ada Pilihan Penerbangan
- **File**: `artifacts/umroh-app/src/features/admin/pages/SeatAssignment.tsx`
- **Masalah**: Hanya ada pilihan segmen GO/RETURN, tidak ada pilihan penerbangan spesifik. Jika ada beberapa penerbangan per segmen, layout kursi bisa salah.
- **Fix**: Tambahkan dropdown flight selection sebelum grid kursi ditampilkan.
- **Prioritas**: 🟡 Medium

---

### 🟢 LOW

#### B-08 — EquipmentDistribution.tsx: Response Parsing Tidak Konsisten
- **File**: `artifacts/umroh-app/src/features/admin/pages/EquipmentDistribution.tsx` (L47)
- **Masalah**: `r.data ?? r` sebagai fallback parsing response. Jika struktur response berubah, data bisa salah tanpa error yang jelas.
- **Fix**: Gunakan type-safe parsing dengan Zod atau normalkan response di API layer.
- **Prioritas**: 🟢 Low

#### B-09 — RoomAssignment.tsx: Risk Race Condition
- **File**: `artifacts/umroh-app/src/features/admin/pages/AdminRoomAssignment.tsx` (L63)
- **Masalah**: `useEffect` sync bisa overwrite perubahan lokal user jika TanStack Query refetch terjadi saat user sedang mengedit.
- **Fix**: Disable auto-refetch selama mode edit aktif, atau gunakan optimistic update pattern.
- **Prioritas**: 🟢 Low

#### B-10 — EquipmentReport.tsx: Tidak Ada Pagination
- **File**: `artifacts/umroh-app/src/features/admin/pages/AdminEquipmentReport.tsx` (L53)
- **Masalah**: `apiFetch` tanpa parameter — fetch semua data sekaligus. Akan lambat jika ribuan item perlengkapan.
- **Fix**: Tambahkan pagination atau server-side filtering.
- **Prioritas**: 🟢 Low

---

## 3. Rencana Perbaikan (Prioritas)

### Sprint Berikutnya — Critical & High (B-01, B-02, B-03)

| Task | File | Estimasi |
|------|------|----------|
| Fix QR key mismatch (B-01) | `CheckIn.tsx` + `Manifest.tsx` | 1 jam |
| Migrasi DB kolom equipment (B-02) | `lib/db/schema` + Drizzle push | 2 jam |
| Fix relasi query Documents.tsx (B-03) | `AdminDocuments.tsx` | 2 jam |

### Sprint +1 — Medium (B-04 s/d B-07)

| Task | File | Estimasi |
|------|------|----------|
| Ganti `window.confirm` → `DeleteAlertDialog` (B-04) | 2 file | 1 jam |
| Upload file Manasik (B-05) | `AdminManasik.tsx` | 3 jam |
| Threshold visa configurable (B-06) | `VisaTracking.tsx` | 1 jam |
| Pilihan penerbangan di Seat Assignment (B-07) | `SeatAssignment.tsx` | 3 jam |

### Backlog — Low (B-08, B-09, B-10)

| Task | File | Estimasi |
|------|------|----------|
| Type-safe response parsing (B-08) | `EquipmentDistribution.tsx` | 1 jam |
| Race condition room assignment (B-09) | `AdminRoomAssignment.tsx` | 2 jam |
| Pagination equipment report (B-10) | `AdminEquipmentReport.tsx` | 2 jam |

---

## 4. Ringkasan

| Kategori | Jumlah |
|----------|--------|
| 🔴 Critical bugs | 1 (B-01 QR mismatch — break fitur check-in) |
| 🟠 High bugs | 2 (B-02 DB schema, B-03 relasi query) |
| 🟡 Medium bugs | 4 (B-04 s/d B-07) |
| 🟢 Low bugs | 3 (B-08 s/d B-10) |
| Menu items dirapikan | 19 item, urutan & ikon sudah benar |
| Ikon duplikat dihilangkan | 5 menu mendapat ikon unik |
| Nama diperjelas | "Perlengkapan Manasik" → "Materi Manasik" |
