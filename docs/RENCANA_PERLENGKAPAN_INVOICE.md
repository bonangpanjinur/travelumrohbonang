# Rencana Fitur: Modul Perlengkapan & Invoice/Kwitansi Booking

Dokumen ini mencakup dua fitur besar yang diminta:

1. **Modul Perlengkapan** — master item, stok gudang, distribusi ke jemaah, terhubung ke paket & keuangan.
2. **Invoice & Kwitansi Booking** — tagihan (invoice) dan bukti pembayaran (kwitansi) yang bisa dicetak/diunduh oleh admin dan pembeli.

Keputusan yang sudah diambil user:

- Perlengkapan mencakup: master item + item bawaan per paket + distribusi per jemaah + integrasi keuangan.
- Manajemen stok penuh (in/out, sisa stok, alert menipis).
- Dokumen booking: **invoice** (tagihan) + **kwitansi** per pembayaran (kedua-duanya).
- Akses: admin + pembeli sendiri (pembeli hanya lihat/unduh milik sendiri).

---

## Bagian 1 — Modul Perlengkapan

### 1.1 Ruang lingkup

| Sub-modul | Fungsi utama |
|---|---|
| Master Item | CRUD katalog perlengkapan (koper, seragam pria/wanita, tas, buku manasik, ihram, dll) + harga pokok |
| Stok Gudang | Catat stok masuk (pembelian), stok keluar (distribusi), sisa stok, alert menipis (< min_stock) |
| Paket → Item Bawaan | Set item default per paket (mis. paket VIP dapat koper besar + seragam premium; paket ekonomi dapat koper standar) |
| Distribusi ke Jemaah | Tandai item yang sudah diserahkan ke tiap jemaah pada satu keberangkatan, dengan tanggal & petugas |
| Integrasi Keuangan | Pembelian stok tercatat sebagai `expense` di `financial_transactions`; HPP perlengkapan per booking tercatat sebagai cost paket |

### 1.2 Skema Database (baru)

Semua tabel `public.*`, dengan GRANT + RLS. Kolom standar `id/created_at/updated_at` tidak diulas kecuali khusus.

**`equipment_items`** — master item
- `name` text, `sku` text unique, `category` text (koper|seragam|tas|buku|ihram|lainnya), `unit` text (pcs|set), `cost_price` numeric, `min_stock` int, `image_url` text, `is_active` boolean.

**`equipment_stock_movements`** — log semua pergerakan stok
- `item_id` fk → equipment_items, `movement_type` text (in|out|adjustment), `quantity` int, `unit_cost` numeric nullable, `reference_type` text (purchase|distribution|adjustment), `reference_id` text nullable, `notes` text, `created_by` uuid.
- View turunan `equipment_stock_levels` (sum in − sum out per item) untuk baca cepat sisa stok.

**`package_equipment`** — item bawaan default per paket
- `package_id` fk, `item_id` fk, `quantity_per_pilgrim` int (default 1), `is_included_in_price` boolean.
- Unique (package_id, item_id).

**`pilgrim_equipment_distributions`** — distribusi ke tiap jemaah
- `booking_pilgrim_id` fk → booking_pilgrims, `item_id` fk, `booking_id` fk, `departure_id` fk, `quantity` int, `distributed_at` timestamp, `distributed_by` uuid, `notes` text, `status` text (pending|distributed|returned).
- Trigger: saat status → distributed, otomatis buat `equipment_stock_movements` (out) + `financial_transactions` (cost).

**RLS singkat:**
- Admin/staff: full CRUD semua tabel di atas.
- Agent/buyer: **tidak** punya akses ke tabel perlengkapan (internal ops).

### 1.3 UI Admin (halaman baru)

```
/admin/equipment                → dashboard: total item, item stok menipis, distribusi hari ini
/admin/equipment/items          → master item (tabel + dialog create/edit)
/admin/equipment/stock          → riwayat pergerakan + form stok masuk (pembelian)
/admin/equipment/packages       → set item bawaan per paket
/admin/equipment/distributions  → distribusi per keberangkatan (pilih departure → list jemaah + checklist item)
```

Menu di `adminMenuConfig.ts`, kelompok "Operasional", visible untuk `super_admin`, `admin`, `branch_manager`, `staff`.

### 1.4 Integrasi dengan modul lain

- **Paket** (`/admin/packages`): tab baru "Perlengkapan Bawaan" — pilih item + qty per jemaah.
- **Keberangkatan** (`/admin/departures`): tombol "Distribusi Perlengkapan" → route ke halaman distribusi terpra-filter.
- **Manifest Jemaah**: kolom badge status distribusi (belum/sudah).
- **Accounting** (`/admin/accounting`): pembelian stok otomatis muncul sebagai transaksi `expense` kategori `perlengkapan`.

---

## Bagian 2 — Invoice & Kwitansi Booking

### 2.1 Perbedaan dua dokumen

| Dokumen | Isi | Kapan dibuat | Sumber data |
|---|---|---|---|
| **Invoice** (tagihan) | Nomor, tgl terbit, jatuh tempo, rincian paket + kamar + jemaah, subtotal, diskon (kupon), total, status bayar, sisa tagihan | Otomatis saat booking dibuat, satu invoice per booking | `bookings` + `booking_rooms` + `booking_pilgrims` + `packages` + `coupons` |
| **Kwitansi** (bukti terima) | Nomor kwitansi, tgl bayar, dari (nama pembeli), jumlah, metode, untuk pembayaran DP/cicilan/pelunasan, saldo terbaru | Otomatis saat pembayaran diverifikasi (status → paid) | `payments` (satu kwitansi per row payment yang paid) |

### 2.2 Perubahan Database

**`bookings`** — tambah kolom:
- `invoice_number` text unique nullable — format `INV/YYMM/<seq6>`, digenerate saat booking dibuat.
- `invoice_issued_at` timestamptz.

**`payments`** — tambah kolom:
- `receipt_number` text unique nullable — format `KW/YYMM/<seq6>`, digenerate saat status → `paid`/`verified`.
- `receipt_issued_at` timestamptz.

**Fungsi & trigger baru** (Postgres):
- `generate_invoice_number()` — sequence bulanan.
- `generate_receipt_number()` — sequence bulanan.
- Trigger `bookings BEFORE INSERT` → set `invoice_number` + `invoice_issued_at`.
- Trigger `payments AFTER UPDATE` → set `receipt_number` + `receipt_issued_at` saat pertama kali status ke `paid`.

### 2.3 Endpoint (API server)

```
GET /api/bookings/:id/invoice        → JSON data lengkap invoice (untuk render HTML/PDF di client)
GET /api/payments/:id/receipt        → JSON data lengkap kwitansi

GET /api/admin/bookings/:id/invoice  → sama, tanpa constraint kepemilikan (admin)
GET /api/admin/payments/:id/receipt  → sama
```

RLS/authorization:
- Pembeli: hanya boleh akses invoice/kwitansi milik booking di mana `bookings.user_id = auth.uid()`.
- Admin/staff/finance: akses semua.
- Struktur error mengikuti `docs/ADMIN_API_ERROR_SCHEMA.md`.

### 2.4 Rendering (frontend)

Reuse pola `InvoiceGenerator` yang sudah ada (`features/admin/components/InvoiceGenerator.tsx`), pecah jadi 2 template:

- `renderInvoiceHTML(data)` — kop surat, rincian tagihan, jadwal pembayaran (DP + pelunasan + jatuh tempo).
- `renderReceiptHTML(data)` — layout kwitansi klasik: "Sudah terima dari … sejumlah … untuk pembayaran …".

Komponen tombol:
- `<InvoiceButton bookingId />` — sudah ada, dipertahankan.
- `<ReceiptButton paymentId />` — baru, mirror `InvoiceButton`.

Tempat pemasangan:
- **Admin**: kolom aksi di `/admin/bookings` (invoice) & `/admin/payments` (kwitansi).
- **Pembeli**: halaman `/dashboard/bookings/:id` — tombol "Unduh Invoice" + list pembayaran dengan tombol "Unduh Kwitansi" per row.

Semua cetakan pakai `openInvoicePrintWindow` (window.print) — konsisten dengan implementasi sekarang, tidak perlu library PDF baru.

---

## Bagian 3 — Urutan Eksekusi

Dipecah menjadi 4 milestone kecil supaya bisa direview per bagian.

### Milestone A — Invoice & Kwitansi (2–3 jam)
1. Migrasi kolom `invoice_number` / `receipt_number` + trigger generator nomor.
2. Endpoint GET invoice & receipt (admin + pembeli, dengan RLS check).
3. Split `InvoiceGenerator` jadi 2 template + komponen `ReceiptButton`.
4. Pasang tombol di admin (bookings, payments) & dashboard pembeli.

### Milestone B — Perlengkapan: Fondasi (2–3 jam)
1. Migrasi 4 tabel + view `equipment_stock_levels` + RLS + GRANT.
2. Endpoint CRUD `equipment_items`, `equipment_stock_movements`, `package_equipment`.
3. Halaman `/admin/equipment/items` + `/admin/equipment/stock`.
4. Item menu di sidebar admin.

### Milestone C — Perlengkapan: Distribusi & Paket (2 jam)
1. Endpoint CRUD `pilgrim_equipment_distributions`.
2. Halaman `/admin/equipment/packages` (set item bawaan per paket).
3. Halaman `/admin/equipment/distributions` (per-departure checklist per jemaah).
4. Trigger stock-out + financial_transactions saat distribusi.

### Milestone D — Integrasi & Polish (1 jam)
1. Tab "Perlengkapan Bawaan" di halaman edit paket.
2. Badge status distribusi di manifest.
3. Filter kategori `perlengkapan` di Accounting.
4. Alert stok menipis di dashboard admin.

---

## Bagian 4 — Yang **tidak** dikerjakan (agar scope jelas)

- Tidak menghubungkan ke gudang eksternal / sistem ERP lain.
- Tidak ada auto-reorder saat stok menipis (hanya alert).
- Tidak ada e-signature / QR authenticity pada invoice/kwitansi (bisa ditambah nanti).
- Tidak mengubah alur pembayaran atau verifikasi yang sudah ada.
- Tidak mengubah `bookings.total_price` — perlengkapan dianggap sudah termasuk harga paket kecuali `is_included_in_price=false` (fase 2, di luar rencana ini).

---

## Bagian 5 — Konfirmasi sebelum eksekusi

Setelah dokumen ini disetujui, saya mulai dari **Milestone A** (invoice & kwitansi) karena paling cepat memberi hasil terlihat, lalu lanjut ke B → C → D. Setiap milestone akan di-verifikasi build hijau + screenshot sebelum lanjut.

Beri tahu jika ada yang mau diubah/dihilangkan, atau langsung "gas milestone A".
