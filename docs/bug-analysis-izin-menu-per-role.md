# Analisis Bug: Izin Menu per Role

**Tanggal analisis:** 30 Juli 2026  
**Halaman:** `/admin/menu-permissions` — Izin Menu per Role  
**File utama yang diperiksa:**
- `artifacts/umroh-app/src/features/admin/pages/MenuPermissions.tsx`
- `artifacts/umroh-app/src/features/admin/hooks/useMenuPermissions.ts`
- `artifacts/umroh-app/src/features/admin/hooks/useAdminNotifications.ts`
- `artifacts/umroh-app/src/features/admin/hooks/useAdminInbox.ts`
- `artifacts/umroh-app/src/features/admin/components/AdminFloatingChat.tsx`
- `artifacts/api-server/src/routes/admin/menu-permissions.ts`

---

## Ringkasan Temuan

| # | Tingkat Keparahan | Lokasi | Dampak |
|---|-------------------|--------|--------|
| 1 | 🔴 **Kritis** | Backend `menu-permissions.ts` | Perubahan izin tidak pernah diterapkan |
| 2 | 🟡 **Sedang** | Frontend `MenuPermissions.tsx` | Peringatan React & potensi rendering salah |
| 3 | 🟡 **Sedang** | `useAdminNotifications`, `AdminFloatingChat`, `useAdminInbox` | Spam 401 di browser console |

---

## Bug 1 — Mismatch `menu_key` / `menuKey` (camelCase vs snake_case)

### Deskripsi
Ketika server menggunakan mode **Supabase HTTP fallback** (PostgREST), respons yang dikembalikan menggunakan nama kolom snake_case (`menu_key`, `updated_at`). Namun, interface `PermissionRow` di frontend dan seluruh kode yang mengonsumsinya mengharapkan camelCase (`menuKey`).

### Lokasi Kode
```
artifacts/api-server/src/routes/admin/menu-permissions.ts
  - GET /api/admin/menu-permissions/my  (baris ~55–79)
  - GET /api/admin/menu-permissions      (baris ~93–113)

artifacts/umroh-app/src/features/admin/hooks/useMenuPermissions.ts
  - interface PermissionRow { menuKey: string }  (baris 8)
  - map[row.menuKey] = row.enabled               (baris 39)

artifacts/umroh-app/src/features/admin/pages/MenuPermissions.tsx
  - if (m[row.menuKey] && ...)                   (baris 78–80)
```

### Akar Masalah
PostgREST mengembalikan:
```json
{ "id": "...", "role": "admin", "menu_key": "menu.dashboard", "enabled": true }
```
Sementara frontend mengakses `row.menuKey` → hasilnya `undefined`.

Efeknya di `useMenuPermissions`:
```js
map[row.menuKey] = row.enabled;
// Setara dengan: map[undefined] = true
// → map = { "undefined": true }   ← kunci palsu
```
Akibatnya, sidebar tidak pernah menerapkan izin dari database — selalu fallback ke default statis. Di halaman matriks, DB overrides juga tidak pernah tercermin setelah halaman di-reload.

### Perbaikan
Ditambahkan fungsi `normalizeRow()` di backend yang mengkonversi respons PostgREST ke camelCase sebelum dikirim ke frontend:

```typescript
function normalizeRow(row: Record<string, unknown>) {
  return {
    id: (row.id as string) ?? "",
    role: (row.role as string) ?? "",
    menuKey: (row.menu_key as string) ?? (row.menuKey as string) ?? "",
    enabled: Boolean(row.enabled),
  };
}
```

Fungsi ini diterapkan di semua handler GET yang menggunakan jalur Supabase HTTP.

---

## Bug 2 — React Fragment Tanpa `key` di Matriks Izin

### Deskripsi
Di dalam `menuGroups.map()`, setiap iterasi mengembalikan fragment `<>...</>` tanpa prop `key`. React membutuhkan `key` yang stabil pada elemen terluar di setiap `.map()` agar dapat merekonsiliasi pembaruan dengan benar.

### Lokasi Kode
```
artifacts/umroh-app/src/features/admin/pages/MenuPermissions.tsx
  baris ~256
```

### Kode Bermasalah
```jsx
{menuGroups.map((group) => (
  <>  {/* ← tidak ada key! */}
    <tr key={`group-${group.label}`} ...>
      ...
    </tr>
    {group.items.map((item) => (
      <tr key={item.labelKey} ...>
```

Perhatikan bahwa `key` diletakkan di `<tr>` di dalam, bukan di fragment terluar. React akan memunculkan peringatan di console dan dapat menghasilkan rendering baris yang salah urutan saat matrix di-update.

### Perbaikan
```jsx
{menuGroups.map((group) => (
  <React.Fragment key={group.labelKey}>
    <tr className="bg-muted/20 border-b border-t">
      ...
    </tr>
    {group.items.map((item) => (
      <tr key={item.labelKey} ...>
  </React.Fragment>
))}
```

Import `React` juga ditambahkan secara eksplisit karena `React.Fragment` membutuhkannya.

---

## Bug 3 — Realtime Channel Dibuat di DEV Meski Realtime Dimatikan

### Deskripsi
`client.ts` sudah memanggil `supabase.realtime.disconnect()` di mode development untuk mencegah WebSocket retry loop. Namun, tiga komponen/hook masih memanggil `supabase.channel(...).on("postgres_changes", ...).subscribe()`. Supabase JS client mengirim **HEAD request** ke Supabase REST API untuk validasi skema tabel sebagai bagian dari proses setup channel — sebelum disconnect sempat berlaku. Karena `VITE_SUPABASE_ANON_KEY` tidak dikonfigurasi di dev, semua request ini mengembalikan **401 Unauthorized** dan memenuhi browser console.

### Lokasi Kode
```
artifacts/umroh-app/src/features/admin/hooks/useAdminNotifications.ts
  - useEffect di baris ~168: setup bookingChannel + paymentChannel

artifacts/umroh-app/src/features/admin/components/AdminFloatingChat.tsx
  - useEffect di baris ~91: setup channel per conversation

artifacts/umroh-app/src/features/admin/hooks/useAdminInbox.ts
  - useEffect di baris ~112: setup admin-inbox channel
```

### Contoh Error di Console
```
HEAD https://vakjoggobknrmhfmybhe.supabase.co/rest/v1/ 401 (Unauthorized)
```
Error ini muncul berulang kali (6+ kali) karena tiga hook masing-masing membuat channel, dan `useAdminNotifications` membuat dua channel sekaligus.

### Perbaikan
Ditambahkan guard `if (import.meta.env.DEV) return;` di awal setiap `useEffect` yang membuat realtime channel:

```typescript
useEffect(() => {
  // Realtime dimatikan di DEV (supabase.realtime.disconnect() di client.ts).
  // Skip agar tidak ada 401 HEAD request ke Supabase REST.
  if (import.meta.env.DEV) return;

  const channel = supabase.channel(...).on(...).subscribe();
  return () => { supabase.removeChannel(channel); };
}, [...]);
```

Guard ini memastikan channel creation tidak pernah terjadi di development, sementara realtime tetap berfungsi normal di production.

---

## Status Perbaikan

| Bug | Status |
|-----|--------|
| Bug 1 — `menu_key` / `menuKey` mismatch | ✅ Diperbaiki |
| Bug 2 — React Fragment tanpa `key` | ✅ Diperbaiki |
| Bug 3 — Realtime channel di DEV | ✅ Diperbaiki |

---

## Catatan Tambahan

### Redundansi Kecil (Bukan Bug)
Di `useMenuPermissions.ts`, endpoint `/api/admin/menu-permissions/my` sudah memfilter berdasarkan role di server-side, namun hook juga melakukan filter client-side `if (row.role === role)` (baris 39). Ini tidak menyebabkan bug karena kedua filter konsisten, tapi filter client-side bisa dihapus untuk kebersihan kode.

### Catatan Arsitektur
Fitur Izin Menu per Role sepenuhnya sudah benar secara arsitektur:
- Backend mendukung dua mode (Drizzle direct + Supabase HTTP fallback) dengan benar
- Frontend matrix sinkron dengan DB via TanStack Query + `invalidateQueries`
- Sidebar merespons perubahan izin secara real-time setelah save
- Super admin selalu mendapat akses penuh (di-hardcode di frontend, tidak bisa diubah)
