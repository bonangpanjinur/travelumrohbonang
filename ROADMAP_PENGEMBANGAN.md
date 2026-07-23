# ROADMAP PENGEMBANGAN — Arsitektur Paket & Keberangkatan

> Dibuat: 23 Juli 2026  
> Status: **FASE 1 ✅ SELESAI | FASE 2 ✅ SELESAI | FASE 3 & 4 — Belum Dikerjakan**

---

## 🔍 Masalah Saat Ini

### Kondisi Arsitektur Lama

Tabel `packages` saat ini menyimpan data hotel dan maskapai **langsung di level paket**:

```
packages
├── hotelMakkahId   ← FK ke hotels
├── hotelMadinahId  ← FK ke hotels
├── airlineId       ← FK ke airlines
└── airportId       ← FK ke airports
```

Tabel `package_departures` juga punya `airlineId` dan airport — sehingga terjadi **duplikasi dan ambiguitas**: data mana yang dipakai, di paket atau di keberangkatan?

### Akibatnya

- Form "Tambah Paket" memaksa admin mengisi hotel dan maskapai, padahal belum tentu setiap keberangkatan pakai hotel/maskapai yang sama.
- Satu paket **tidak bisa fleksibel** punya keberangkatan dengan hotel atau maskapai berbeda (misal: paket Reguler dengan keberangkatan Januari di hotel bintang 3, Maret di hotel bintang 4).
- Data hotel di `packages` dan airline di `package_departures` tidak sinkron — mana yang jadi sumber kebenaran tidak jelas.

---

## ✅ Arsitektur yang Diusulkan

### Prinsip Utama

> **Paket** = Template / Produk yang dipasarkan  
> **Keberangkatan** = Instansi nyata dari paket, dengan tanggal, hotel, maskapai, harga, dan kuota yang spesifik

### Struktur Tabel Baru

```
packages (template produk)
├── id
├── title
├── slug
├── description
├── imageUrl
├── durationDays
├── packageType          (regular, vip, premium, dll)
├── categoryId           → package_categories
├── isActive
├── requiredDocTypes     (JSON)
├── minDpPercent
├── dpDeadlineDays
├── pelunasanDeadlineDays
└── [HAPUS] hotelMakkahId, hotelMadinahId, airlineId, airportId

package_departures (keberangkatan spesifik)
├── id
├── packageId            → packages
├── departureDate
├── returnDate
├── quota
├── remainingQuota
├── status               (draft, open, full, closed, departed)
├── flightNumber
├── notes
│
├── [PINDAH KE SINI] hotelMakkahId   → hotels
├── [PINDAH KE SINI] hotelMadinahId  → hotels
├── airlineId            → airlines   ✓ (sudah ada)
├── departureAirportId   → airports   ✓ (sudah ada)
├── arrivalAirportId     → airports   ✓ (sudah ada)
└── muthawifId           → muthawifs  ✓ (sudah ada)

departure_prices (harga per tipe kamar per keberangkatan)
├── id
├── departureId          → package_departures
├── roomType             (quad, triple, double, single)
└── price

departure_hotels (hotel tambahan per keberangkatan — opsional)
├── id
├── departureId          → package_departures  ← [DIUBAH dari packageId]
├── hotelId              → hotels
├── label
└── sortOrder
```

### Diagram Relasi

```
packages (1) ──────────── (N) package_departures
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              departure_prices  hotels (Makkah)  airlines
              (quad/triple/     hotels (Madinah)  airports
               double/single)   departure_hotels  muthawifs
                                 (extra hotels)
```

---

## 📋 Rencana Perubahan Detail

### FASE 1 — Migrasi Database Schema

**1.1 — Tabel `packages`: Hapus kolom hotel & maskapai**
- Hapus: `hotelMakkahId`, `hotelMadinahId`, `airlineId`, `airportId`
- Buat migration Drizzle untuk menghapus kolom ini (setelah data dipindah)

**1.2 — Tabel `package_departures`: Tambah kolom hotel**
- Tambah: `hotelMakkahId` (nullable, FK → hotels)
- Tambah: `hotelMadinahId` (nullable, FK → hotels)

**1.3 — Tabel `departure_hotels`: Ubah FK dari package ke departure**
- Ubah: `packageId` → `departureId` (FK → package_departures)
- Ini untuk hotel ekstra (selain Makkah & Madinah)

**1.4 — Migrasi Data (jika ada data existing)**
- Salin `hotelMakkahId`, `hotelMadinahId`, `airlineId` dari `packages` ke semua `package_departures` terkait
- Jalankan sebelum menghapus kolom lama

---

### FASE 2 — Backend API

**2.1 — Route `POST /api/admin/packages` (Buat Paket)**
- **Hapus** field: `hotelMakkahId`, `hotelMadinahId`, `airlineId`, `airportId`
- **Tambah** validasi: paket tidak wajib punya keberangkatan saat dibuat

**2.2 — Route `POST /api/admin/departures` (Buat Keberangkatan)**
- **Tambah** field: `hotelMakkahId`, `hotelMadinahId`
- **Tambah** field: `extraHotels` (array: `{ hotelId, label, sortOrder }`)
- Validasi: `packageId` wajib ada

**2.3 — Route `GET /api/packages/:slug`** (untuk publik/booking)
- Response harus flatten dari keberangkatan, bukan dari paket
- Harga, hotel, maskapai diambil dari `departure_prices` dan `package_departures`

**2.4 — Route `GET /api/admin/packages/:id`**
- Include keberangkatan beserta hotel, maskapai, dan harganya

---

### FASE 3 — Frontend Admin

**3.1 — Form "Tambah / Edit Paket"**
- **Hapus** seksi: Hotel Makkah, Hotel Madinah, Maskapai, Bandara
- **Tetap ada**: Nama, Slug, Kategori, Tipe Paket, Durasi, DP, Deadline, Foto, Deskripsi
- Tambah petunjuk UI: *"Hotel dan maskapai diatur di setiap keberangkatan"*

**3.2 — Form "Tambah / Edit Keberangkatan"**
- **Tambah** field: Hotel Makkah (Select), Hotel Madinah (Select)
- **Tambah** field: Extra Hotels (dynamic list)
- **Tetap ada**: Tanggal, Kuota, Maskapai, Bandara, Nomor Penerbangan, Muthawif
- **Tetap ada**: Harga per tipe kamar (quad/triple/double/single)

**3.3 — Halaman Detail Paket (Admin)**
- Tampilkan daftar keberangkatan beserta hotel & maskapai masing-masing
- Bisa tambah/edit/hapus keberangkatan dari halaman ini

**3.4 — Halaman Publik / Booking**
- Pilgrim pilih **keberangkatan** (bukan paket langsung)
- Tampilkan hotel dan maskapai sesuai keberangkatan yang dipilih
- Harga ditampilkan per tipe kamar dari `departure_prices`

---

### FASE 4 — Dampak ke Fitur Lain

| Fitur | Dampak | Tindakan |
|---|---|---|
| **Booking / Pemesanan** | Booking terhubung ke `departureId` (sudah benar) | Pastikan tampilan booking ambil hotel dari departure |
| **Cicilan (Installment)** | Tidak terdampak langsung | Cek referensi harga dari departure_prices |
| **PDF Itinerary** | Hotel dalam PDF harus dari departure | Update template PDF |
| **Landing Page CMS** | Kartu paket tampil tanpa hotel spesifik | Tampilkan range harga dari keberangkatan terdekat |
| **Laporan / Analytics** | Query yang join packages-hotels perlu diupdate | Update query di dashboard stats |

---

## 🚫 Di Luar Lingkup Rencana Ini

- Fitur manajemen hotel dan maskapai (masterdata) — tidak berubah
- Sistem autentikasi dan otorisasi — tidak berubah
- Fitur dokumen pilgrim — tidak berubah
- Sistem pembayaran / cicilan — tidak berubah (hanya perlu cek referensi harga)

---

## 📌 Urutan Pengerjaan yang Direkomendasikan

```
1. Finalisasi rancangan ini (review bersama)
2. Migrasi schema DB (Drizzle migration)
3. Update backend routes & validation
4. Update form Tambah/Edit Paket (hapus hotel & maskapai)
5. Update form Tambah/Edit Keberangkatan (tambah hotel)
6. Update halaman publik & booking
7. Update PDF dan laporan
8. Testing end-to-end (buat paket → tambah keberangkatan → booking)
```

---

## ❓ Pertanyaan untuk Didiskusikan

1. **Hotel wajib atau opsional di keberangkatan?** — Apakah boleh simpan keberangkatan tanpa memilih hotel dulu (status draft)?
2. **Berapa hotel ekstra maksimal per keberangkatan?** — Perlu batasan UI?
3. **Bagaimana tampilan kartu paket di landing page?** — Tampilkan harga dari keberangkatan terdekat, atau range harga semua keberangkatan?
4. **Apakah `departure_hotels` perlu field keterangan malam?** — Misal: "3 malam di hotel X, 4 malam di hotel Y"

---

*Dokumen ini adalah rancangan awal. Implementasi dimulai setelah ada persetujuan.*
