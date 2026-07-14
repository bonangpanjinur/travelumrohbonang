# Rencana Lengkap: Modul Perlengkapan + Invoice/Kwitansi Booking

Satu dokumen terkonsolidasi berisi seluruh fitur yang diminta. Semua yang belum ada di sistem sekarang, akan dibangun sesuai rencana ini.

**Ringkasan cakupan:**

1. **Modul Perlengkapan** — master item, stok gudang penuh (in/out/adjust/alert), item bawaan per paket, distribusi per jemaah per keberangkatan, integrasi keuangan.
2. **Invoice Booking** — tagihan resmi per booking, dengan nomor unik, dapat diakses & dicetak/diunduh di **admin (halaman Bookings & Payments)** dan **portal pembeli (halaman My Bookings/Detail Booking)**.
3. **Kwitansi Pembayaran** — bukti terima per transaksi pembayaran (DP / cicilan / pelunasan), otomatis terbit saat pembayaran diverifikasi, dapat diakses di admin & pembeli.

**Keputusan user yang sudah dikunci:**

- Perlengkapan: master item + paket→item bawaan + distribusi jemaah + integrasi keuangan (semua empat).
- Stok: manajemen penuh (masuk, keluar, sisa, alert menipis).
- Dokumen booking: invoice + kwitansi (kedua-duanya).
- Akses: admin + pembeli sendiri.
- Invoice **wajib muncul di menu Booking** — baik di admin (`/admin/bookings`) maupun di sisi pembeli (`/dashboard/bookings/:id`).

---

## Bagian A — Modul Perlengkapan

### A.1 Sub-modul & Fungsi

| Sub-modul | Halaman | Fungsi utama |
|---|---|---|
| Master Item | `/admin/equipment/items` | CRUD katalog perlengkapan: koper, seragam pria/wanita, tas, buku manasik, ihram, ID card, dll. Kolom: nama, SKU, kategori, unit, harga pokok, stok minimum, foto, aktif. |
| Stok Gudang | `/admin/equipment/stock` | Catat pergerakan stok (in/out/adjust) + form pembelian (stok masuk) → auto-post ke keuangan. Tabel riwayat + filter per item & periode. |
| Paket → Item Bawaan | `/admin/equipment/packages` | Untuk tiap paket, set item bawaan default: qty per jemaah, apakah sudah termasuk harga paket. |
| Distribusi Jemaah | `/admin/equipment/distributions` | Pilih keberangkatan → tampil semua jemaah paket tsb + checklist item yang sudah/belum diserahkan, dengan tgl & petugas. |
| Dashboard | `/admin/equipment` | Ringkasan: total item, item stok menipis (<= min_stock), distribusi hari ini, total nilai stok. |

### A.2 Skema Database

Semua tabel `public.*`, GRANT + RLS di migration yang sama.

**`equipment_items`** — master
```
id uuid PK, name text NOT NULL, sku text UNIQUE, category text NOT NULL,
unit text DEFAULT 'pcs', cost_price numeric(14,2) DEFAULT 0,
min_stock int DEFAULT 0, image_url text, is_active bool DEFAULT true,
branch_id uuid REFERENCES branches(id) NULL,
created_at/updated_at timestamptz
```

**`equipment_stock_movements`** — log semua gerakan
```
id uuid PK, item_id uuid FK → equipment_items ON DELETE RESTRICT,
movement_type text CHECK IN ('in','out','adjustment'),
quantity int NOT NULL,          -- +/- terhadap saldo
unit_cost numeric(14,2),        -- untuk 'in' (pembelian)
reference_type text,            -- 'purchase' | 'distribution' | 'adjustment' | 'return'
reference_id text,              -- pointer ke record sumber (distribution id, dll)
notes text, created_by uuid, created_at timestamptz
```

**View `equipment_stock_levels`** — baca cepat sisa stok
```
SELECT item_id, SUM(quantity) AS on_hand
FROM equipment_stock_movements GROUP BY item_id
```

**`package_equipment`** — item bawaan per paket
```
id uuid PK, package_id uuid FK, item_id uuid FK,
quantity_per_pilgrim int DEFAULT 1,
is_included_in_price bool DEFAULT true,
UNIQUE(package_id, item_id)
```

**`pilgrim_equipment_distributions`** — distribusi per jemaah
```
id uuid PK, booking_pilgrim_id uuid FK,
booking_id uuid FK, departure_id uuid FK, item_id uuid FK,
quantity int DEFAULT 1,
status text CHECK IN ('pending','distributed','returned') DEFAULT 'pending',
distributed_at timestamptz, distributed_by uuid,
notes text, created_at/updated_at timestamptz,
UNIQUE(booking_pilgrim_id, item_id)
```

**Trigger otomatis:**

- `trg_distribution_stock_out` — saat `status` berubah ke `distributed`, insert `equipment_stock_movements` (out) + insert `financial_transactions` (type=`expense`, category=`perlengkapan`, amount = quantity × cost_price, reference_id = distribution id).
- `trg_distribution_stock_return` — saat `status` berubah ke `returned`, insert movement in + reversing financial transaction.
- `trg_stock_movement_guard` — cegah `out` kalau saldo item < quantity (untuk konsistensi hard).

**RLS:**
- `super_admin`, `admin`, `branch_manager`, `staff` → full CRUD.
- Role lain → tidak punya akses (semua tabel perlengkapan internal ops).
- GRANT hanya ke `authenticated` (bukan `anon`) + `service_role`.

### A.3 Endpoint API

```
GET/POST/PATCH/DELETE  /api/admin/equipment/items
GET/POST               /api/admin/equipment/movements     (POST = pembelian/adjustment)
GET/POST/DELETE        /api/admin/equipment/package-mappings
GET/POST/PATCH         /api/admin/equipment/distributions
GET                    /api/admin/equipment/stock-levels  (join view)
GET                    /api/admin/equipment/low-stock     (WHERE on_hand <= min_stock)
```

Validasi pakai Zod (skema baru di `lib/api-zod/src/schemas/equipment.ts`). Error struktur mengikuti `docs/ADMIN_API_ERROR_SCHEMA.md`.

### A.4 UI Frontend

- Direktori baru `artifacts/umroh-app/src/features/equipment/`
  - `pages/EquipmentDashboard.tsx`
  - `pages/EquipmentItems.tsx`
  - `pages/EquipmentStock.tsx`
  - `pages/EquipmentPackageMapping.tsx`
  - `pages/EquipmentDistributions.tsx`
  - `components/ItemFormDialog.tsx`, `StockInDialog.tsx`, `DistributionChecklist.tsx`, `LowStockBadge.tsx`
- Semua tabel pakai `ResponsiveTable` + `useAdminPagination` (pola yang sudah ada).
- Dialog konfirmasi hapus/serah pakai `DeleteAlertDialog` / `ConfirmAlertDialog` (bukan native confirm).
- Menu sidebar admin ditambah di `adminMenuConfig.ts` kelompok "Operasional":
  ```
  Perlengkapan (icon: Package)
   ├─ Dashboard
   ├─ Master Item
   ├─ Stok Gudang
   ├─ Item per Paket
   └─ Distribusi Jemaah
  ```

### A.5 Integrasi dengan Modul Lain

| Modul target | Perubahan |
|---|---|
| `/admin/packages` edit page | Tab baru **"Perlengkapan Bawaan"** — pilih item + qty per jemaah. |
| `/admin/departures` | Tombol **"Distribusi Perlengkapan"** → route ke halaman distribusi terpra-filter `departureId`. |
| `/admin/manifest` | Kolom badge kecil per jemaah: `n/N item` (n=distributed, N=total item bawaan paket). Klik → dialog checklist. |
| `/admin/accounting` | Filter kategori `perlengkapan` tersedia. Transaksi pembelian & distribusi otomatis muncul. |
| Dashboard admin utama | Widget "Stok Menipis" (top 5 item dengan `on_hand <= min_stock`). |

---

## Bagian B — Invoice Booking

### B.1 Kebutuhan

- Setiap booking otomatis punya **nomor invoice** unik format `INV/YYMM/<seq6>` (mis. `INV/2607/000123`).
- Invoice bisa **dicetak** (window print) dan **diunduh** (HTML → print-to-PDF).
- Akses:
  - **Admin**: dari `/admin/bookings` (kolom aksi tabel) dan detail booking.
  - **Pembeli**: dari `/dashboard/bookings` (list) dan `/dashboard/bookings/:id` (detail).
- Isi invoice: kop surat tenant, nomor + tgl terbit + jatuh tempo, data pembeli, rincian paket + kamar + jemaah + kupon, subtotal/diskon/total, ringkasan pembayaran (sudah dibayar & sisa), status.

### B.2 Skema Database

Tambah kolom di `bookings`:
```
invoice_number     text UNIQUE
invoice_issued_at  timestamptz
invoice_due_date   date            -- diambil dari dp_deadline paket
```

Fungsi + trigger:
- `generate_invoice_number()` PL/pgSQL — sequence bulanan pakai `advisory lock`.
- Trigger `bookings BEFORE INSERT` → set `invoice_number` + `invoice_issued_at` + `invoice_due_date`.
- Backfill migration untuk booking eksisting (isi nomor retroaktif berdasarkan `created_at`).

### B.3 Endpoint

```
GET /api/bookings/:id/invoice              (pembeli — cek user_id)
GET /api/admin/bookings/:id/invoice        (admin/staff/finance)
```

Response JSON: seluruh data yang dibutuhkan untuk render (booking + rooms + pilgrims + package + branch/tenant + payments summary + coupon).

### B.4 Frontend

- Reuse `features/admin/components/InvoiceGenerator.tsx` — refactor jadi `shared/lib/invoice/`:
  - `fetchInvoiceData(bookingId, mode: 'admin'|'buyer')`
  - `renderInvoiceHTML(data)` — template baru dengan branding tenant dinamis.
  - `openInvoicePrintWindow(html)` — sudah ada.
- Komponen `<InvoiceButton bookingId variant size />` — sudah ada, dipakai kembali di:
  - `/admin/bookings` (kolom aksi tabel).
  - `/admin/payments` detail row.
  - `/dashboard/bookings` (list, tiap row).
  - `/dashboard/bookings/:id` (tombol utama di header detail).
- Header cetak menampilkan logo & alamat dari `site_settings` (tenant-aware).

---

## Bagian C — Kwitansi Pembayaran

### C.1 Kebutuhan

- Setiap pembayaran yang **terverifikasi** (status `paid`) mendapat **nomor kwitansi** unik format `KW/YYMM/<seq6>`.
- Isi: nomor, tgl bayar, dari (nama pembeli), untuk (booking code + jenis pembayaran DP/cicilan/pelunasan), jumlah, metode, saldo tagihan setelah pembayaran, TTD digital (nama admin verifikator).
- Akses:
  - **Admin**: dari `/admin/payments` (tabel + detail).
  - **Pembeli**: dari `/dashboard/bookings/:id` — list pembayaran, tombol "Unduh Kwitansi" per row (hanya untuk status paid).

### C.2 Skema Database

Tambah kolom di `payments`:
```
receipt_number     text UNIQUE
receipt_issued_at  timestamptz
verified_by        uuid            -- id user admin yang verifikasi
```

Trigger:
- `payments AFTER UPDATE` — saat `status` transisi ke `paid` untuk pertama kali, set `receipt_number` + `receipt_issued_at`, dan set `verified_by = auth.uid()` (dari policy invoker jika lewat API).

### C.3 Endpoint

```
GET /api/payments/:id/receipt              (pembeli — cek kepemilikan via bookings.user_id)
GET /api/admin/payments/:id/receipt        (admin)
```

### C.4 Frontend

- `shared/lib/receipt/`:
  - `fetchReceiptData(paymentId, mode)`
  - `renderReceiptHTML(data)` — layout kwitansi klasik.
- Komponen baru `<ReceiptButton paymentId />` (mirror `InvoiceButton`).
- Dipasang di:
  - `/admin/payments` — kolom aksi (hanya untuk row status paid).
  - `/dashboard/bookings/:id` — list payment history, tombol per row paid.

---

## Bagian D — Perubahan File & Migrasi

### D.1 Migrations (Supabase)

1. `equipment_schema` — buat 4 tabel + view + trigger + RLS + GRANT (Bagian A).
2. `booking_invoice_numbering` — kolom + fungsi + trigger + backfill (Bagian B).
3. `payment_receipt_numbering` — kolom + trigger (Bagian C).

Semua migration mengikuti aturan proyek: `CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY`.

### D.2 File Baru (garis besar)

Backend (`artifacts/api-server/src/routes/admin/`):
- `equipment-items.ts`, `equipment-movements.ts`, `equipment-mappings.ts`, `equipment-distributions.ts`
- `invoice.ts` (invoice + receipt endpoint, admin & user variant)

Zod (`lib/api-zod/src/schemas/`):
- `equipment.ts`, `invoice.ts`

Frontend (`artifacts/umroh-app/src/features/equipment/`) — lihat A.4.

Frontend shared (`artifacts/umroh-app/src/shared/lib/`):
- `invoice/renderer.ts`, `invoice/fetcher.ts`
- `receipt/renderer.ts`, `receipt/fetcher.ts`

Komponen (`artifacts/umroh-app/src/shared/components/documents/`):
- `InvoiceButton.tsx` (pindah dari features/booking/components, generalisasi)
- `ReceiptButton.tsx` (baru)

### D.3 File yang Disentuh

- `artifacts/umroh-app/src/features/admin/config/adminMenuConfig.ts` — menu Perlengkapan.
- `artifacts/umroh-app/src/features/admin/pages/AdminBookings.tsx` — kolom Invoice.
- `artifacts/umroh-app/src/features/admin/pages/AdminPayments.tsx` — kolom Kwitansi.
- `artifacts/umroh-app/src/features/admin/pages/AdminPackages.tsx` — tab Perlengkapan Bawaan.
- `artifacts/umroh-app/src/features/admin/pages/AdminManifest.tsx` — badge distribusi.
- `artifacts/umroh-app/src/features/booking/pages/BookingList.tsx` (pembeli) — tombol invoice per row.
- `artifacts/umroh-app/src/features/booking/pages/BookingDetail.tsx` (pembeli) — tombol invoice utama + list payment dengan tombol kwitansi.
- `artifacts/umroh-app/src/App.tsx` — route baru untuk halaman equipment.

---

## Bagian E — Urutan Eksekusi (Milestone)

Total estimasi ~8-10 jam. Setiap milestone diakhiri build hijau + screenshot verifikasi.

### Milestone 1 — Invoice di Booking (admin + pembeli) [~2 jam]
1. Migrasi `booking_invoice_numbering` + backfill.
2. Endpoint invoice admin & pembeli.
3. Refactor `InvoiceGenerator` → `shared/lib/invoice/`.
4. Pasang `InvoiceButton` di `/admin/bookings`, `/dashboard/bookings`, `/dashboard/bookings/:id`.
5. Verifikasi cetak.

### Milestone 2 — Kwitansi Pembayaran [~1.5 jam]
1. Migrasi `payment_receipt_numbering`.
2. Endpoint kwitansi.
3. Renderer + `ReceiptButton`.
4. Pasang di `/admin/payments` dan `/dashboard/bookings/:id`.

### Milestone 3 — Perlengkapan: Fondasi [~2.5 jam]
1. Migrasi `equipment_schema` (4 tabel + view + trigger + RLS + GRANT).
2. Endpoint items + movements + stock-levels.
3. Halaman `EquipmentDashboard`, `EquipmentItems`, `EquipmentStock`.
4. Menu sidebar admin.

### Milestone 4 — Perlengkapan: Paket & Distribusi [~2 jam]
1. Endpoint mappings + distributions.
2. Halaman `EquipmentPackageMapping` + `EquipmentDistributions`.
3. Trigger stock-out + auto-post financial_transactions.

### Milestone 5 — Integrasi & Polish [~1 jam]
1. Tab "Perlengkapan Bawaan" di edit paket.
2. Badge distribusi di Manifest.
3. Tombol distribusi di halaman Departures.
4. Widget stok menipis di dashboard admin.
5. Filter kategori `perlengkapan` di Accounting.

---

## Bagian F — Yang **Tidak** Termasuk (Out of Scope)

- Tidak ada e-signature/QR authenticity di invoice/kwitansi.
- Tidak ada auto-reorder / integrasi supplier.
- Tidak menghubungkan ke ERP eksternal.
- Tidak mengubah `bookings.total_price` berdasarkan pilihan perlengkapan (semua item bawaan default dianggap sudah termasuk kecuali `is_included_in_price=false` — kolom sudah disiapkan untuk fase berikutnya).
- Tidak menambah library PDF baru (pakai window.print → save as PDF; sudah cukup dan konsisten dengan implementasi sekarang).
- Tidak mengubah alur verifikasi pembayaran yang sudah berjalan.

---

## Bagian G — Konfirmasi

Setelah rencana ini disetujui, saya mulai dari **Milestone 1** karena paling cepat memberi nilai (invoice langsung terlihat di menu Booking sesuai permintaan), lalu berlanjut ke 2 → 3 → 4 → 5.

Beri tahu jika ada bagian yang mau diubah/ditambah/dihilangkan, atau langsung ketik "gas milestone 1" untuk mulai eksekusi.
