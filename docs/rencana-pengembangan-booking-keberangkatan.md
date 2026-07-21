# Rencana Pengembangan: Booking & Jadwal Keberangkatan
**Tanggal:** 21 Juli 2026  
**Dibuat berdasarkan:** Analisa mendalam codebase UmrohPlus

---

## Ringkasan Temuan (Kondisi Saat Ini)

### ✅ Yang Sudah Ada
| Fitur | Status | Lokasi |
|---|---|---|
| Form booking admin (individual) | Ada | `AdminCreateBookingDialog.tsx` |
| Form booking admin (grup) | Ada, terpisah | `AdminGroupBookingDialog.tsx` |
| Tabel daftar booking | Ada | `BookingTable.tsx` |
| Manajemen jadwal keberangkatan | Ada | `admin/pages/Departures.tsx` |
| Manifest per keberangkatan | Ada | `admin/pages/Manifest.tsx` + PDF |
| Booking publik multi-jamaah | Ada | `booking/pages/Booking.tsx` |

### ❌ Gap / Masalah Utama

#### 1. Admin Booking — Form Terpisah & Tidak Konsisten
- Ada **dua dialog terpisah**: `AdminCreateBookingDialog` (individu) dan `AdminGroupBookingDialog` (grup)
- Form individu **tidak ada field "Nama Pemesan"** — hanya "Nama Pelanggan" yang bisa kosong jika dari profile
- Admin tidak bisa **tambah jamaah satu per satu** di form individu
- Tidak ada cara tambah jamaah **setelah booking dibuat** langsung dari panel booking

#### 2. Nama Pemesan Tidak Wajib & Tidak Konsisten
- DB punya kolom `pemesan_name`, `pemesan_phone`, `pemesan_email` — bagus
- Tapi di list booking, nama ditampilkan via `COALESCE(pemesan_name, pic_name, profile.name)` → bisa dari mana saja
- Form individu admin: nama diambil dari "Cari Pelanggan" — jika tidak ditemukan, bisa kosong
- **Risiko:** data booking tanpa nama pemesan yang jelas

#### 3. Manifest Keberangkatan — Ada tapi Kurang Terintegrasi
- Manifest sudah ada dan bagus (`Manifest.tsx` + PDF download)
- Tapi **tidak ada shortcut langsung** dari halaman Departures ke manifest-nya
- Di halaman admin bookings, **tidak ada tombol "Lihat Manifest Keberangkatan Ini"**
- Tidak ada **ringkasan manifest** (jumlah jamaah confirmed, dokumen lengkap/belum) di card keberangkatan

#### 4. Frontend Publik — Tidak Ada Halaman Jadwal Keberangkatan
- Jadwal hanya bisa dilihat di dalam halaman detail paket (`/paket/:slug`)
- Tidak ada halaman `/jadwal` atau `/keberangkatan` untuk publik melihat semua jadwal
- Calon jamaah tidak bisa browse jadwal lintas-paket dalam satu tampilan

---

## Rencana Pengembangan

### FASE 1 — Perbaikan Kritis Admin Panel (Priority: Tinggi)

#### A. Unifikasi Form Booking Admin
**File yang diubah:**
- `AdminCreateBookingDialog.tsx` → refactor menjadi form tunggal yang mendukung 1-N jamaah
- `AdminGroupBookingDialog.tsx` → dihapus / digabung

**Perubahan:**
```
Form Booking Admin (Baru):
├── [SECTION 1] Paket & Keberangkatan
│   ├── Pilih Paket (Select + search)
│   └── Pilih Jadwal Keberangkatan (Select, filtered by paket)
│
├── [SECTION 2] Data Pemesan (WAJIB — selalu tampil)
│   ├── Nama Pemesan * (text, required)
│   ├── No. HP Pemesan * (text, required)
│   ├── Email Pemesan (text, optional)
│   └── Toggle: Pemesan berbeda dengan jamaah pertama
│
├── [SECTION 3] Daftar Jamaah (1 atau lebih)
│   ├── Jamaah 1: Nama, Gender, NIK, No. HP
│   ├── [+ Tambah Jamaah] → tambah row baru
│   └── Setiap jamaah: pilih Tipe Kamar (Quad/Triple/Double)
│
├── [SECTION 4] Pembayaran
│   ├── Skema: Lunas / DP
│   ├── Cabang & Agen
│   └── Catatan Internal
│
└── [SUBMIT] → satu API call ke POST /admin/bookings/group
```

**Backend:** Endpoint `POST /admin/bookings/group` sudah ada dan mendukung ini — tinggal perbaiki form frontendnya.

#### B. Validasi Wajib Nama Pemesan
**File yang diubah:**
- `AdminCreateBookingDialog.tsx` / form baru → tambah validasi required
- `admin/bookings.ts` (server route) → tambah validasi server-side: `pemesan_name` tidak boleh kosong
- `BookingTable.tsx` → kolom "Nama" harus selalu tampilkan `pemesan_name` (bukan COALESCE)

#### C. Tambah Jamaah dari Booking Detail
**File yang diubah:**
- `BookingDetailPanel.tsx` → tambah tombol **"+ Tambah Jamaah"** yang membuka mini-form
- `PilgrimDetailDrawer.tsx` → ubah dari read-only menjadi editable (nama, gender, NIK, passport)

**Endpoint baru yang dibutuhkan:**
- `POST /admin/bookings/:id/pilgrims` — tambah jamaah ke booking yang sudah ada
- `PATCH /admin/pilgrims/:id` — edit data jamaah
- `DELETE /admin/pilgrims/:id` — hapus jamaah dari booking

---

### FASE 2 — Manifest Terintegrasi dengan Keberangkatan (Priority: Tinggi)

#### A. Card Keberangkatan dengan Info Manifest
**File yang diubah:** `admin/pages/Departures.tsx`

**Tambahan di setiap card keberangkatan:**
```
┌─────────────────────────────────────────┐
│ Umroh Ramadan 2025 · 15 Mar → 30 Mar    │
│ Kuota: 45/50 · Status: Hampir Penuh     │
├─────────────────────────────────────────┤
│ 📋 Manifest: 38 jamaah terkonfirmasi    │
│    ✅ 30 dokumen lengkap                │
│    ⚠️  8 dokumen belum lengkap          │
│                                         │
│ [Lihat Manifest]  [Download PDF]  [···] │
└─────────────────────────────────────────┘
```

**Endpoint baru:** `GET /admin/departures/:id/manifest-summary`
```json
{
  "confirmed_pilgrims": 38,
  "docs_complete": 30,
  "docs_incomplete": 8
}
```

#### B. Shortcut dari Booking ke Manifest Keberangkatan
**File yang diubah:** `BookingDetailPanel.tsx`

Tambahkan link: **"Lihat semua jamaah keberangkatan ini →"** yang mengarah ke `/admin/manifest/:departureId`

#### C. Filter Manifest Berdasarkan Booking
**File yang diubah:** `admin/pages/Manifest.tsx`

Tambah kolom di tabel manifest:
- **Kode Booking** (clickable → buka detail booking)
- **Nama Pemesan** (untuk kelompok: tampilkan nama PIC)
- **Status Dokumen** per jamaah (sudah ada, pertahankan)

---

### FASE 3 — Halaman Jadwal Keberangkatan Publik (Priority: Menengah)

#### A. Halaman `/jadwal` (Baru)
**File baru:** `features/cms/pages/Jadwal.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  JADWAL KEBERANGKATAN UMROH 2025-2026               │
│  Temukan jadwal yang sesuai dengan rencana Anda     │
├─────────────────────────────────────────────────────┤
│  Filter: [Bulan ▼] [Tahun ▼] [Paket ▼] [Cari]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  MARET 2025                                         │
│  ┌────────────┬──────────────┬────────┬──────────┐ │
│  │ Tanggal    │ Nama Paket   │ Durasi │ Harga    │ │
│  ├────────────┼──────────────┼────────┼──────────┤ │
│  │ 15 Mar     │ Umroh Ekono  │ 12 hari│ Rp 25jt  │ │
│  │ 22 Mar     │ Umroh Plus   │ 15 hari│ Rp 35jt  │ │
│  └────────────┴──────────────┴────────┴──────────┘ │
│                                                     │
│  APRIL 2025                                         │
│  ... dst                                            │
│                                                     │
│  [Daftar Sekarang →] per baris                      │
└─────────────────────────────────────────────────────┘
```

**Endpoint baru:** `GET /api/public/jadwal?month=&year=&packageId=`

#### B. Integrasi di Homepage
**File yang diubah:** `features/cms/pages/Index.tsx`

Tambah section **"Jadwal Keberangkatan Terdekat"** setelah section Packages Preview:
- Tampilkan 5-6 jadwal terdekat dengan countdown ("Berangkat 23 hari lagi")
- CTA: "Lihat Semua Jadwal →" mengarah ke `/jadwal`

#### C. Navbar Publik
**File yang diubah:** komponen Navbar

Tambah menu item: **"Jadwal"** → `/jadwal`

---

### FASE 4 — UX & Tampilan (Priority: Menengah)

#### A. Admin Booking List — Perbaikan Kolom & Filter
**File yang diubah:** `BookingTable.tsx`, `Bookings.tsx`

Tambahkan:
- Kolom **"Jumlah Jamaah"** (dari `pax_count`)
- Kolom **"Nama Pemesan"** (eksplisit, bukan fallback)
- Filter **"Keberangkatan"** (dropdown pilih tanggal spesifik)
- Badge **"Grup"** untuk booking grup
- Quick action: ikon **👥 Lihat Jamaah** per baris

#### B. Halaman Booking Detail Admin — Redesign
**File yang diubah:** `BookingDetailPanel.tsx`

Struktur baru:
```
┌─ INFO BOOKING ──────────────────────────────┐
│ Kode: UMR-2025-0042                         │
│ Pemesan: Ahmad Fauzi · 0812-xxxx · email    │
│ Paket: Umroh Ramadan · 15 Maret 2025        │
│ Status: CONFIRMED · Dibuat: 10 Jan 2025     │
├─ DAFTAR JAMAAH ─────────────────────────────┤
│ 1. Ahmad Fauzi (Kamar Double) ✅ Dok Lengkap│
│ 2. Siti Aisyah (Kamar Double) ⚠️ Visa       │
│ [+ Tambah Jamaah]                           │
├─ PEMBAYARAN ────────────────────────────────┤
│ Total: Rp 70.000.000                        │
│ DP: Rp 10.000.000 (14 Jan 2025) ✅          │
│ Sisa: Rp 60.000.000                         │
│ [+ Catat Pembayaran]                        │
└─────────────────────────────────────────────┘
```

---

## Prioritas Implementasi

| # | Item | Dampak | Effort | Prioritas |
|---|------|--------|--------|-----------|
| 1 | Unifikasi form booking admin + nama pemesan wajib | Tinggi | Menengah | 🔴 Kritis |
| 2 | Tambah/edit jamaah dari booking detail (admin) | Tinggi | Menengah | 🔴 Kritis |
| 3 | Manifest summary di card keberangkatan | Tinggi | Rendah | 🟠 Penting |
| 4 | Shortcut manifest dari booking detail | Menengah | Rendah | 🟠 Penting |
| 5 | Halaman `/jadwal` publik | Tinggi | Menengah | 🟠 Penting |
| 6 | Section jadwal terdekat di homepage | Menengah | Rendah | 🟡 Bagus |
| 7 | Redesign booking detail panel admin | Menengah | Menengah | 🟡 Bagus |
| 8 | Filter & kolom tambahan di booking list | Rendah | Rendah | 🟢 Nice-to-have |

---

## File yang Akan Diubah / Dibuat

### Admin Panel
| File | Aksi |
|------|------|
| `AdminCreateBookingDialog.tsx` | Refactor → form tunggal multi-jamaah |
| `AdminGroupBookingDialog.tsx` | Hapus (digabung ke atas) |
| `BookingDetailPanel.tsx` | Redesign + tambah jamaah |
| `PilgrimDetailDrawer.tsx` | Jadikan editable |
| `Departures.tsx` | Tambah manifest summary + shortcut |
| `Manifest.tsx` | Tambah kolom kode booking + nama pemesan |
| `BookingTable.tsx` | Tambah kolom jamaah & pemesan |

### Backend (API Server)
| File | Aksi |
|------|------|
| `admin/bookings.ts` | Validasi wajib pemesan_name, endpoint tambah/edit/hapus jamaah |
| `admin/departures.ts` | Endpoint manifest-summary |
| `public/routes.ts` (baru) | Endpoint GET /api/public/jadwal |

### Frontend Publik
| File | Aksi |
|------|------|
| `features/cms/pages/Jadwal.tsx` | Buat baru |
| `features/cms/pages/Index.tsx` | Tambah section jadwal terdekat |
| Komponen Navbar | Tambah menu "Jadwal" |
| Router (`App.tsx`) | Tambah route `/jadwal` |

---

## Catatan Teknis

### Kenapa Form Admin Perlu Digabung?
Saat ini ada dua dialog terpisah yang menyebabkan duplikasi kode dan inkonsistensi UX. Endpoint backend `POST /admin/bookings/group` sebenarnya **sudah mendukung** single jamaah (array dengan 1 elemen), jadi tidak perlu endpoint baru — hanya perlu UI yang unified.

### Validasi Nama Pemesan
Perlu ditambahkan di dua lapisan:
1. **Frontend:** field required + react-hook-form validation
2. **Backend:** `if (!body.pemesanName) throw 400`
Ini mencegah data booking "hantu" tanpa identitas pemesan.

### Manifest per Keberangkatan
Manifest sudah per-keberangkatan (filter by `departure_id`). Yang kurang adalah **visibilitas** — perlu ditampilkan di card departure dan di booking detail agar mudah diakses tanpa harus masuk menu Manifest dulu.
