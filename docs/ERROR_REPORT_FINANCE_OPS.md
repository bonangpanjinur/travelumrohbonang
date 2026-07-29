# Laporan Error — Modul Keuangan & Operasional

> Dibuat: 2026-07-29  
> Metode: `pnpm run typecheck` (full workspace) + analisis kode  
> Total error TypeScript di seluruh api-server: **204 error**

---

## Ringkasan Eksekutif

| Modul | File | Error | Tingkat Keparahan |
|-------|------|-------|-------------------|
| Keuangan | `financialPdf.tsx` | 100 | 🔴 Kritis |
| Keuangan | `finance.ts` | 11 | 🔴 Kritis |
| Keuangan | `budget.ts` | 2 | 🟡 Sedang |
| Keuangan | `savings.ts` | 1 | 🟡 Sedang |
| Operasional | `departures.ts` | 2 | 🔴 Kritis |
| Operasional | `users.ts` | 4 | 🟡 Sedang |
| Operasional | `packages.ts` | 12 | 🟡 Sedang |
| Cross-cutting | `rest.ts` | 2 | 🟡 Sedang |
| Cross-cutting | `conversations.ts` + `chat.ts` | 15 | 🟡 Sedang |
| Cross-cutting | `bookings.ts` | 2 | 🟡 Sedang |
| **Frontend** | Semua halaman keuangan & ops | 0 TS errors | ✅ Aman |

---

## 🔴 KRITIS — Keuangan

### 1. `financialPdf.tsx` — JSX tidak bisa dikompilasi (±100 error)

**File:** `artifacts/api-server/src/lib/financialPdf.tsx`  
**Error:** `TS17004: Cannot use JSX unless the '--jsx' flag is provided`  
**Baris:** 177–447 (seluruh bagian JSX `@react-pdf/renderer`)

**Root cause:**  
`tsconfig.json` api-server tidak menyertakan opsi `"jsx": "react"`. File `.tsx` yang menggunakan JSX dari `@react-pdf/renderer` tidak bisa dikompilasi oleh TypeScript tanpa flag ini.

```json
// artifacts/api-server/tsconfig.json — saat ini:
{
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
    // ← "jsx" TIDAK ADA
  }
}
```

**Dampak runtime:**  
`esbuild` (bukan `tsc`) yang dipakai untuk build — jadi runtime **tidak crash**. Tapi ini menutup semua error TS lain di file yang mengimpor `financialPdf`, dan fitur PDF laporan keuangan tidak tervalidasi secara tipe.

**Fix:**  
Tambahkan ke `artifacts/api-server/tsconfig.json`:
```json
"jsx": "react"
```
Dan tambahkan `"@types/react"` ke devDependencies api-server.

---

### 2. `finance.ts` — Fungsi WA tidak diimport (2 error)

**File:** `artifacts/api-server/src/routes/admin/finance.ts`  
**Error:** `TS2304: Cannot find name 'paymentDeadlineAlertWA'` (baris 410)  
**Error:** `TS2304: Cannot find name 'sendWhatsApp'` (baris 419)

**Root cause:**  
Fungsi `paymentDeadlineAlertWA` (template WA dari `lib/whatsapp`) dan `sendWhatsApp` (dispatcher dari `lib/whatsapp`) **dipanggil tapi tidak diimport** di bagian atas file. Kode ini adalah endpoint untuk mengirim reminder pembayaran via WhatsApp.

```typescript
// finance.ts baris 410-419 — BROKEN:
const message = paymentDeadlineAlertWA({  // ← tidak diimport
  jamaahName: row.customer_name || "Jemaah",
  ...
});
const result = await sendWhatsApp({ to: row.customer_phone, message }); // ← tidak diimport
```

**Dampak runtime:**  
🔴 **Crash runtime** — endpoint `/api/admin/finance/...` (bagian reminder WA) akan melempar `ReferenceError: paymentDeadlineAlertWA is not defined` saat dipanggil.

**Fix:**  
Tambahkan import di bagian atas `finance.ts`:
```typescript
import { paymentDeadlineAlertWA } from "../../lib/whatsapp/templates";
import { sendWhatsApp } from "@workspace/whatsapp";
```
(Sesuaikan path dengan struktur aktual `lib/whatsapp`.)

---

### 3. `finance.ts` — Arithmetic type error pada hasil `db.execute()` (8 error)

**File:** `artifacts/api-server/src/routes/admin/finance.ts`  
**Error:** `TS2362/TS2363/TS2365: The left/right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint'...`  
**Baris:** 900, 903, 904, 1394, 1395, 1396, 1399

**Root cause:**  
`db.execute(sql`...`)` mengembalikan tipe `QueryResult<Record<string, unknown>>` — kolom numerik bertipe `{}` bukan `number`. Ketika kode melakukan aritmatika (`r.inflow + r.outflow`) TypeScript menolak karena tipe `{}`.

```typescript
// finance.ts baris 1390-1399 — BERMASALAH:
const monthly = allMonths.map(m => ({
  month: m,
  inflow:  inflowMap.get(m) ?? 0,   // tipe: number | {} → ERROR
  outflow: outflowMap.get(m) ?? 0,  // tipe: number | {} → ERROR
  net: (inflowMap.get(m) ?? 0) - (outflowMap.get(m) ?? 0), // ERROR
}));
```

**Dampak runtime:**  
Tidak crash (JavaScript tidak peduli tipe), tapi kalkulasi bisa menghasilkan `NaN` atau `[object Object]` jika data dari DB tidak sesuai ekspektasi — bug data silent.

**Fix:**  
Wrap hasil `db.execute()` dengan casting eksplisit:
```typescript
const inflow = Number(inflowMap.get(m) ?? 0);
const outflow = Number(outflowMap.get(m) ?? 0);
return { month: m, inflow, outflow, net: inflow - outflow };
```

---

### 4. `budget.ts` — `inArray` overload mismatch (2 error)

**File:** `artifacts/api-server/src/routes/admin/budget.ts`  
**Error:** `TS2769: No overload matches this call`  
**Baris:** 99, 114

**Root cause:**  
`eq(budgets.id, req.params.ids)` dipakai dengan nilai `string | string[]`. Drizzle ORM tidak punya overload `eq()` untuk array — untuk array harus pakai `inArray()`.

**Fix:**
```typescript
// Ganti:
.where(eq(budgets.id, req.params.id))  // jika bisa array

// Dengan:
import { inArray } from "@workspace/db";
.where(Array.isArray(ids) ? inArray(budgets.id, ids) : eq(budgets.id, ids))
```

---

### 5. `savings.ts` — Field `basePrice` tidak ada di schema (1 error)

**File:** `artifacts/api-server/src/routes/savings.ts`  
**Error:** `TS2339: Property 'basePrice' does not exist on type 'PgTableWithColumns<packages>'`  
**Baris:** 95

**Root cause:**  
Field `basePrice` dihapus dari tabel `packages` pada migrasi FASE 1 (harga dipindah ke `departure_prices` per departure). Tapi route savings masih mengakses `packages.basePrice`.

```typescript
// savings.ts baris 93-101 — BROKEN:
.select({ title: packages.title, basePrice: packages.basePrice })  // ← field tidak ada
...
if (!targetAmount && pkg.basePrice) resolvedTarget = Number(pkg.basePrice);
```

**Dampak runtime:**  
⚠️ Build esbuild tidak crash, tapi `pkg.basePrice` akan selalu `undefined` — tab "target tabungan otomatis dari harga paket" tidak akan berfungsi.

**Fix:**  
Join ke `departure_prices` untuk ambil harga minimum:
```typescript
// Ambil harga terendah dari departure_prices untuk paket ini
const minPrice = await db
  .select({ price: departurePrices.price })
  .from(departurePrices)
  .where(eq(departurePrices.departureId, /* departureId */))
  .orderBy(asc(departurePrices.price))
  .limit(1);
```

---

## 🔴 KRITIS — Operasional

### 6. `departures.ts` — Module `resend` tidak ditemukan (2 error)

**File:** `artifacts/api-server/src/routes/admin/departures.ts`  
**Error:** `TS2307: Cannot find module 'resend' or its corresponding type declarations` (baris 1105)  
**Error:** `TS2554: Expected 1 arguments, but got 2` (baris 1117)

**Root cause:**  
`departures.ts` mengimpor langsung dari package `resend` yang tidak ada di `dependencies` api-server (hanya ada di `lib/email`). Seharusnya memakai fungsi helper dari `lib/email`.

**Dampak runtime:**  
⚠️ `esbuild` bisa saja menemukan package ini dari hoisting, tapi error tipe menunjukkan API call yang salah (argumen berbeda dari yang diharapkan).

**Fix:**  
Ganti import langsung dari `resend` dengan fungsi dari `lib/email`:
```typescript
// Ganti:
import { Resend } from "resend";

// Dengan:
import { sendEmail } from "@workspace/email";
```

---

## 🟡 SEDANG — Cross-cutting

### 7. `users.ts` — Field `role` tidak ada di `profiles` (4 error)

**File:** `artifacts/api-server/src/routes/admin/users.ts`  
**Error:** `TS2339: Property 'role' does not exist on type '{...profiles fields...}'`  
**Baris:** 59, 63, 68 (×2)

**Root cause:**  
Kode membaca/menulis `target.role` dari hasil query Drizzle pada tabel `profiles`. Tapi tabel `profiles` **tidak punya kolom `role`** — role disimpan di tabel `user_roles` terpisah.

```typescript
// users.ts baris 59-68 — BROKEN:
if (target?.role === "owner") { ... }        // profiles tidak punya 'role'
if (updates.role === "super_admin") { ... }  // profiles tidak punya 'role'
```

**Dampak runtime:**  
`target.role` selalu `undefined` → semua guard role-check di endpoint PATCH user tidak berfungsi. Admin bisa mengubah role secara tidak sah.

**Fix:**  
Join dengan `user_roles` saat fetch `target`:
```typescript
const [target] = await db
  .select({ ...profileFields, role: userRoles.role })
  .from(profiles)
  .leftJoin(userRoles, eq(userRoles.userId, profiles.id))
  .where(eq(profiles.id, targetId));
```

---

### 8. `rest.ts` — Duplicate identifier (2 error)

**File:** `artifacts/api-server/src/routes/rest.ts`  
**Error:** `TS2300: Duplicate identifier 'shouldUseSupabaseHttp'`  
**Baris:** 6, 57

**Root cause:**  
`shouldUseSupabaseHttp` diimport dua kali di file yang sama — mungkin sisa merge conflict atau refactor.

```typescript
// Baris 6:
import { shouldUseSupabaseHttp } from "../lib/dbFlags";
// ...banyak kode...
// Baris 57 (DUPLIKAT):
import { shouldUseSupabaseHttp } from "../lib/dbFlags";
```

**Fix:**  
Hapus salah satu import duplikat (baris 57).

---

### 9. `packages.ts` — Tipe `never` dari conditional type (12 error)

**File:** `artifacts/api-server/src/routes/packages.ts`  
**Error:** Berbagai `TS2322`, `TS7053`, `TS2339` di baris 354, 384, 439, 602–607, 615, 639

**Root cause:**  
Beberapa query Drizzle dengan `conditional select` menghasilkan tipe `never` karena conditional type yang tidak kompatibel. Ini terjadi setelah migrasi FASE 1 memindahkan hotel/harga dari `packages` ke `package_departures` — kode lama masih menggunakan struktur select lama.

**Dampak runtime:**  
⚠️ Kemungkinan crash pada endpoint GET packages saat melakukan aggregasi hotel/harga per departure.

---

### 10. `conversations.ts` + `chat.ts` — `inArray` overload (15 error)

**File:** `artifacts/api-server/src/routes/admin/conversations.ts` (8 error), `src/routes/chat.ts` (7 error)  
**Error:** `TS2769: No overload matches this call`

**Root cause:**  
Sama dengan `budget.ts` — penggunaan `eq()` dengan nilai `string | string[]`. Drizzle `eq()` hanya menerima nilai tunggal; untuk array harus `inArray()`.

---

### 11. `bookings.ts` — `eq` dengan array (2 error)

**File:** `artifacts/api-server/src/routes/admin/bookings.ts`  
**Error:** `TS2769: No overload matches this call`  
**Baris:** 2039

Pola yang sama: `eq(bookings.id, ids)` di mana `ids` adalah `string | string[]`.

---

## ✅ Frontend — Tidak Ada Error TypeScript

Halaman-halaman berikut sudah bebas dari direct Supabase calls dan tidak ada TypeScript error:

| Halaman | Status |
|---------|--------|
| `FinanceDashboard.tsx` | ✅ |
| `Piutang.tsx` | ✅ |
| `DepartureFinance.tsx` | ✅ |
| `BudgetCashFlow.tsx` | ✅ |
| `ChartOfAccounts.tsx` | ✅ |
| `GeneralLedger.tsx` | ✅ |
| `TrialBalance.tsx` | ✅ |
| `FinancialReports.tsx` | ✅ |
| `BankReconciliation.tsx` | ✅ |
| `AccountingExport.tsx` | ✅ |
| `DepartureChecklist.tsx` | ✅ |
| `DepartureReadiness.tsx` | ✅ |
| `EquipmentDistribution.tsx` | ✅ |
| `VisaTracking.tsx` | ✅ |
| `SeatAssignment.tsx` | ✅ |
| `CheckIn.tsx` | ✅ |
| `Manifest.tsx` | ✅ |

---

## Temuan Non-TS (Kualitas Kode)

### A. Data hardcoded di backend

| File | Baris | Masalah |
|------|-------|---------|
| `checklist.ts` | 22–41 | `CHECKLIST_TEMPLATE` hardcoded — template checklist sama untuk semua paket, tidak bisa dikustomisasi per tipe paket dari DB |

### B. Operasi bulk tanpa transaksi DB

| File | Endpoint | Risiko |
|------|----------|--------|
| `visa.ts` | `POST /bulk` (generate massal) | Jika satu record gagal, record sebelumnya sudah tersimpan → data tidak konsisten |
| `visa.ts` | `PATCH /bulk-update` | Sama — tidak pakai `db.transaction()` |

**Fix:**  
Bungkus dengan `await db.transaction(async (tx) => { ... })`.

### C. Tidak ada validasi input di beberapa route keuangan

| File | Endpoint | Masalah |
|------|----------|---------|
| `accounting.ts` | `GET /` | `req.query.type`, `.from`, `.to` di-cast langsung tanpa validasi format tanggal |
| `finance.ts` | Multiple | Parameter tanggal tidak divalidasi — bisa inject SQL jika raw query |

---

## Prioritas Perbaikan

| # | Item | File | Dampak |
|---|------|------|--------|
| 1 | Fix `paymentDeadlineAlertWA` import | `finance.ts` | 🔴 Crash runtime |
| 2 | Fix `users.ts` role check | `users.ts` | 🔴 Security bypass |
| 3 | Fix `departures.ts` resend import | `departures.ts` | 🔴 Email blast gagal |
| 4 | Tambah `jsx: "react"` di tsconfig | `tsconfig.json` | 🔴 PDF laporan tidak tervalidasi |
| 5 | Fix arithmetic casting di `finance.ts` | `finance.ts` | 🟡 Data NaN di laporan cash flow |
| 6 | Fix `savings.ts` basePrice | `savings.ts` | 🟡 Target tabungan otomatis tidak jalan |
| 7 | Fix `inArray` di budget/bookings/chat | Multiple | 🟡 Potential crash di endpoint batch |
| 8 | Hapus duplicate import `rest.ts` | `rest.ts` | 🟢 Cleanup |
| 9 | Tambah transaksi DB di visa bulk | `visa.ts` | 🟡 Data inconsistency |
| 10 | Fix packages.ts tipe `never` | `packages.ts` | 🟡 Crash potensial |
