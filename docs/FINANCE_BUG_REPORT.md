# Bug Report — Modul Keuangan
**Tanggal Analisis: 2026-07-28**

---

## Ringkasan

| ID | Severity | Komponen | Status |
|----|----------|----------|--------|
| B-1 | 🔴 KRITIS | DB Migration | FIXED |
| B-2 | 🔴 KRITIS | SQL Injection di finance.ts | FIXED |
| B-3 | 🟠 TINGGI | Buku Besar running balance salah | FIXED |
| B-4 | 🟠 TINGGI | Budget vs-actual income selalu nol | WONTFIX (by design) |
| B-5 | 🟡 SEDANG | Select controlled/uncontrolled warning | FIXED |
| B-6 | 🟡 SEDANG | 401 flood dari Supabase direct | CONFIG ISSUE |
| B-7 | 🟡 SEDANG | 500 /api/admin/conversations | OUT OF SCOPE |
| B-8 | 🔵 INFO | Accounting single-entry (belum double-entry) | KNOWN GAP |

---

## Detail Bug

### B-1 🔴 KRITIS — Tabel DB hilang di production

**Gejala:**
```
Failed query: insert into "chart_of_accounts" ... 
Kolom belum ada di database production.
GET /api/admin/accounting → 503 Service Unavailable
GET /api/admin/coa       → 503 Service Unavailable
POST /api/admin/coa/seed → 503 Service Unavailable
```

**Root Cause:**
Tiga tabel baru yang ditambahkan setelah deployment awal production belum di-push ke Supabase production:
- `chart_of_accounts`
- `bank_mutations`  
- `budgets`

Tabel `financial_transactions` memiliki kolom baru `account_id` dan `entry_type` yang mungkin juga belum ada.

**Fix:**
Jalankan migration SQL file: `supabase/migrations/20260728000001_finance_missing_tables.sql`

---

### B-2 🔴 KRITIS — SQL Injection di finance.ts (laporan keuangan)

**Gejala:** Vulnerability keamanan — user input diinjeksi langsung ke SQL via `sql.raw()`.

**Lokasi:**
```typescript
// finance.ts — income statement (baris ~687)
const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";
const rows = await db.execute(sql.raw(`... ${whereClause}`));

// finance.ts — balance sheet (baris ~740)
const dateFilter = date ? `AND ft.transaction_date <= '${date}'::timestamptz` : "";

// finance.ts — cash flow (baris ~800-821)
conditions.push(`bp.paid_at >= '${from}'::timestamptz`);
```

**Impact:** Admin yang bisa akses halaman Laporan Keuangan dapat mengeksekusi SQL arbitrary.

**Fix:** Diganti dengan parameterized queries menggunakan `sql` template literals.

---

### B-3 🟠 TINGGI — Buku Besar: saldo berjalan salah untuk akun liabilitas/ekuitas/pendapatan

**Gejala:** Saldo berjalan (running balance) di Buku Besar menampilkan nilai negatif atau salah untuk akun kewajiban, ekuitas, dan pendapatan.

**Root Cause:**
```typescript
// coa.ts baris ~218-221 — SALAH
const isDebit = r.entryType === "debit";
runningBalance += isDebit ? amt : -amt;  // ← selalu: debit+, credit-
```

Ini hanya benar untuk akun dengan `normalBalance = "debit"` (aset & beban).
Untuk akun `normalBalance = "credit"` (kewajiban/ekuitas/pendapatan), logikanya terbalik:
- credit harus **menambah** saldo
- debit harus **mengurangi** saldo

**Fix:**
```typescript
// BENAR
const normalBalance = account.normalBalance; // dari lookup akun
if (normalBalance === "debit") {
  runningBalance += isDebit ? amt : -amt;
} else {
  runningBalance += isDebit ? -amt : amt;
}
```

---

### B-4 🟠 TINGGI — Budget vs-actual: income actual selalu 0

**Gejala:** Di halaman Budget & Cash Flow, kolom "Aktual" untuk kategori pendapatan selalu menampilkan Rp 0.

**Root Cause:**
Budget categories: `"pendapatan_umroh"`, `"pendapatan_lainnya"`, dll.
Income actual diambil dari `booking_payments` yang tidak punya field `category`.
Karena tidak ada mapping antara kategori budget dan sumber data actual, income aktual = 0.

**Status:** WONTFIX untuk sekarang — perlu redesign mapping budget ↔ income source.

---

### B-5 🟡 SEDANG — React warning: Select berubah dari controlled ke uncontrolled

**Gejala:**
```
Select is changing from controlled to uncontrolled.
Components should not switch from controlled to uncontrolled (or vice versa).
```

**Root Cause:** Beberapa komponen Select menggunakan `value={undefined}` di initial state alih-alih `value=""`.

**Fix:** Pastikan semua initial value Select tidak `undefined`.

---

### B-6 🟡 SEDANG — 401 flood dari supabase.co/rest/v1

**Gejala:** Puluhan error 401 dari `yakjpqqobknrmhfmybhe.supabase.co/rest/v1/` di browser console.

**Root Cause:** `VITE_SUPABASE_ANON_KEY` dan/atau `VITE_SUPABASE_URL` tidak diset atau expired di environment ini. Frontend Supabase client tidak bisa authenticate.

**Fix:** Tambahkan secrets `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di Replit Secrets panel (nilai sama dengan `SUPABASE_URL` dan `SUPABASE_ANON_KEY`).

---

### B-7 🟡 SEDANG — 500 /api/admin/conversations

**Gejala:** `GET /api/admin/conversations?status=open&limit=50 → 500`

**Root Cause:** Kemungkinan tabel `chat_conversations` atau `chat_messages` belum ada di DB ini.

**Status:** OUT OF SCOPE untuk sprint keuangan — perlu investigasi terpisah.

---

### B-8 🔵 INFO — Akuntansi belum full double-entry

**Gejala:** User bisa input transaksi tanpa mengisi kolom `accountId` dan `entryType`.

**Impact:** Trial Balance tidak akan seimbang karena debit ≠ credit.

**Status:** KNOWN GAP — lihat G-1 di PRD.

---

## Rencana Perbaikan

### Immediate (Sprint ini)
1. ✅ B-1: Jalankan `supabase/migrations/20260728000001_finance_missing_tables.sql` ke production
2. ✅ B-2: Fix SQL injection di `finance.ts`
3. ✅ B-3: Fix running balance di `coa.ts`

### Next Sprint
4. B-4: Desain ulang mapping budget kategori ↔ income source
5. B-5: Audit semua Select components
6. B-7: Investigate conversations 500
