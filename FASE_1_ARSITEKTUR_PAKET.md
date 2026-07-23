# FASE 1 — Refaktor Arsitektur Paket & Keberangkatan

> Estimasi: **~3 hari kerja**  
> Prasyarat: —  
> Status: 🔲 Belum dimulai

---

## Latar Belakang

Arsitektur saat ini menyimpan data hotel dan maskapai **langsung di level paket**, padahal setiap keberangkatan bisa punya hotel/maskapai yang berbeda. Refaktor ini memindahkan data tersebut ke level `package_departures`.

**Prinsip setelah refaktor:**
> **Paket** = Template / Produk yang dipasarkan  
> **Keberangkatan** = Instansi nyata dari paket, dengan tanggal, hotel, maskapai, harga, dan kuota spesifik

---

## 1.1 — Migrasi Database Schema

### Yang Perlu Dilakukan

**Tabel `packages` — Hapus kolom:**
- `hotelMakkahId`
- `hotelMadinahId`
- `airlineId`
- `airportId`

**Tabel `package_departures` — Tambah kolom:**
- `hotelMakkahId` (nullable, FK → hotels)
- `hotelMadinahId` (nullable, FK → hotels)

**Tabel `departure_hotels` — Ubah FK:**
- `packageId` → `departureId` (FK → package_departures)

**Urutan eksekusi (penting — jangan terbalik):**
1. Tambah kolom baru di `package_departures`
2. Salin data: `hotelMakkahId`, `hotelMadinahId` dari `packages` ke semua `package_departures` terkait
3. Update FK di `departure_hotels` dari `packageId` → `departureId`
4. Hapus kolom lama di `packages`

```bash
# Setelah update schema Drizzle:
cd lib/db && pnpm drizzle-kit push
```

---

## 1.2 — Backend API

### Route `POST /api/admin/packages` (Buat Paket)
- **Hapus** field dari body & validasi: `hotelMakkahId`, `hotelMadinahId`, `airlineId`, `airportId`
- **Tambah** petunjuk: paket tidak wajib punya keberangkatan saat dibuat

### Route `POST /api/admin/departures` (Buat Keberangkatan)
- **Tambah** field: `hotelMakkahId`, `hotelMadinahId`
- **Tambah** field: `extraHotels` (array: `{ hotelId, label, sortOrder }`)
- Validasi: `packageId` wajib ada

### Route `GET /api/packages/:slug` (Publik / Booking)
- Response harus ambil hotel & maskapai dari `package_departures`, bukan dari `packages`
- Harga diambil dari `departure_prices`

### Route `GET /api/admin/packages/:id` (Admin Detail)
- Include keberangkatan beserta hotel, maskapai, dan harganya

---

## 1.3 — Frontend Admin

### Form "Tambah / Edit Paket"
- **Hapus** seksi: Hotel Makkah, Hotel Madinah, Maskapai, Bandara
- **Tetap ada**: Nama, Slug, Kategori, Tipe Paket, Durasi, DP, Deadline, Foto, Deskripsi
- Tambah catatan UI: *"Hotel dan maskapai diatur di setiap keberangkatan"*

### Form "Tambah / Edit Keberangkatan"
- **Tambah** field: Hotel Makkah (Select → tabel hotels)
- **Tambah** field: Hotel Madinah (Select → tabel hotels)
- **Tambah** field: Extra Hotels (dynamic list: hotel + label + urutan)
- **Tetap ada**: Tanggal, Kuota, Maskapai, Bandara, Nomor Penerbangan, Muthawif
- **Tetap ada**: Harga per tipe kamar (quad/triple/double/single)

### Halaman Detail Paket (Admin)
- Tampilkan daftar keberangkatan beserta hotel & maskapai masing-masing
- Bisa tambah/edit/hapus keberangkatan dari halaman ini

### Halaman Publik / Booking
- Pilgrim pilih **keberangkatan** (bukan paket langsung)
- Tampilkan hotel dan maskapai sesuai keberangkatan yang dipilih
- Harga ditampilkan per tipe kamar dari `departure_prices`

---

## 1.4 — Dampak ke Fitur Lain

| Fitur | Dampak | Tindakan |
|---|---|---|
| **Booking / Pemesanan** | Booking terhubung ke `departureId` (sudah benar) | Pastikan tampilan booking ambil hotel dari departure |
| **Cicilan (Installment)** | Tidak terdampak langsung | Cek referensi harga dari departure_prices |
| **PDF Itinerary** | Hotel dalam PDF harus dari departure | Update template PDF |
| **Landing Page CMS** | Kartu paket tampil tanpa hotel spesifik | Tampilkan range harga dari keberangkatan terdekat |
| **Laporan / Analytics** | Query join packages–hotels perlu diupdate | Update query di dashboard stats |

---

## Checklist Selesai

- [ ] Migration Drizzle: kolom hotel dipindah dari `packages` ke `package_departures`
- [ ] Data lama sudah dimigrasikan (tidak ada data hilang)
- [ ] Route POST packages tidak terima hotel/maskapai lagi
- [ ] Route POST/PUT departures menerima hotel Makkah & Madinah
- [ ] Form paket (admin) tidak tampilkan field hotel/maskapai
- [ ] Form keberangkatan (admin) tampilkan field hotel Makkah, Madinah, extra hotels
- [ ] Halaman publik/booking ambil hotel dari departure
- [ ] PDF itinerary ambil hotel dari departure
- [ ] Testing end-to-end: buat paket → tambah keberangkatan → booking

---

## Pertanyaan yang Perlu Dijawab Sebelum Mulai

1. **Hotel wajib atau opsional di keberangkatan?** — Boleh simpan keberangkatan tanpa hotel dulu (status draft)?
2. **Berapa hotel ekstra maksimal per keberangkatan?** — Perlu batasan UI?
3. **Tampilan kartu paket di landing page?** — Range harga semua keberangkatan, atau harga keberangkatan terdekat?
4. **`departure_hotels` perlu field jumlah malam?** — Misal: "3 malam di Makkah, 4 malam di Madinah"

---

*Setelah fase ini selesai → lanjut ke [Fase 2](FASE_2_FONDASI_KEUANGAN.md) dan/atau [Fase 3](FASE_3_OPERASIONAL_LAPANGAN.md) (bisa paralel)*
