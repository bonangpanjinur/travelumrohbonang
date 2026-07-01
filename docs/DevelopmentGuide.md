# Development Guide
**Umroh Gateway** | Diperbarui: 2026-07-01 (post-refactor feature-based structure)

---

## Daftar Isi

1. [Setup Awal](#1-setup-awal)
2. [Environment Variables](#2-environment-variables)
3. [Menjalankan App](#3-menjalankan-app)
4. [Struktur Folder & Konvensi Import](#4-struktur-folder--konvensi-import)
5. [Menambah Fitur Baru (User-Facing)](#5-menambah-fitur-baru-user-facing)
6. [Menambah Halaman / Menu Admin](#6-menambah-halaman--menu-admin)
7. [Bekerja dengan Database](#7-bekerja-dengan-database)
8. [Testing](#8-testing)
9. [Debugging](#9-debugging)
10. [Workflow Git & Checklist](#10-workflow-git--checklist)
11. [Menambah Dependency](#11-menambah-dependency)

---

## 1. Setup Awal

### Prerequisites
- **Node.js** 18+ (dimanage Replit — tidak perlu install manual)
- **pnpm** 9+ (dimanage Replit — tidak perlu install manual)
- **Supabase account** dengan project yang aktif

### Install Dependencies

```bash
# Install semua dependencies (monorepo — dari root)
pnpm install

# Atau hanya untuk artifact tertentu
pnpm --filter @workspace/umroh-app install
```

---

## 2. Environment Variables

Buat file `.env.local` di dalam folder artifact (atau gunakan Replit Secrets):

```bash
# artifacts/umroh-app/.env.local  (JANGAN commit ke git)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Opsional
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA...
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_ENVIRONMENT=development
```

> **Di Replit:** gunakan tab **Secrets** (bukan `.env.local`) agar tidak ikut commit.

### Variable yang Tersedia di Kode

Diakses via `@/shared/lib/env.ts`:

```ts
import { env } from "@/shared/lib/env";

env.supabaseUrl      // VITE_SUPABASE_URL
env.supabaseAnonKey  // VITE_SUPABASE_ANON_KEY
env.sentryDsn        // VITE_SENTRY_DSN (opsional)
```

---

## 3. Menjalankan App

### Via Replit (Direkomendasikan)
Klik tombol **Run** — workflow sudah dikonfigurasi otomatis:
- `artifacts/umroh-app: web` — Frontend SPA
- `artifacts/api-server: API Server` — Express health check

### Manual via Terminal

```bash
# Frontend (umroh-app)
pnpm --filter @workspace/umroh-app run dev

# API Server
pnpm --filter @workspace/api-server run dev
```

### Build Production (untuk cek bundle)

```bash
# Wajib set env vars karena vite.config.ts memerlukannya
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/umroh-app build
```

### TypeScript Check

```bash
pnpm --filter @workspace/umroh-app exec tsc --noEmit
```

---

## 4. Struktur Folder & Konvensi Import

### Peta Folder `src/`

```
src/
├── admin/              ← Semua kode admin panel
│   ├── components/     ← Layout, sidebar, shell admin
│   ├── hooks/          ← Hook khusus admin (pagination, delete confirm, dll)
│   ├── pages/          ← 57 halaman admin
│   └── AdminRoute.tsx  ← Guard: cek role admin + 2FA
│
├── features/           ← Kode per domain/fitur (user-facing)
│   ├── auth/           ← Login, register, 2FA, forgot password
│   ├── booking/        ← Alur booking, pembayaran, riwayat
│   ├── cms/            ← Landing, blog, galeri, halaman dinamis
│   ├── dashboard/      ← Dashboard user & branch
│   ├── jamaah/         ← Profil, dokumen, kontrak, upgrade
│   ├── agent/          ← Portal agen, komisi, afiliasi
│   ├── paket/          ← Daftar paket, detail, komparasi, wishlist
│   └── tenant/         ← Multi-tenant site, template
│
├── shared/             ← Kode lintas fitur
│   ├── components/     ← Navbar, Footer, SEO, NotificationBell, dll
│   ├── hooks/          ← useAuth, useTenant, useTheme, useCurrency, dll
│   ├── i18n/           ← LanguageContext + translations (id/en)
│   ├── integrations/
│   │   └── supabase/   ← client.ts + types.ts (generated)
│   └── lib/            ← utils, validations, phone, sentry, errorLogger, dll
│
├── components/
│   └── ui/             ← shadcn/ui — JANGAN PINDAHKAN
│
├── pages/
│   └── NotFound.tsx    ← Satu-satunya halaman di root pages/
│
├── App.tsx             ← Router + Providers
├── main.tsx            ← Entry point
└── index.css           ← Global styles
```

### Aturan Penempatan File Baru

| Jenis file | Letakkan di |
|------------|------------|
| Halaman user-facing baru | `features/<fitur>/pages/` |
| Komponen khusus satu fitur | `features/<fitur>/components/` |
| Hook khusus satu fitur | `features/<fitur>/hooks/` |
| Utility khusus satu fitur | `features/<fitur>/lib/` |
| Halaman admin baru | `admin/pages/` |
| Komponen admin | `admin/components/` |
| Komponen dipakai 2+ fitur | `shared/components/` |
| Hook dipakai 2+ fitur | `shared/hooks/` |
| Utility dipakai 2+ fitur | `shared/lib/` |
| shadcn component baru | `components/ui/` — path alias sudah dikonfigurasi |

### Konvensi Import

Selalu gunakan alias `@/` (bukan path relatif `../../`):

```ts
// ✅ BENAR
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/admin/components/AdminLayout";
import { useWishlist } from "@/features/paket/hooks/useWishlist";
import { formatCurrency } from "@/shared/lib/utils";

// ❌ SALAH — jangan pakai path relatif
import { useAuth } from "../../shared/hooks/useAuth";
import { supabase } from "../../../shared/integrations/supabase/client";
```

> **Kenapa?** Alias `@/` → `src/` dikonfigurasi di `vite.config.ts` dan `tsconfig.json`. Path relatif mudah salah saat file dipindah.

### Import shadcn/ui

Komponen shadcn tetap di `@/components/ui/` — path ini **tidak berubah** meskipun folder lain direfactor:

```ts
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
```

### Import Supabase Client

```ts
// ✅ Gunakan path baru (post-refactor)
import { supabase } from "@/shared/integrations/supabase/client";
import type { Database } from "@/shared/integrations/supabase/types";
```

---

## 5. Menambah Fitur Baru (User-Facing)

### Skenario: Tambah fitur "Manasik Online" baru

#### Langkah 1 — Buat struktur folder fitur

```bash
mkdir -p artifacts/umroh-app/src/features/manasik/{pages,components,hooks,lib}
```

#### Langkah 2 — Buat halaman utama

```tsx
// src/features/manasik/pages/ManasikOnline.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import SEO from "@/shared/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ManasikOnline() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("manasik_sessions")
        .select("*")
        .order("scheduled_at", { ascending: true });
      setSessions((data || []) as Session[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <>
      <SEO title="Manasik Online" description="Jadwal sesi manasik online" />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Manasik Online</h1>
        {/* ... */}
      </div>
    </>
  );
}
```

#### Langkah 3 — Buat komponen fitur (jika perlu)

```tsx
// src/features/manasik/components/SessionCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SessionCardProps {
  session: Session;
  onJoin: (id: string) => void;
}

export function SessionCard({ session, onJoin }: SessionCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold">{session.title}</h3>
        {/* ... */}
      </CardContent>
    </Card>
  );
}
```

#### Langkah 4 — Daftarkan route di App.tsx

```tsx
// src/App.tsx — tambah import
import ManasikOnline from "./features/manasik/pages/ManasikOnline";

// Di dalam <Routes> — tambah route
<Route path="/manasik-online" element={
  <AuthRoute>
    <ManasikOnline />
  </AuthRoute>
} />
```

#### Langkah 5 — Tambah link di Navbar (jika perlu)

```tsx
// src/shared/components/Navbar.tsx — tambah menu item
{ label: "Manasik Online", path: "/manasik-online", icon: BookOpen }
```

#### Langkah 6 — Buat migration DB (jika perlu tabel baru)

```bash
touch database/migrations/20260702_001_manasik_sessions.sql
```

```sql
-- 20260702_001_manasik_sessions.sql
-- Tabel sesi manasik online
-- Rollback: DROP TABLE IF EXISTS public.manasik_sessions;

CREATE TABLE IF NOT EXISTS public.manasik_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  join_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.manasik_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sessions"
  ON public.manasik_sessions FOR SELECT
  USING (is_active = true);
```

#### Langkah 7 — Update types Supabase

```bash
supabase gen types typescript --linked \
  > artifacts/umroh-app/src/shared/integrations/supabase/types.ts
```

### Hooks Kustom untuk Fitur

Jika logika fetching kompleks atau dipakai beberapa komponen dalam satu fitur:

```ts
// src/features/manasik/hooks/useManasikSessions.ts
import { useState, useEffect } from "react";
import { supabase } from "@/shared/integrations/supabase/client";

export function useManasikSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("manasik_sessions")
        .select("*")
        .eq("is_active", true)
        .order("scheduled_at");

      if (error) setError(error.message);
      else setSessions((data || []) as Session[]);
      setLoading(false);
    };
    load();
  }, []);

  return { sessions, loading, error };
}
```

---

## 6. Menambah Halaman / Menu Admin

### Skenario: Tambah halaman admin "Sesi Manasik"

#### Langkah 1 — Buat halaman admin

```tsx
// src/admin/pages/ManasikSessions.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { useDeleteConfirm } from "@/admin/hooks/useDeleteConfirm";
import { useAdminPagination } from "@/admin/hooks/useAdminPagination";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/admin/components/DataTable";
import { toast } from "sonner";

export default function AdminManasikSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const { page, pageSize, Pagination } = useAdminPagination();
  const { confirmDelete, DeleteDialog } = useDeleteConfirm();

  const load = async () => {
    const { data } = await supabase
      .from("manasik_sessions")
      .select("*")
      .order("scheduled_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    setSessions((data || []) as Session[]);
  };

  useEffect(() => { load(); }, [page]);

  const handleDelete = (id: string) => {
    confirmDelete(async () => {
      await supabase.from("manasik_sessions").delete().eq("id", id);
      toast.success("Sesi dihapus");
      load();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sesi Manasik</h1>
        <Button>+ Tambah Sesi</Button>
      </div>
      {/* DataTable, DeleteDialog, Pagination */}
      <DeleteDialog />
      <Pagination />
    </div>
  );
}
```

#### Langkah 2 — Tambah route di App.tsx

```tsx
// src/App.tsx — tambah import
import AdminManasikSessions from "./admin/pages/ManasikSessions";

// Di dalam <Routes> → blok AdminRoute
<Route path="/admin/manasik-sessions" element={
  <AdminRoute>
    <AdminLayout>
      <AdminManasikSessions />
    </AdminLayout>
  </AdminRoute>
} />
```

#### Langkah 3 — Tambah menu di sidebar admin

```tsx
// src/admin/components/AdminSidebar.tsx (atau adminMenuConfig.ts)
// Cari section yang relevan, tambah item:
{
  label: "Sesi Manasik",
  path: "/admin/manasik-sessions",
  icon: Video,
  section: "cms",  // atau section yang sesuai
}
```

### Pola Admin Page yang Konsisten

Admin page menggunakan pola standar:
- **Fetch data** via `useEffect` + `supabase`
- **Pagination** via `useAdminPagination` dari `@/admin/hooks/`
- **Delete** via `useDeleteConfirm` dari `@/admin/hooks/`
- **Form** via shadcn `Dialog` + `Form` + Zod validation
- **Toast** via `sonner` (import `{ toast } from "sonner"`)
- **Audit log** via `logAudit` dari `@/shared/lib/audit`

```ts
import { logAudit } from "@/shared/lib/audit";

// Setelah operasi penting:
await logAudit({
  action: "create_session",
  entityType: "manasik_session",
  entityId: newSession.id,
  metadata: { title: newSession.title },
});
```

---

## 7. Bekerja dengan Database

### Update Types setelah Migration

Setiap kali ada migration baru yang dijalankan:

```bash
# Wajib: update types TypeScript (path baru post-refactor)
supabase gen types typescript --linked \
  > artifacts/umroh-app/src/shared/integrations/supabase/types.ts
```

> Path output adalah `src/shared/integrations/supabase/types.ts` — **bukan** `src/integrations/supabase/types.ts` (path lama yang sudah dihapus).

### Jalankan Migration Baru

```bash
# Push semua migration pending ke Supabase
supabase db push

# Lihat status migration
supabase migration list

# Lihat diff schema saat ini vs local
supabase db diff
```

### Konvensi File Migration

```
database/migrations/YYYYMMDD_NNN_deskripsi-singkat.sql
```

Setiap file migration wajib berisi:
1. Komentar tujuan migration
2. Komentar rollback (langkah balik jika perlu dibatalkan)
3. SQL yang idempoten (`IF EXISTS`, `IF NOT EXISTS`)

```sql
-- 20260702_001_add_manasik_sessions.sql
-- Tujuan: Buat tabel sesi manasik online
-- Rollback: DROP TABLE IF EXISTS public.manasik_sessions;

CREATE TABLE IF NOT EXISTS public.manasik_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### Mengakses Database di Kode

```ts
import { supabase } from "@/shared/integrations/supabase/client";

// Query dasar
const { data, error } = await supabase
  .from("packages")
  .select("id, title, slug")
  .eq("is_active", true)
  .order("created_at", { ascending: false });

// Insert
const { data: newRow, error } = await supabase
  .from("manasik_sessions")
  .insert({ title: "Sesi 1", scheduled_at: "2026-08-01T09:00:00Z" })
  .select()
  .single();

// Update
await supabase
  .from("manasik_sessions")
  .update({ is_active: false })
  .eq("id", sessionId);

// Delete
await supabase.from("manasik_sessions").delete().eq("id", sessionId);
```

---

## 8. Testing

### Jalankan Tests

```bash
# Semua tests
pnpm --filter @workspace/umroh-app test

# Watch mode
pnpm --filter @workspace/umroh-app test -- --watch

# Coverage report
pnpm --filter @workspace/umroh-app test -- --coverage
```

### Menulis Test untuk Utility

```typescript
// src/shared/lib/phone.test.ts
import { describe, it, expect } from "vitest";
import { normalizePhone } from "@/shared/lib/phone";

describe("normalizePhone", () => {
  it("converts 08xx to +628xx format", () => {
    expect(normalizePhone("08123456789")).toBe("+628123456789");
  });

  it("handles +62 prefix already", () => {
    expect(normalizePhone("+628123456789")).toBe("+628123456789");
  });

  it("returns null for invalid phone", () => {
    expect(normalizePhone("abc")).toBeNull();
  });
});
```

### Test Setup
- Framework: **Vitest** + **Testing Library**
- Setup file: `src/test/setup.ts` (mocks matchMedia, dll)
- Env: `jsdom` (simulate browser)
- Config: `vitest.config.ts`

---

## 9. Debugging

### Browser Console
DevTools → Console. Error Supabase, RLS violations, dan network errors muncul di sini.

### Error Monitoring (Sentry)
Jika `VITE_SENTRY_DSN` dikonfigurasi, error production otomatis dikirim ke Sentry. Setup di `@/shared/lib/sentry.ts`.

Error handler global ada di `@/shared/lib/errorLogger.ts` — di-mount di `main.tsx`.

### Common Errors & Solusi

#### `supabaseUrl is required`
```
Set VITE_SUPABASE_URL di Replit Secrets atau .env.local
```

#### `new row violates row-level security policy`
```
User tidak punya akses ke resource.
Cek RLS policy di Supabase Dashboard → Authentication → Policies.
Pastikan user sudah login (auth.uid() tidak null).
```

#### `Could not find the public.xxx relation`
```
Tabel belum ada di database.
Jalankan: supabase db push
Atau buat migration baru untuk tabel tersebut.
```

#### `Cannot find module '@/...'`
```
Cek alias @/ di vite.config.ts dan tsconfig.json.
Pastikan path setelah @/ valid dan file ada.
Jalankan: pnpm tsc --noEmit untuk lihat semua error sekaligus.
```

#### `Module not found: @/integrations/supabase/...` (path lama)
```
Path lama sudah dihapus sejak refactor.
Gunakan path baru: @/shared/integrations/supabase/client
                   @/shared/integrations/supabase/types
```

#### `@/hooks/useXxx` tidak ditemukan (path lama)
```
Hooks sudah dipindah ke:
  @/shared/hooks/    ← hook lintas fitur (useAuth, useTenant, dll)
  @/admin/hooks/     ← hook admin (useAdminPagination, useDeleteConfirm, dll)
  @/features/<fitur>/hooks/  ← hook spesifik fitur
```

---

## 10. Workflow Git & Checklist

### Format Commit Message

```bash
feat: tambah halaman manasik online
fix: perbaikan pagination di admin bookings
refactor: pindah komponen ke feature folder
db: tambah tabel manasik_sessions
docs: update development guide
style: format imports
test: tambah test untuk normalizePhone
```

### Checklist Sebelum Commit

**Wajib:**
- [ ] App masih berjalan (`pnpm dev` tanpa error di console)
- [ ] Tidak ada `console.log` debug yang tertinggal
- [ ] Import menggunakan alias `@/`, bukan path relatif (`../../`)
- [ ] `pnpm tsc --noEmit` tidak ada error baru

**Jika ada migration baru:**
- [ ] `supabase db push` sudah dijalankan
- [ ] `supabase gen types typescript --linked > src/shared/integrations/supabase/types.ts` sudah dijalankan

**Jika ada halaman baru:**
- [ ] Route sudah didaftarkan di `App.tsx`
- [ ] Route guard sudah sesuai (`<AuthRoute>`, `<AdminRoute>`, atau public)
- [ ] SEO component sudah ditambahkan (`<SEO title="..." />`)

**Jika ada fitur admin baru:**
- [ ] Menu sudah ditambahkan di sidebar config
- [ ] Audit log sudah dipanggil untuk operasi create/update/delete

---

## 11. Menambah Dependency

```bash
# Tambah ke artifact tertentu
pnpm --filter @workspace/umroh-app add nama-package

# Tambah dev dependency
pnpm --filter @workspace/umroh-app add -D nama-package

# Tambah ke root workspace (shared tooling)
pnpm add -D -w nama-package
```

> Cek apakah sudah ada sebelum install:
> ```bash
> grep "nama-package" artifacts/umroh-app/package.json
> ```

### Dependency yang Sudah Tersedia

Tidak perlu install ulang — sudah ada di project:

| Kategori | Package |
|----------|---------|
| UI Components | `shadcn/ui` (via `@/components/ui/`) |
| Icons | `lucide-react` |
| Styling | `tailwindcss`, `clsx`, `tailwind-merge` |
| Routing | `react-router-dom` |
| Database | `@supabase/supabase-js` |
| Forms | `react-hook-form`, `zod`, `@hookform/resolvers` |
| Toast | `sonner` |
| Date | `date-fns` |
| PDF | `jsPDF`, `html2canvas` |
| OTP/2FA | `otpauth` |
| Monitoring | `@sentry/react` |
| i18n | Custom context di `@/shared/i18n/` |
