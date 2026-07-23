# FASE 3 — Operasional Lapangan

> Estimasi: **~5.5 hari kerja**  
> Prasyarat: Fase 1 selesai  
> Status: 🔲 Belum dimulai

---

## Ringkasan

Fase ini menyelesaikan fitur operasional yang dibutuhkan di lapangan: manajemen distribusi perlengkapan, tracking visa, assignment kursi pesawat, dan pre-departure checklist otomatis.

---

## O-8 — Distribusi Perlengkapan + Stok Rekonsiliasi

**Estimasi: 1.5 hari | Prioritas: Tinggi**

### Gap Saat Ini
- Equipment assignment hanya bisa via detail view jamaah (1 per 1)
- `equipment.total_stock` tidak auto-decrement saat status = `distributed`
- Tidak ada laporan stok (tersedia / didistribusikan / dikembalikan)

### Backend yang Perlu Diubah

**File: `artifacts/api-server/src/routes/admin/pilgrim-equipment.ts`**

Tambah endpoint:
- `POST /api/admin/equipment/bulk-assign` — bulk assign item ke banyak jamaah sekaligus
  - Body: `{ departureId, equipmentId, assignments: [{ bookingPilgrimId, size? }] }`
  - Auto-decrement `total_stock` saat mark distributed
- `PATCH /api/admin/equipment/bulk-status` — bulk update status (pending/distributed/returned)
  - Auto-increment `total_stock` saat mark returned
- `GET /api/admin/equipment/stock-report` — laporan stok per item
  - Return: tersedia / didistribusikan / dikembalikan per equipment

**File: `lib/db/src/schema/masterdata.ts`**
- Pastikan logic stok (total_stock) konsisten saat bulk operations

### Frontend yang Perlu Dibuat

**File: `artifacts/umroh-app/src/features/admin/pages/EquipmentDistribution.tsx`** (BARU)

Alur halaman:
1. Pilih keberangkatan → tampilkan semua jamaah di keberangkatan tersebut
2. Pilih item perlengkapan (dari master equipment)
3. Bulk assign: centang jamaah → klik "Distribusikan"
4. Status per item per jamaah: `pending` → `distributed` → `returned`
5. Panel rekap: stok tersedia / terdistribusi / dikembalikan per item
6. Export laporan distribusi ke CSV/Excel

---

## O-9 — Visa Tracking (Status Pengajuan)

**Estimasi: 1.5 hari | Prioritas: Tinggi**

### Gap Saat Ini
Visa hanya berupa upload dokumen. Tidak ada tracking status pengajuan visa ke kedutaan/imigrasi.

### Schema Baru

```sql
-- lib/db/src/schema/visa.ts (file baru)
CREATE TABLE visa_applications (
  id               TEXT PRIMARY KEY,
  booking_id       TEXT NOT NULL REFERENCES bookings(id),
  pilgrim_id       TEXT NOT NULL REFERENCES booking_pilgrims(id),
  status           TEXT NOT NULL DEFAULT 'draft',
  -- draft | submitted | processing | approved | rejected | expired
  submitted_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  expiry_date      DATE,
  rejection_reason TEXT,
  visa_number      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### Backend yang Perlu Dibuat

**File: `artifacts/api-server/src/routes/admin/visa.ts`** (BARU):
- `GET /api/admin/visa?departureId=X&status=Y` — list aplikasi visa per keberangkatan
- `POST /api/admin/visa/bulk` — buat visa application untuk semua jamaah di booking/departure
- `PATCH /api/admin/visa/bulk-status` — bulk update status
  - Body: `{ ids: string[], status: string, notes?: string }`
- `GET /api/admin/visa/stats?departureId=X` — statistik: berapa % sudah approved

### Frontend yang Perlu Diubah

**File: `artifacts/umroh-app/src/features/admin/pages/VisaTracking.tsx`** (sudah ada, perlu upgrade):

Fitur yang perlu ditambah:
- Tabel jamaah + status visa (badge berwarna: draft=abu / submitted=biru / processing=kuning / approved=hijau / rejected=merah)
- Bulk update status (select semua "submitted" → mark "processing")
- Filter per keberangkatan + status
- Alert: visa expired / expiring dalam 90 hari sebelum keberangkatan
- Bar progress: berapa % sudah approved per departure

---

## O-10 — Assignment Kursi Pesawat

**Estimasi: 1 hari | Prioritas: Sedang**

### Gap Saat Ini
Tidak ada assignment kursi pesawat per jamaah.

### Schema yang Perlu Diubah

```sql
-- Tambah ke booking_pilgrims (lib/db/src/schema/bookings.ts)
ALTER TABLE booking_pilgrims
  ADD COLUMN seat_number   TEXT,     -- contoh: 14A
  ADD COLUMN flight_segment TEXT;    -- contoh: MH-1234-GO / SV-7654-RETURN
```

### Backend yang Perlu Diubah

**File: `artifacts/api-server/src/routes/admin/room-assignment.ts`** atau file baru:
- `GET /api/admin/seat-assignment/:departureId` — list jamaah + seat saat ini
- `PATCH /api/admin/seat-assignment/bulk` — bulk assign nomor kursi
  - Body: `{ assignments: [{ bookingPilgrimId, seatNumber, flightSegment }] }`
  - Validasi: kursi tidak double-assign per flight segment

### Frontend yang Perlu Dibuat

**File: `artifacts/umroh-app/src/features/admin/pages/SeatAssignment.tsx`** (sudah ada, perlu diperluas):
- Tab per segment penerbangan (GO / RETURN / transit jika ada)
- Grid input nomor kursi per jamaah (bisa inline edit di tabel)
- Validasi duplikat kursi (highlight merah jika ada konflik)
- Export daftar kursi ke manifest airline

---

## O-11 — Pre-departure Checklist Otomatis

**Estimasi: 1.5 hari | Prioritas: Sedang**

### Gap Saat Ini
Tidak ada sistem checklist otomatis H-N sebelum keberangkatan.

### Schema Baru

```sql
-- Tambah ke lib/db/src/schema/masterdata.ts atau file baru
CREATE TABLE departure_checklists (
  id            TEXT PRIMARY KEY,
  departure_id  TEXT NOT NULL REFERENCES package_departures(id),
  h_minus       INTEGER NOT NULL,   -- 60, 30, 14, 7, 3
  item          TEXT NOT NULL,
  is_done       BOOLEAN DEFAULT false,
  done_by       TEXT REFERENCES profiles(id),
  done_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Template Checklist Default

| H- | Item |
|----|------|
| H-60 | Cek kelengkapan dokumen jamaah (paspor, visa) |
| H-30 | Konfirmasi hotel & tiket dengan vendor |
| H-30 | Cek sisa piutang dan cicilan overdue |
| H-14 | Distribusi perlengkapan manasik |
| H-14 | Finalisasi manifest jamaah |
| H-7  | Kirim reminder briefing/manasik ke jamaah |
| H-7  | Cek cicilan yang masih overdue |
| H-3  | Konfirmasi transportasi ke bandara |
| H-3  | Verifikasi check-in online maskapai |

### Backend yang Perlu Dibuat

- `GET /api/admin/departures/:id/checklist` — list checklist per departure (auto-generate jika belum ada)
- `PATCH /api/admin/departures/:id/checklist/:itemId` — mark done/undone
- Cron harian (tambah ke cron existing): scan departure dalam 60 hari ke depan, generate checklist jika belum ada

### Frontend yang Perlu Diubah

**Tambah tab "Checklist" di halaman detail keberangkatan atau `DepartureDetailDrawer.tsx`:**
- List checklist dikelompokkan per H-
- Checkbox per item + siapa yang mark done + kapan
- Badge counter: `X / Y selesai`
- Notifikasi in-app ke admin saat H-60/30/14/7/3

---

## Checklist Selesai

### O-8
- [ ] Endpoint bulk-assign equipment berjalan
- [ ] Auto-decrement/increment total_stock berfungsi
- [ ] Endpoint stock-report berjalan
- [ ] Halaman EquipmentDistribution.tsx bisa bulk assign per departure

### O-9
- [ ] Schema `visa_applications` dibuat & push ke DB
- [ ] Endpoint CRUD visa berjalan
- [ ] Bulk status update berfungsi
- [ ] Halaman VisaTracking.tsx tampilkan status + progress per departure

### O-10
- [ ] Kolom `seat_number` & `flight_segment` ditambah ke `booking_pilgrims`
- [ ] Endpoint bulk seat assignment berjalan
- [ ] Validasi kursi double-assign berfungsi
- [ ] Halaman SeatAssignment.tsx bisa input + export

### O-11
- [ ] Schema `departure_checklists` dibuat & push ke DB
- [ ] Endpoint list + mark done berjalan
- [ ] Cron auto-generate checklist berjalan
- [ ] UI checklist muncul di detail keberangkatan

---

*Setelah fase ini selesai → lanjut ke [Fase 5](FASE_5_COMPLIANCE_PENGUATAN.md)*
