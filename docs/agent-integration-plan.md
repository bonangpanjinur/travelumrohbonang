# Rencana Pengembangan: Integrasi Akun Agen

> Dokumen ini menjelaskan tiga area perbaikan untuk memastikan setiap akun dengan role `agent` terhubung penuh ke data agen, dan setiap booking yang dibuat agen tercatat dengan benar.

---

## Latar Belakang & Masalah Saat Ini

| Masalah | Dampak |
|---------|--------|
| `agents.user_id` nullable — agen dibuat admin tanpa link ke akun auth | Booking tidak tampil (query jadi `WHERE FALSE`) |
| Booking creation hardcode `picType: "admin"` | PIC tidak tercatat sebagai agen, komisi tidak jalan |
| Tidak ada auto-register saat role di-set ke `agent` | Admin harus link manual, rawan terlewat |
| Dashboard agen kosong | Agen tidak bisa lihat statistik performa mereka |

---

## Task #4 — Auto-Register & Auto-Link Data Agen saat Role Diberikan

### Deskripsi
Setiap kali admin mengubah role sebuah akun menjadi `'agent'`, sistem harus otomatis memastikan ada baris `agents` yang terhubung ke akun tersebut.

### Alur Logika

```
Admin set role → 'agent'
        │
        ▼
Cek agents WHERE email = profile.email
        │
   ┌────┴─────────┐
  Ada             Tidak ada
   │                   │
Set user_id        INSERT agents baru
(link)             (name, email, phone dari profiles)
                   + set user_id
```

Ketika role dicabut dari `'agent'`:
- `agents.user_id` di-null-kan (unlink)
- Data `agents` **tidak dihapus** (histori booking tetap utuh)

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `artifacts/api-server/src/routes/admin/users.ts` | PATCH `/:id` — tambah logika sync agents setelah update role |
| `lib/db/src/schema/agents.ts` | Referensi schema (tidak perlu diubah) |
| `lib/db/src/schema/profiles.ts` | Source name/email/phone |
| `artifacts/api-server/src/lib/scopeGuard.ts` | Fallback email sudah ada, sync ini melengkapinya |

### Script Satu Kali (Backfill)
Untuk akun agen yang sudah ada sebelum fitur ini:
```sql
-- Supabase/migrations: sync existing agent accounts
UPDATE agents a
SET user_id = p.id::text
FROM profiles p
WHERE p.email = a.email
  AND a.user_id IS NULL;
```

---

## Task #5 — PIC Otomatis Terisi Agen saat Agen Membuat Booking

### Deskripsi
Saat agen login ke panel admin dan membuat booking (tombol "Tambah Booking"), PIC harus otomatis terisi nama agen tersebut — baik dari form panel admin maupun dari frontend publik.

### Alur Logika

```
Agen submit booking
        │
        ▼
resolveUserScope(req) → type: 'agent', agentId: 'xxx'
        │
        ▼
Override body:
  picType  = 'agen'
  picId    = agentId
  agentId  = agentId   ← tidak bisa di-override dari frontend
        │
        ▼
INSERT bookings dengan PIC & agentId benar
```

### Perubahan Backend

**`artifacts/api-server/src/routes/admin/bookings.ts`**

```typescript
// POST / dan POST /group — tambahkan setelah resolveUserScope
const scope = await resolveUserScope(req);
if (scope.type === 'agent' && scope.agentId) {
  body.picType  = 'agen';
  body.picId    = scope.agentId;
  body.agentId  = scope.agentId;
}
```

### Perubahan Frontend

**`artifacts/umroh-app/src/features/admin/components/AdminBookingDialog.tsx`**

```tsx
// Jika user adalah agen → pre-fill agentId, disable field
const isAgent = currentUser?.role === 'agent';
const agentIdFromProfile = /* dari useAuth atau /api/agent/profile */;

// Field agent:
<AgentSelect
  value={isAgent ? agentIdFromProfile : form.agentId}
  disabled={isAgent}
/>
```

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `artifacts/api-server/src/routes/admin/bookings.ts` | POST `/` (line ~570) dan POST `/group` (line ~783) |
| `artifacts/api-server/src/lib/scopeGuard.ts` | Tidak perlu diubah |
| `artifacts/umroh-app/src/features/admin/components/AdminBookingDialog.tsx` | Pre-fill + disable agent field untuk role agen |
| `artifacts/umroh-app/src/shared/lib/roleConstants.ts` | Cek role di frontend |

---

## Task #6 — Dashboard Statistik Khusus Agen

### Deskripsi
Endpoint `/api/admin/analytics/dashboard-stats` di-gate oleh `requireFinance` yang tidak termasuk role `agent`. Agen perlu melihat performa mereka sendiri di dashboard.

### Endpoint Baru: `GET /api/admin/analytics/agent-stats`

**Gate:** `requireOperational` (termasuk agent)

**Response:**
```json
{
  "totalBookings": 12,
  "activeBookings": 5,
  "completedBookings": 6,
  "cancelledBookings": 1,
  "totalValue": 150000000,
  "totalCommission": 7500000,
  "recentBookings": [
    {
      "bookingCode": "BNG-2607-xxx",
      "packageTitle": "Umroh Promo",
      "status": "confirmed",
      "totalPrice": 27500000
    }
  ]
}
```

**Query utama:**
```sql
SELECT
  COUNT(*)                                    AS total_bookings,
  COUNT(*) FILTER (WHERE status NOT IN ('cancelled','completed')) AS active_bookings,
  COUNT(*) FILTER (WHERE status = 'completed')  AS completed_bookings,
  COUNT(*) FILTER (WHERE status = 'cancelled')  AS cancelled_bookings,
  SUM(total_price)                            AS total_value
FROM bookings b
WHERE (b.agent_id = $agentId OR (b.pic_type = 'agen' AND b.pic_id = $agentId))
```

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `artifacts/api-server/src/routes/admin/analytics.ts` | Tambah route `GET /agent-stats` |
| `artifacts/api-server/src/routes/admin/index.ts` | Mount `/analytics/agent-stats` dengan `requireOperational` |
| `artifacts/umroh-app/src/features/admin/pages/Dashboard.tsx` | Conditional: jika role agent → panggil `/agent-stats` |

---

## Urutan Pengerjaan

```
Task #4 (Auto-register)
    │
    ├──────────────────┐
    ▼                  ▼
Task #5           Task #6
(Auto-fill PIC)   (Dashboard stats)
```

- **#4 dikerjakan pertama** — jadi fondasi agar #5 punya `agentId` yang valid
- **#5 dan #6 bisa paralel** setelah #4 selesai

---

## Kondisi Sementara (Sudah Live)

Sambil menunggu task di atas selesai, fallback berikut sudah aktif di `scopeGuard.ts`:

- Jika `agents.user_id` belum di-set → cari by `profiles.email = agents.email`
- Jika ketemu → tampilkan booking, dan `agents.user_id` otomatis ter-update
- `/api/admin/branches` sudah accessible untuk agent (fix toast "Gagal memuat cabang")
