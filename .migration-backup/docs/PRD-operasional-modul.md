# PRD — Modul Operasional Admin: Analisis, Saran UX, & Rencana Eksekusi

## 1. Pemetaan UI/UX Saat Ini

### Kondisi Eksisting

| Modul | Route | Kondisi | Masalah UX |
|---|---|---|---|
| Paket Umroh | `/admin/packages` | ✅ Full CRUD | Kategori tidak bisa dikelola langsung dari UI |
| Keberangkatan | `/admin/departures` | ✅ Full CRUD | Galeri per keberangkatan ada di menu terpisah |
| Itinerary | `/admin/itineraries` | ✅ Builder per departure | Oke |
| Booking | `/admin/bookings` | ⚠️ View only | **Tidak ada tombol "Buat Booking" dari admin** |
| Jemaah | `/admin/pilgrims` | ✅ Full CRUD + CSV | Oke |
| Manifest | `/admin/manifest` | ✅ View + QR + Print | Oke |
| Galeri Keberangkatan | `/admin/departure-gallery` | ⚠️ Halaman terpisah | **Logikanya menyatu dengan Keberangkatan, bukan standalone** |
| Manasik Kit | `/admin/manasik` | ✅ Full CRUD | Oke |
| Dokumen Jemaah | `/admin/documents` | ✅ Premium feature | Oke |

### Masalah UX Utama

1. **Galeri Keberangkatan** terpisah dari Keberangkatan → admin harus pindah halaman hanya untuk upload foto satu departure.
2. **Kategori Paket** tidak ada halaman CRUD → admin tidak bisa tambah/edit/hapus kategori dari panel.
3. **Booking dari Admin** tidak ada → walk-in customer, booking via telepon, atau bypass flow publik tidak bisa dilakukan.
4. **Navigasi sidebar** memiliki 10 item Operasional tanpa sub-grouping → cognitive overload.

---

## 2. Saran UX yang Lebih Baik

### A. Galeri Keberangkatan → Inline per Departur
**Before:** Menu sidebar "Galeri Keberangkatan" → halaman baru → pilih keberangkatan dari dropdown.  
**After:** Tombol ikon 📷 di setiap baris tabel Keberangkatan → panel/dialog langsung menampilkan galeri departure tersebut.  
**Gain:** 0 navigasi tambahan, konteks jelas, tidak perlu pilih departure lagi.

### B. Kategori Paket → Halaman CRUD Terpisah
**Before:** Tidak ada UI → admin tidak bisa kelola kategori.  
**After:** Halaman `/admin/package-categories` dengan tabel + dialog CRUD (nama, deskripsi, parent, urutan, status aktif).  
**Gain:** Admin bisa buat hierarki kategori (misal: Reguler > Hemat, Plus > VIP).

### C. Booking dari Admin → Form Wizard
**Before:** Tidak ada.  
**After:** Tombol "Tambah Booking" di halaman Bookings → dialog multi-step: (1) Pilih paket & keberangkatan, (2) Pilih pelanggan / walk-in, (3) Tipe kamar & harga, (4) Skema pembayaran & catatan.  
**Gain:** Admin bisa input booking walk-in, booking via telepon, atau booking atas nama jemaah.

---

## 3. Pemetaan SQL

### Tabel yang Sudah Ada (tidak perlu DDL baru)

```sql
-- package_categories (sudah ada)
-- id, name, description, parent_id, sort_order, is_active, created_at

-- bookings (sudah ada)  
-- id, booking_code (via generate_booking_code()), user_id, package_id, departure_id,
-- total_price, currency, status, payment_scheme, agent_id, branch_id, notes

-- booking_pilgrims (sudah ada)
-- id, booking_id, name, gender, birth_date, nik, passport_number, phone, email

-- booking_rooms (sudah ada)
-- id, booking_id, room_type, price_per_person, num_persons

-- profiles (sudah ada)
-- id, name, email, phone

-- departure_gallery (sudah ada)
-- id, departure_id, image_url, caption, sort_order, created_at
```

### Fungsi DB yang Dipakai

```sql
-- Auto-generate booking code (sudah ada di DB)
SELECT generate_booking_code();
-- → Menghasilkan kode seperti "BK-2024-001234"
```

### Tidak Ada DDL Baru
Semua fitur baru menggunakan tabel yang sudah ada. Tidak perlu migration.

---

## 4. Rencana Eksekusi

### ✅ FASE 1 — Kategori Paket CRUD
- **Komponen baru:** `AdminPackageCategories.tsx`
- **Route baru:** `/admin/package-categories`
- **Nav:** Ditambahkan ke grup "Master Data"
- **Fitur:** Tabel kategori, tambah/edit/hapus, toggle aktif, support parent kategori

### ✅ FASE 2 — Galeri Keberangkatan Dipindah ke Inline
- **Komponen diubah:** `AdminDepartures.tsx`
- **Tambahan:** Tombol 📷 di setiap baris → Dialog inline `DepartureGalleryPanel`
- **Nav:** Hapus "Galeri Keberangkatan" dari sidebar Operasional (standalone page masih ada sebagai fallback)
- **Komponen baru:** `DepartureGalleryPanel.tsx` (reusable dialog-embedded version)

### ✅ FASE 3 — Booking dari Admin
- **Komponen diubah:** `AdminBookings.tsx`
- **Tambahan:** Tombol "Tambah Booking" + Dialog `AdminCreateBookingDialog`
- **Komponen baru:** `AdminCreateBookingDialog.tsx`
- **Flow:**
  1. Pilih paket → filter keberangkatan
  2. Pilih keberangkatan → tampilkan harga per room type
  3. Cari/pilih pelanggan (dari `profiles`) atau isi nama walk-in
  4. Pilih tipe kamar & hitung total
  5. Pilih skema pembayaran (full/dp)
  6. Opsional: cabang, agen, catatan
  7. Submit → `generate_booking_code()` + insert ke `bookings`

---

## 5. Prioritas

| Fase | Effort | Impact | Prioritas |
|---|---|---|---|
| Fase 1: Kategori Paket | Rendah | Sedang | 🟡 Medium |
| Fase 2: Galeri Inline | Sedang | Tinggi | 🟢 High |
| Fase 3: Admin Booking | Tinggi | Sangat Tinggi | 🔴 Critical |
