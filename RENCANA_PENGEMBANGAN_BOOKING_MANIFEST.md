# Rencana Pengembangan: Booking & Manifest per Keberangkatan

> Dibuat: 21 Juli 2026  
> Berdasarkan analisis kode: `artifacts/umroh-app` (frontend) + `artifacts/api-server` (backend) + `lib/db` (schema)

---

## Ringkasan Kondisi Saat Ini

### ✅ Yang Sudah Ada
| Fitur | Status | Catatan |
|---|---|---|
| Daftar jadwal keberangkatan (Departures) | ✅ Ada | Lengkap dengan quota bar, harga per kamar, status |
| Booking admin (single) | ✅ Ada | Hanya bisa 1 booking per submit |
| Nama pemesan di list booking | ⚠️ Parsial | Ditampilkan via `profile.name`, tidak konsisten untuk walk-in |
| Manifest per keberangkatan | ✅ Ada | Sudah per-departure, ada PDF & CSV export |
| Link dari departure card ke manifest | ❌ Tidak ada | Hanya ada tombol download PDF, tidak ada navigasi ke halaman manifest interaktif |
| Batch/multiple booking sekaligus | ❌ Tidak ada | Harus submit satu per satu |
| Manifest snapshot history | ⚠️ Parsial | Schema ada (`manifests` table), UI tidak ada |

---

## Gap Analysis & Masalah Utama

### 1. Booking Tidak Bisa Lebih dari Satu (Critical)
- Dialog `AdminCreateBookingDialog.tsx` hanya submit **1 booking per kali**
- Tidak ada UI untuk menambah jamaah ke "keranjang" sebelum konfirmasi
- Agen/admin harus membuka dialog berulang kali untuk grup jamaah

### 2. Nama Pemesan Tidak Konsisten (High)
- Booking via `user_id` → nama diambil dari `profiles.name` (relasi join)
- Booking walk-in → nama disimpan di `booking_pilgrims.name` (bukan di `bookings`)
- Kolom `pic_name` ada di `bookings` tapi tidak selalu diisi
- **Akibat**: Di list booking, ada booking yang nama pemesannya kosong atau tidak muncul

### 3. Tidak Ada Navigasi Langsung ke Manifest per Departure (Medium)
- Di halaman Jadwal Keberangkatan, kartu departure hanya punya tombol "Download PDF"
- Tidak ada tombol "Lihat Manifest" yang membuka halaman manifest dengan departure tersebut sudah terpilih
- Admin harus masuk ke menu Manifest lalu pilih departure manual

### 4. Manifest Tidak Muncul Otomatis per Departure (Medium)
- Halaman Manifest (`/admin/manifest`) punya dropdown pilih departure
- Jika admin klik dari departure card, harusnya departure sudah ter-select otomatis

---

## Rencana Pengembangan

### FASE 1 — Perbaikan Nama Pemesan (Estimasi: 1-2 hari)

**Tujuan**: Nama pemesan selalu ada dan konsisten di semua booking.

#### 1.1 — Normalisasi kolom `pemesan_name` di tabel `bookings`

**Schema change** (additive, non-breaking):
```sql
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS pemesan_name TEXT,
  ADD COLUMN IF NOT EXISTS pemesan_phone TEXT;
```

**Aturan pengisian** (logic di backend):
- Jika ada `userId` → populate `pemesan_name` dari `profiles.name` saat insert
- Jika ada `customerName` → simpan ke `pemesan_name`  
- Fallback: ambil dari `booking_pilgrims` pertama yang terkait

#### 1.2 — Update Admin Create Booking

- Jadikan field **"Nama Pemesan"** wajib diisi (required), tidak bisa kosong
- Pisahkan konsep: *Pemesan* (orang yang pesan) vs *Jamaah* (orang yang berangkat)
- Tampilkan `pemesan_name` sebagai kolom utama di tabel booking list

#### 1.3 — Backfill data lama

Script migrasi untuk mengisi `pemesan_name` dari data yang sudah ada:
```ts
// Untuk booking dengan user_id, ambil dari profiles
// Untuk booking tanpa user_id, ambil dari booking_pilgrims pertama
```

**Files yang perlu diubah:**
- `lib/db/src/schema/bookings.ts` — tambah kolom
- `lib/db/drizzle.config.ts` + `drizzle-kit push`
- `artifacts/api-server/src/routes/admin/bookings.ts` — insert & select logic
- `artifacts/umroh-app/src/features/admin/pages/components/AdminCreateBookingDialog.tsx`
- `artifacts/umroh-app/src/features/admin/pages/Bookings.tsx` (BookingTable)

---

### FASE 2 — Booking Lebih dari Satu Sekaligus (Estimasi: 2-3 hari)

**Tujuan**: Admin bisa input beberapa jamaah dalam 1 sesi booking, lalu submit semua sekaligus.

#### 2.1 — Desain UX Baru: Multi-Jamaah Booking

Alur yang diusulkan:
```
[Pilih Paket & Keberangkatan]
        ↓
[Pilih Tipe Kamar & Skema Bayar]
        ↓
[Step: Tambah Jamaah]
  ┌─────────────────────────────────────────┐
  │ Jamaah 1: Nama Pemesan (required)       │
  │           Email, No. HP                  │
  │ [+ Tambah Jamaah]                        │
  │ Jamaah 2: Nama, Email, No. HP            │
  │ [+ Tambah Jamaah]                        │
  │ ...                                      │
  └─────────────────────────────────────────┘
        ↓
[Konfirmasi: ringkasan semua jamaah + total harga]
        ↓
[Submit → buat N bookings sekaligus]
```

#### 2.2 — Backend: Batch Booking Endpoint

Tambah endpoint baru: `POST /api/admin/bookings/batch`

```ts
// Payload
{
  packageId: string,
  departureId: string,
  roomType: "quad" | "triple" | "double",
  paymentScheme: "full" | "installment",
  branchId?: string,
  agentId?: string,
  notes?: string,
  jamaah: Array<{
    pemesan_name: string,
    pemesan_email?: string,
    pemesan_phone?: string,
    userId?: string,  // jika existing user
  }>
}

// Response
{
  created: Booking[],  // array booking yang berhasil dibuat
  failed: Array<{ index: number, error: string }>
}
```

- Gunakan **database transaction** — jika quota tidak cukup, rollback semua
- Quota check: validasi `remaining_quota >= jamaah.length` sebelum insert
- Generate `booking_code` unik per jamaah

#### 2.3 — Frontend: Multi-Step Dialog dengan Dynamic List

Komponen baru: `AdminBatchBookingDialog.tsx`
- Step 1: Pilih paket, departure, tipe kamar, skema bayar
- Step 2: Dynamic form — daftar jamaah (bisa add/remove row)
  - Setiap row: Nama Pemesan (required), Email, No. HP, atau pilih dari existing user
  - Tampilkan running total: "3 jamaah × Rp 27.500.000 = Rp 82.500.000"
  - Warning jika sisa quota tidak cukup
- Step 3: Preview & Konfirmasi ringkasan
- Submit → call `/api/admin/bookings/batch`
- Setelah sukses: tampilkan daftar booking code yang dibuat

**Files yang perlu dibuat/diubah:**
- `artifacts/api-server/src/routes/admin/bookings.ts` — tambah route `POST /batch`
- `artifacts/umroh-app/.../AdminBatchBookingDialog.tsx` — komponen baru
- `artifacts/umroh-app/.../Bookings.tsx` — tambah tombol "Booking Rombongan"

---

### FASE 3 — Manifest per Keberangkatan yang Terintegrasi (Estimasi: 1-2 hari)

**Tujuan**: Setiap departure punya akses langsung ke manifestnya.

#### 3.1 — Tombol "Lihat Manifest" di Departure Card

Di `Departures.tsx`, setiap kartu departure tambahkan tombol:

```
[📋 Lihat Manifest]  [📥 Download PDF]  [✏️ Edit]  [🗑️ Hapus]
```

Tombol "Lihat Manifest" → navigate ke `/admin/manifest?departureId=xxx`

#### 3.2 — Auto-select Departure di Halaman Manifest

Di `Manifest.tsx`:
- Baca query param `?departureId=xxx` saat halaman mount
- Jika ada, langsung set departure terpilih tanpa perlu pilih manual
- Highlight departure yang sedang aktif di dropdown

#### 3.3 — Manifest Summary di Departure Card

Tampilkan ringkasan cepat di kartu departure (data dari API yang sudah ada):
```
📋 Manifest: 28 jamaah confirmed | 2 pending dokumen
```
- API: `GET /api/admin/departures/:id/manifest-data?summary=true`
- Cukup tampilkan total confirmed + pending dokumen

#### 3.4 — Manifest History / Snapshot (Opsional)

Manfaatkan tabel `manifests` yang sudah ada tapi belum dipakai di UI:
- Tampilkan riwayat "Manifest dicetak pada [tanggal]" di departure card atau di halaman manifest
- Tombol "Lihat Manifest Sebelumnya" untuk audit trail

**Files yang perlu diubah:**
- `artifacts/umroh-app/.../Departures.tsx` — tambah tombol + ringkasan manifest
- `artifacts/umroh-app/.../Manifest.tsx` — baca query param, auto-select
- `artifacts/api-server/src/routes/admin/departures.ts` — tambah query param `summary=true`

---

## Prioritas Pengerjaan

| Fase | Fitur | Prioritas | Estimasi |
|---|---|---|---|
| **1.1-1.3** | Nama pemesan konsisten + wajib diisi | 🔴 Critical | 1-2 hari |
| **2.1-2.3** | Batch booking multi-jamaah | 🟠 High | 2-3 hari |
| **3.1-3.2** | Tombol manifest di departure card + auto-select | 🟡 Medium | 0.5 hari |
| **3.3** | Summary manifest di departure card | 🟡 Medium | 0.5 hari |
| **3.4** | Manifest history/snapshot UI | 🟢 Low | 1 hari |

**Total estimasi**: 5-8 hari kerja

---

## Tidak Ada Perubahan Breaking

Semua perubahan didesain **additive**:
- Kolom baru di DB pakai `ADD COLUMN IF NOT EXISTS` (tidak merusak data lama)
- Endpoint batch adalah endpoint **baru** (tidak mengganti yang lama)
- Tombol "Booking Rombongan" adalah tombol **tambahan** di samping yang sudah ada
- Navigasi manifest pakai query param opsional (backward compatible)

---

## Pertanyaan untuk Konfirmasi Sebelum Eksekusi

1. **Fase 2 — Batch booking**: Apakah setiap jamaah dalam satu batch **booking terpisah** (masing-masing punya `booking_code` sendiri), atau satu booking bersama dengan beberapa jamaah di dalamnya?
2. **Nama pemesan vs jamaah**: Apakah pemesan = jamaah pertama, atau bisa berbeda (misal, agen yang memesan untuk jamaah lain)?
3. **Urutan fase**: Mulai dari Fase 1 dulu, atau ada yang ingin diprioritaskan berbeda?
