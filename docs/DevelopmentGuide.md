# Development Guide
**Umroh Gateway** | Diperbarui: 2026-07-01

---

## Setup Awal

### Prerequisites
- **Node.js** 18+ (dimanage Replit — tidak perlu install manual)
- **pnpm** 9+ (dimanage Replit — tidak perlu install manual)
- **Supabase account** dengan project yang aktif

### Clone & Install

Di Replit, clone sudah otomatis. Untuk install dependencies:

```bash
# Install semua dependencies (monorepo)
pnpm install

# Install dependencies untuk satu artifact saja
pnpm --filter @workspace/umroh-app install
```

---

## Environment Variables

Buat file `.env.local` di dalam folder artifact:

```bash
# artifacts/umroh-app/.env.local  (JANGAN commit ke git)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Opsional
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA...
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_ENVIRONMENT=development
```

> Di Replit, gunakan **Secrets** tab (bukan `.env.local`) agar tersimpan aman.

---

## Menjalankan App

### Via Replit (Direkomendasikan)
Klik tombol **Run** — workflow sudah dikonfigurasi otomatis.

### Manual via Terminal

```bash
# Frontend (umroh-app)
pnpm --filter @workspace/umroh-app run dev

# API Server
pnpm --filter @workspace/api-server run dev

# Kedua sekaligus (dari root)
pnpm dev
```

### Preview
Buka tab **Webview** di Replit, atau akses via URL:
- Frontend: `https://<repl-name>.<username>.replit.dev/`
- API: `https://<repl-name>.<username>.replit.dev/api-server/`

---

## Struktur Monorepo

```bash
# Workspace packages
pnpm ls -r --depth=0

# Check workspace config
cat pnpm-workspace.yaml
```

Setiap `artifacts/*` adalah workspace package dengan nama `@workspace/<artifact-name>`.

---

## Bekerja dengan Database

### Update Types setelah Migration
Setiap kali ada migration baru yang dijalankan, update types TypeScript:

```bash
# Dari direktori root
supabase gen types typescript --linked \
  > artifacts/umroh-app/src/integrations/supabase/types.ts
```

### Jalankan Migration Baru
```bash
# Push semua migration pending ke Supabase
supabase db push

# Lihat status migration
supabase migration list

# Lihat diff schema saat ini vs local
supabase db diff
```

### Query Database Langsung (Dev Only)
```bash
# Masuk ke psql
supabase db connect

# Atau via Supabase Dashboard → SQL Editor
```

---

## Menambah Fitur Baru

### 1. Buat Komponen

```bash
# Buat file komponen baru
touch artifacts/umroh-app/src/features/paket/components/PackageFilter.tsx
```

```tsx
// PackageFilter.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PackageFilterProps {
  onFilter: (filters: FilterState) => void;
}

interface FilterState {
  minPrice?: number;
  maxPrice?: number;
  duration?: number;
}

export const PackageFilter = ({ onFilter }: PackageFilterProps) => {
  const [filters, setFilters] = useState<FilterState>({});
  
  const handleApply = () => onFilter(filters);
  
  return (
    <div>
      {/* Filter UI */}
      <Button onClick={handleApply}>Terapkan</Button>
    </div>
  );
};
```

### 2. Buat Custom Hook (jika perlu)

```typescript
// usePackageFilter.ts
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePackageFilter = () => {
  const [filters, setFilters] = useState({});
  
  const { data: packages } = useQuery({
    queryKey: ['packages', filters],
    queryFn: async () => {
      let query = supabase.from('packages').select('*').eq('is_active', true);
      // Apply filters...
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  
  const updateFilter = useCallback((key: string, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  return { packages, filters, updateFilter };
};
```

### 3. Tambah Route (jika halaman baru)

```tsx
// App.tsx — tambah route baru
<Route path="/paket/filter" element={<PackageFilterPage />} />
```

### 4. Buat Migration (jika perlu perubahan DB)

```bash
# Format: YYYYMMDD_NNN_deskripsi.sql
touch database/migrations/20260702_001_add_package_filter_columns.sql
```

```sql
-- 20260702_001_add_package_filter_columns.sql
-- Tambah kolom filter untuk paket
-- Rollback: ALTER TABLE public.packages DROP COLUMN IF EXISTS difficulty_level;

ALTER TABLE public.packages 
  ADD COLUMN IF NOT EXISTS difficulty_level text DEFAULT 'regular';
```

---

## Testing

### Jalankan Tests

```bash
# Semua tests
pnpm --filter @workspace/umroh-app test

# Watch mode (auto-rerun saat file berubah)
pnpm --filter @workspace/umroh-app test -- --watch

# Coverage report
pnpm --filter @workspace/umroh-app test -- --coverage
```

### Menulis Test

```typescript
// src/lib/phone.test.ts
import { describe, it, expect } from 'vitest';
import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('converts 08xx to +628xx format', () => {
    expect(normalizePhone('08123456789')).toBe('+628123456789');
  });
  
  it('handles +62 prefix already', () => {
    expect(normalizePhone('+628123456789')).toBe('+628123456789');
  });
  
  it('returns null for invalid phone', () => {
    expect(normalizePhone('abc')).toBeNull();
  });
});
```

### Test Setup
- Framework: **Vitest** + **Testing Library**
- Setup file: `src/test/setup.ts` (mocks matchMedia)
- Env: `jsdom` (simulate browser)
- Config: `vitest.config.ts`

---

## Debugging

### Browser Console
Buka DevTools → Console. Error Supabase, RLS violations, dan network errors muncul di sini.

### Supabase Logs
```bash
# Lihat logs Edge Functions
supabase functions logs payment-gateway

# Lihat logs database (query slow, errors)
# Via Supabase Dashboard → Logs
```

### TanStack Query DevTools
Sudah terpasang (hanya muncul di development). Buka dengan klik icon di pojok kanan bawah browser.

### Sentry (jika DSN dikonfigurasi)
Error production otomatis dikirim ke Sentry. Akses via sentry.io.

### Common Errors

#### `supabaseUrl is required`
```
Set VITE_SUPABASE_URL di Replit Secrets atau .env.local
```

#### `new row violates row-level security policy`
```
User tidak punya akses ke resource. Cek RLS policy di Supabase Dashboard.
Atau pastikan user sudah login (auth.uid() tidak null).
```

#### `Could not find the public.xxx relation`
```
Tabel belum ada di database. Jalankan: supabase db push
Atau tabel perlu migration baru.
```

#### Build error: `Cannot find module '@/...'`
```
Cek alias @/ di vite.config.ts dan tsconfig.json
Pastikan path setelah @/ valid
```

---

## Workflow Git

```bash
# Status perubahan
git status

# Commit setelah selesai satu unit kerja
git add .
git commit -m "feat: tambah filter paket berdasarkan durasi"

# Format commit message:
# feat: fitur baru
# fix: perbaikan bug
# refactor: reorganisasi kode tanpa perubahan behavior
# db: perubahan database/migration
# docs: update dokumentasi
# style: formatting, tidak ada perubahan logika
# test: tambah atau update test
```

---

## Checklist Sebelum Commit

- [ ] App masih berjalan (buka browser, cek tidak ada blank screen)
- [ ] Tidak ada `console.log` debug yang tertinggal
- [ ] Import menggunakan alias `@/`, bukan path relative
- [ ] Form menggunakan Zod validation
- [ ] Data fetching menggunakan TanStack Query
- [ ] Jika ada migration baru: `supabase db push` sudah dijalankan
- [ ] Jika ada migration baru: `types.ts` sudah diupdate

---

## Menambah Dependency

```bash
# Tambah ke artifact tertentu
pnpm --filter @workspace/umroh-app add nama-package

# Tambah dev dependency
pnpm --filter @workspace/umroh-app add -D nama-package

# Tambah ke root workspace (shared tooling)
pnpm add -D -w nama-package
```

> Cek apakah package sudah ada sebelum install:  
> `grep "nama-package" artifacts/umroh-app/package.json`
