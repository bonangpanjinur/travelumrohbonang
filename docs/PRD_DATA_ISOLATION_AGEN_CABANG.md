# PRD: Isolasi Data Agen & Cabang (Multi-Tenant Privacy)

**Versi:** 1.2  
**Tanggal:** 28 Juli 2026  
**Status:** Sprint A ✅ — Sprint B ✅ — Sprint C ✅ — Sprint D ✅ — Sprint E ✅ — **SEMUA SELESAI**

---

## 1. Latar Belakang & Masalah

Saat ini sistem memiliki role `agent` dan `branch_manager` yang sudah bisa login ke panel admin, namun **tidak ada pembatasan data di sisi server**. Artinya:

- Seorang agen bisa melihat semua booking milik agen lain
- Branch manager bisa melihat booking cabang lain
- Sub-agen di bawah satu cabang bisa melihat data sub-agen lain dalam cabang yang sama
- Tidak ada privasi antar agen, antar cabang, maupun antara agen dengan cabang induknya

Ini adalah risiko bisnis dan privasi yang serius — komisi, jumlah jamaah, dan performa penjualan setiap agen adalah data sensitif yang tidak boleh terekspos ke kompetitor sesama agen.

---

## 2. Tujuan

1. **Privasi penuh antar agen** — setiap agen hanya melihat booking yang dia tangani sendiri
2. **Privasi penuh antar cabang** — branch manager hanya melihat booking di cabangnya
3. **Sub-agen terisolasi** — agen di bawah cabang yang sama tidak bisa saling melihat data
4. **Hierarki tetap terjaga** — admin/owner/super_admin tetap bisa lihat segalanya
5. **Tidak ada perubahan UI yang besar** — filter diterapkan di backend secara otomatis, transparan ke frontend

---

## 3. Pengguna & Role yang Terdampak

| Role | Akses Saat Ini | Akses Setelah Implementasi |
|------|---------------|---------------------------|
| `super_admin` | Semua data | Semua data (tidak berubah) |
| `owner` | Semua data | Semua data (tidak berubah) |
| `admin` | Semua data | Semua data (tidak berubah) |
| `branch_manager` | Semua data ⚠️ | Hanya data cabangnya sendiri |
| `finance` | Semua data keuangan ⚠️ | Hanya keuangan cabangnya sendiri |
| `staff` | Semua data ⚠️ | Hanya data cabangnya sendiri |
| `agent` | Semua data ⚠️ | Hanya booking yang dia tangani |

---

## 4. Definisi Kepemilikan Data

### 4.1 Booking "Milik" Siapa?

Sebuah booking dianggap milik seorang **agen** jika salah satu kondisi berikut terpenuhi:
- `bookings.agent_id = agents.id` (agen di-assign langsung ke booking)
- `bookings.pic_type = 'agen' AND bookings.pic_id = agents.id` (agen sebagai PIC)

Sebuah booking dianggap milik sebuah **cabang** jika:
- `bookings.branch_id = branches.id`

### 4.2 Siapa yang Bisa Melihat Apa?

```
super_admin / owner / admin
  └── Lihat SEMUA data tanpa filter

branch_manager (profiles.branch_id = X)
  └── Lihat semua booking di branch_id = X
  └── Termasuk booking yang dibuat oleh agen di bawah cabang tersebut
  └── TIDAK bisa lihat booking cabang lain

finance (profiles.branch_id = X)
  └── Lihat data keuangan (payments, ledger) untuk booking di branch_id = X
  └── TIDAK bisa lihat keuangan cabang lain

staff (profiles.branch_id = X)
  └── Lihat booking di branch_id = X
  └── TIDAK bisa lihat booking cabang lain

agent (agents.user_id = me)
  └── Lihat HANYA booking miliknya sendiri (agent_id = agents.id ATAU pic_id match)
  └── TIDAK bisa lihat agen lain bahkan dalam cabang yang sama
  └── TIDAK bisa lihat booking tanpa PIC yang bukan miliknya
```

### 4.3 Tabel yang Terimbas Isolasi

Isolasi harus diterapkan secara **cascade** — jika booking ter-filter, semua data turunannya ikut ter-filter otomatis:

| Tabel / Endpoint | Dasar Filter |
|-----------------|--------------|
| `bookings` | `agent_id` / `pic_id` / `branch_id` |
| `booking_pilgrims` | via `booking_id` → booking milik saya |
| `booking_payments` | via `booking_id` → booking milik saya |
| `booking_rooms` | via `booking_id` → booking milik saya |
| `booking_status_logs` | via `booking_id` |
| `installments` | via `booking_id` |
| `documents` (jemaah) | via `booking_id` / `pilgrim_id` |
| `agent_commissions` | `agent_id` langsung |
| `crm leads` | `pic_id` / `agent_id` di leads |
| `reports / analytics` | scope ke booking miliknya |
| `manifest` | hanya keberangkatan yang punya booking miliknya |

---

## 5. User Stories

### Agen
- **US-1:** Sebagai agen, saya bisa melihat daftar booking yang saya tangani, dan tidak bisa melihat booking agen lain
- **US-2:** Sebagai agen, saya bisa melihat data jemaah dari booking saya saja
- **US-3:** Sebagai agen, saya bisa melihat pembayaran dari booking saya saja
- **US-4:** Sebagai agen, saya bisa melihat komisi yang saya terima, tidak komisi agen lain
- **US-5:** Sebagai agen, saya tidak bisa mengubah booking milik agen lain walaupun tahu ID-nya (direct URL manipulation)

### Branch Manager
- **US-6:** Sebagai branch manager, saya bisa melihat semua booking di cabang saya, termasuk dari berbagai agen di cabang saya
- **US-7:** Sebagai branch manager, saya tidak bisa melihat booking cabang lain
- **US-8:** Sebagai branch manager, saya bisa melihat performa semua agen di bawah cabang saya

### Admin / Owner
- **US-9:** Sebagai admin, saya tetap bisa melihat semua data dari semua cabang dan agen
- **US-10:** Sebagai admin, saya bisa filter per cabang atau per agen untuk review

---

## 6. Non-Goals (Tidak Dikerjakan di Sprint Ini)

- RLS (Row Level Security) di Supabase — isolasi cukup di Application Layer
- Sharing booking antar agen secara manual
- Notifikasi ketika booking di-reassign ke agen lain
- Portal agen terpisah (bukan bagian dari scope ini)

---

## 7. Acceptance Criteria

1. **AC-1:** Agen `A` login, hit `GET /api/admin/bookings` tanpa filter → hanya dapat booking miliknya
2. **AC-2:** Agen `A` hit `GET /api/admin/bookings/:id` milik agen `B` → dapat `403 Forbidden`
3. **AC-3:** Branch manager cabang `X` hit `GET /api/admin/bookings` → hanya dapat booking cabang `X`
4. **AC-4:** Admin hit `GET /api/admin/bookings` → dapat semua booking tanpa filter
5. **AC-5:** Agen hit `GET /api/admin/bookings/:id/payments` milik agen lain → `403 Forbidden`
6. **AC-6:** Filter UI (branchId, agentId) di frontend tetap berfungsi untuk admin/owner, tapi diabaikan (di-override) untuk role terbatas
7. **AC-7:** Export Excel booking untuk agen hanya mengandung booking miliknya

---

# RENCANA PENGEMBANGAN

## Arsitektur Solusi

### Pendekatan: `ScopeGuard` Middleware + Helper `resolveUserScope`

Dibuat satu utility function `resolveUserScope(req)` yang membaca role user saat ini dan mengembalikan **scope object** yang digunakan semua route untuk membangun WHERE clause:

```typescript
interface UserScope {
  type: 'global'            // admin/owner/super_admin — no filter
  | 'branch'               // branch_manager/staff/finance — filter by branch_id
  | 'agent';               // agent — filter by agent_id/pic_id
  branchId?: string;       // populated for 'branch' type
  agentId?: string;        // populated for 'agent' type
}
```

### Alur Kerja

```
Request masuk
     │
     ▼
resolveUserScope(req)
     │
     ├── super_admin/owner/admin → { type: 'global' }
     ├── branch_manager/staff/finance → { type: 'branch', branchId: profiles.branch_id }
     └── agent → { type: 'agent', agentId: agents.id where agents.user_id = req.user.id }
     │
     ▼
Route handler panggil buildScopeCondition(scope) → SQL WHERE fragment
     │
     ▼
Query dieksekusi dengan scope filter
```

---

## Sprint Breakdown

### SPRINT A — Fondasi Scope ✅ SELESAI
**Selesai:** 28 Juli 2026

#### A-1: ✅ Buat `resolveUserScope` utility
- `artifacts/api-server/src/lib/scopeGuard.ts` — sudah ada dan berfungsi
- Cache per-request via `req.resolvedScope`
- Mendukung role: `global` (super_admin/owner/admin), `branch` (branch_manager/staff/finance), `agent`

#### A-2: ✅ Buat `buildBookingScope(scope)` SQL helper
- `artifacts/api-server/src/lib/scopeConditions.ts` — sudah ada
- `buildBookingScopeCondition()` — menghasilkan SQL fragment WHERE
- `isBookingInScope()` — post-fetch ownership check
- `scopeDeniedMessage()` — pesan 403 yang informatif per role

#### A-3: ✅ Pasang scope di `GET /api/admin/bookings`
- List query + count query → scope diinjek
- `GET /stats` → scope diinjek
- `GET /export.xlsx` → scope diinjek

#### A-4: ✅ Guard `GET /api/admin/bookings/:id` dan sub-routes
- `GET /:id` → 403 jika di luar scope
- `GET /:id/invoice-data` → 403 jika di luar scope (local DB + Supabase fallback)
- `GET /:id/passport-recommendation-data` → 403 jika di luar scope (local DB + Supabase fallback)

---

### SPRINT B — Cascade ke Jemaah & Pembayaran ✅ SELESAI
**Selesai:** 28 Juli 2026

#### B-1: ✅ Scope `booking_pilgrims` (Jemaah per Booking) — SELESAI 28 Jul 2026
- `GET /api/admin/bookings` list — `pilgrimsCount` & `firstJamaahName` subqueries terikat ke `b.id` yang sudah scope-filtered → implicitly scoped ✅
- `GET /api/admin/bookings/:id` detail — pilgrims di-fetch setelah `isBookingInScope` guard → already guarded ✅
- `POST /api/admin/bookings/:id/pilgrims` — scope guard ditambahkan: fetch `branchId/agentId/picType/picId`, call `isBookingInScope` → 403 jika di luar scope ✅

#### B-2: ✅ Scope pembayaran — SELESAI 28 Jul 2026
- `GET /api/admin/bookings/:id/payments` → `isBookingInScope` guard sudah ada di L467 (`payments.ts`) ✅
- `GET /api/admin/payments/all` → `buildBookingScopeCondition` sudah diinjek via `scopeCondition` ✅
- `GET /api/admin/payments/recent-pending` → `buildBookingScopeCondition` sudah diinjek ✅

#### B-3: ✅ Scope installments — SELESAI 28 Jul 2026
- `GET /api/admin/installments` → `buildBookingScopeCondition` sudah ada di query ✅
- `GET /api/admin/installments/packages`, `/departures` → scoped via booking JOIN ✅

#### B-4: ✅ Export Excel — SELESAI 28 Jul 2026
- `GET /api/admin/bookings/export.xlsx` → `resolveUserScope` + `buildBookingScopeCondition` sudah diinjek (L64–65 `bookings.ts`) ✅

---

### SPRINT C — Scope Analytics & Laporan ✅ SELESAI
**Selesai:** 28 Juli 2026

#### C-1: ✅ Dashboard stats agen — SELESAI 28 Jul 2026
- `GET /api/admin/bookings/stats` → `buildBookingScopeCondition` sudah diinjek (L286–287 `bookings.ts`) ✅
- `GET /api/admin/analytics/dashboard-stats` → scope ditambahkan: `total_bookings`, `pending_payments`, `total_pilgrims`, `total_revenue`, `monthly_trend` semua di-filter per scope ✅
  - File: `artifacts/api-server/src/routes/admin/analytics.ts`

#### C-2: ✅ Laporan keuangan cabang — SELESAI 28 Jul 2026
- `GET /api/admin/finance/dashboard` (`/summary`) → scope ditambahkan ke semua 7 subquery (piutang, lunas, cashflow, upcoming departures, aging, payment type breakdown, bulan ini) ✅
- `GET /api/admin/finance/piutang` → `AND ${scopeCond}` ditambahkan ke WHERE clause ✅
- `GET /api/admin/finance/departures` → scope diinjek ke CTE `booking_agg` ✅
  - File: `artifacts/api-server/src/routes/admin/finance.ts`

#### C-3: ✅ Komisi agen — SELESAI 28 Jul 2026
- `GET /api/admin/agents/commissions` → jika `scope.type === 'agent'`, filter `WHERE agent_id = scope.agentId` ✅
  - File: `artifacts/api-server/src/routes/admin/agents.ts`

---

### SPRINT D — CRM & Manifest ✅ SELESAI
**Selesai:** 28 Juli 2026

#### D-1: ✅ CRM leads — scope per agen/cabang — SELESAI 28 Jul 2026
- `GET /api/admin/crm/leads` → agen hanya lihat leads miliknya via `assigned_to = agentId OR assigned_to = userId` ✅
- `GET /api/admin/crm/leads/:id` → 403 jika agen mengakses lead bukan miliknya ✅
  - File: `artifacts/api-server/src/routes/admin/crm.ts`

#### D-2: ✅ Manifest keberangkatan — SELESAI 28 Jul 2026
- `GET /api/admin/departures/:id/manifest-data` → scope check: verifikasi ada booking milik user di departure ini, 403 jika tidak ada ✅
  - File: `artifacts/api-server/src/routes/admin/departures.ts`

#### D-3: ✅ Dokumen jemaah — SELESAI 28 Jul 2026
- `GET /api/admin/pilgrim-documents/pilgrims` → scoped via booking JOIN + `WHERE ${scopeCond}` ✅
  - File: `artifacts/api-server/src/routes/admin/pilgrim-documents.ts`

---

### SPRINT E — UI & UX Refinement ✅ SELESAI
**Selesai:** 28 Juli 2026

#### E-1: ✅ Sembunyikan filter yang tidak relevan — SELESAI 28 Jul 2026
- Agen login → filter "Cabang" disembunyikan sepenuhnya (`role !== 'agent'`) ✅
- Branch manager / finance / staff → filter "Cabang" ditampilkan tapi di-disable dengan placeholder "Cabang Anda (otomatis)" ✅
  - File: `artifacts/umroh-app/src/features/admin/pages/Bookings.tsx` (L368)

#### E-2: ✅ Label scope di header panel — SELESAI 28 Jul 2026
- Dashboard menampilkan badge berwarna sesuai role:
  - Agen → badge biru "Data Agen: [Nama] — hanya booking yang Anda tangani"
  - Branch manager → badge hijau "Data Cabang Anda — hanya booking cabang ini"
  - Finance → badge amber "Data Cabang Anda"
- File: `artifacts/umroh-app/src/features/admin/pages/Dashboard.tsx`

#### E-3: ✅ Pesan error yang informatif — SELESAI 28 Jul 2026
- Komponen `AccessDenied` dibuat: tampilkan ikon ShieldX + pesan "Anda tidak memiliki akses ke data ini" + tombol kembali ke dashboard ✅
- Semua backend 403 sudah mengembalikan pesan dalam Bahasa Indonesia ✅
  - File baru: `artifacts/umroh-app/src/shared/components/ui/AccessDenied.tsx`

---

## Urutan Prioritas Pengerjaan

```
SPRINT A (Fondasi)          ✅ SELESAI
    → harus selesai sebelum sprint lain
    
SPRINT B (Cascade Jemaah & Bayar)  ✅ SELESAI  ─── paralel dengan C
SPRINT C (Analytics)               ✅ SELESAI  ─── paralel dengan B

SPRINT D (CRM & Manifest)   ✅ SELESAI
    → setelah B & C selesai
    
SPRINT E (UI Refinement)    ✅ SELESAI
    → paling terakhir, setelah semua backend selesai
```

---

## Pekerjaan Lanjutan (Follow-up Tasks)

Item berikut belum dikerjakan dan dicatat sebagai follow-up:

| # | Judul | Kategori |
|---|-------|----------|
| Task #2 | Scope **mutation** endpoints (POST/PATCH/DELETE payments, installments, CRM) agar agen tidak bisa edit data di luar scopenya | incomplete_scope |
| Task #3 | Tampilkan nama cabang yang sebenarnya di badge scope (branch manager) — perlu expose `branchId` + `branchName` dari backend ke frontend | incomplete_scope |
| Task #4 | Auto-set `assigned_to` = `agentId` saat agen buat lead baru, agar filter CRM bekerja konsisten | tech_debt |

---

## Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Agen lupa assign `agent_id` saat buat booking | Booking tidak ter-scope ke siapapun, jadi "orphan" | Admin/owner tetap bisa lihat; tambahkan validasi wajib pilih PIC saat buat booking |
| Branch manager tidak punya `profiles.branch_id` | Scope kosong → lihat nol data | Tambahkan guard: jika scope=branch tapi branchId null → return 400 dengan pesan "Akun belum dikonfigurasi ke cabang manapun" |
| Performance: scope query lebih berat | Latency naik | Pastikan `bookings.agent_id` dan `bookings.branch_id` sudah ada INDEX (sudah ada di schema) |
| Sub-agen di bawah cabang bisa saling melihat? | Privasi antar agen dalam 1 cabang | Scope agent selalu by `agent_id`, bukan `branch_id` — sehingga sub-agen satu cabang tetap terisolasi satu sama lain |
| `leads.assigned_to` menyimpan nilai tidak konsisten | Filter CRM D-1 bisa miss beberapa leads | Filter saat ini mengecek BOTH `agentId` AND `userId` sebagai fallback; follow-up Task #4 akan standarisasi |

---

## File Utama yang Dimodifikasi

```
artifacts/api-server/src/
  lib/
    scopeGuard.ts          ✅ resolveUserScope() utility
    scopeConditions.ts     ✅ buildBookingScope() SQL helpers
  routes/admin/
    bookings.ts            ✅ Sprint A + B (scope di semua query + export)
    payments.ts            ✅ Sprint B (scope di /all, /recent-pending, /:bookingId)
    installments.ts        ✅ Sprint B (scope di /, /packages, /departures)
    analytics.ts           ✅ Sprint C (scope di dashboard-stats)
    finance.ts             ✅ Sprint C (scope di /dashboard, /piutang, /departures)
    agents.ts              ✅ Sprint C (guard komisi agen)
    crm.ts                 ✅ Sprint D (scope leads + guard /:id)
    departures.ts          ✅ Sprint D (scope check manifest-data)
    pilgrim-documents.ts   ✅ Sprint D (scope /pilgrims via booking JOIN)

artifacts/umroh-app/src/
  features/admin/pages/
    Bookings.tsx           ✅ Sprint E-1 (sembunyikan filter Cabang untuk agen)
    Dashboard.tsx          ✅ Sprint E-2 (badge scope per role)
  shared/components/ui/
    AccessDenied.tsx       ✅ Sprint E-3 (komponen 403 informatif) [BARU]
```

---

## Estimasi Total

| Sprint | Estimasi | Status |
|--------|----------|--------|
| A — Fondasi Scope | 3–4 hari | ✅ Selesai 28 Jul 2026 |
| B — Cascade Jemaah & Bayar | 2–3 hari | ✅ Selesai 28 Jul 2026 |
| C — Analytics & Laporan | 2–3 hari | ✅ Selesai 28 Jul 2026 |
| D — CRM & Manifest | 2 hari | ✅ Selesai 28 Jul 2026 |
| E — UI Refinement | 1–2 hari | ✅ Selesai 28 Jul 2026 |
| **Total** | **~2 minggu** | **✅ SELESAI SEMUA** |

---

*Dokumen ini diperbarui 28 Juli 2026. Semua Sprint A–E telah selesai diimplementasikan. Follow-up tasks tersisa dicatat di atas (Task #2, #3, #4).*
