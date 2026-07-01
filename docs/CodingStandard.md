# Coding Standard
**Umroh Gateway** | Diperbarui: 2026-07-01

---

## Prinsip Dasar

1. **Readability first** — kode dibaca lebih sering dari ditulis
2. **Explicit over implicit** — jangan andalkan side effects tersembunyi
3. **Fail loudly** — error harus visible, bukan silent fallback
4. **Feature cohesion** — kode yang berubah bersama, disimpan bersama

---

## TypeScript

### Konfigurasi Aktif
```json
{
  "noImplicitAny": false,
  "strictNullChecks": false,
  "noUnusedLocals": false
}
```

> Konfigurasi ini sengaja longgar untuk kecepatan pengembangan awal.  
> Target jangka panjang: aktifkan `strictNullChecks` secara bertahap.

### Aturan Praktis

```typescript
// ✅ BENAR — type eksplisit untuk props
interface PackageCardProps {
  packageId: string;
  name: string;
  price: number;
  onSelect: (id: string) => void;
}

// ❌ HINDARI — any yang tidak perlu
const handleData = (data: any) => { ... }

// ✅ BENAR — gunakan type yang spesifik
const handleData = (data: PackageData) => { ... }

// ✅ BENAR — type dari Supabase (selalu up-to-date)
import type { Database } from '@/integrations/supabase/types';
type Package = Database['public']['Tables']['packages']['Row'];

// ✅ BENAR — non-null assertion hanya jika benar-benar yakin
const el = document.getElementById('root')!;

// ❌ SALAH — non-null assertion tanpa alasan
const data = response.data!.items!.first!;
```

---

## React Components

### Struktur Komponen
```tsx
// ✅ BENAR — urutan yang konsisten
import React, { useState, useEffect, useCallback } from 'react';
import { ... } from 'third-party-library';
import { ... } from '@/shared/components/ui/...';
import { ... } from '@/features/other/...';   // jika perlu, lewat shared
import type { ... } from './types';

// Interface/type dulu, baru component
interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyComponent = ({ title, onAction }: MyComponentProps) => {
  // 1. Hooks pertama (urut: state, context, custom hooks, effects)
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  const { data } = useQuery({ ... });
  
  // 2. Event handlers
  const handleClick = useCallback(() => {
    setIsOpen(prev => !prev);
    onAction?.();
  }, [onAction]);

  // 3. Computed values / derivations
  const displayTitle = title.trim() || t('untitled');

  // 4. Return JSX
  return (
    <div>
      <h2>{displayTitle}</h2>
      <button onClick={handleClick}>Toggle</button>
    </div>
  );
};
```

### Aturan Komponen
- **Satu file = satu komponen utama** (boleh ada sub-komponen kecil di bawahnya)
- **Komponen tanpa side effect** diexport sebagai named export, bukan default
- **Named export** diutamakan (mempermudah refactor dan import auto-complete)
- **Default export** hanya untuk komponen yang di-lazy-load via React.lazy

```tsx
// ✅ BENAR — named export
export const PackageCard = ({ ... }: PackageCardProps) => { ... };

// ✅ BENAR — default export untuk lazy loading
const AdminDashboard = lazy(() => import('@/features/admin/pages/Dashboard'));

// ❌ HINDARI — default export untuk komponen reguler
export default function PackageCard() { ... }
```

---

## Data Fetching (TanStack Query)

Semua data dari Supabase **wajib** melalui TanStack Query.

```typescript
// ✅ BENAR — gunakan useQuery
const { data: packages, isLoading, error } = useQuery({
  queryKey: ['packages', { category, isActive: true }],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .eq('category_id', category);
    if (error) throw error;
    return data;
  },
});

// ✅ BENAR — gunakan useMutation untuk write
const createBooking = useMutation({
  mutationFn: async (payload: CreateBookingPayload) => {
    const { data, error } = await supabase
      .from('bookings')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast({ title: 'Booking berhasil!' });
  },
  onError: (error) => {
    toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
  },
});

// ❌ SALAH — fetch langsung di komponen tanpa TanStack Query
useEffect(() => {
  supabase.from('packages').select('*').then(({ data }) => setPackages(data));
}, []);
```

### QueryKey Convention
```typescript
// Format: [entity, filter-object]
['packages']                        // semua packages
['packages', { isActive: true }]   // packages aktif
['packages', packageId]            // satu package by ID
['bookings', userId]               // bookings milik user
['admin', 'bookings', filters]     // admin view bookings
```

---

## Forms (React Hook Form + Zod)

Semua form **wajib** validasi dengan Zod dan dikelola dengan RHF.

```typescript
// 1. Define schema di file validations.ts atau di file form
const bookingSchema = z.object({
  package_id: z.string().uuid(),
  room_type: z.enum(['quad', 'triple', 'double']),
  pilgrim_count: z.number().min(1).max(10),
});

type BookingForm = z.infer<typeof bookingSchema>;

// 2. Gunakan di komponen
const BookingForm = () => {
  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      room_type: 'quad',
      pilgrim_count: 1,
    },
  });

  const onSubmit = (data: BookingForm) => {
    createBooking.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="room_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipe Kamar</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                ...
              </Select>
              <FormMessage />  {/* auto-tampil error Zod */}
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
```

---

## Imports

### Path Alias
Selalu gunakan `@/` — tidak ada relative path yang melewati lebih dari 1 folder.

**Sebelum refactor** (struktur saat ini — `src/` flat):
```typescript
// ✅ BENAR — path saat ini
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// ❌ SALAH
import { supabase } from '../../integrations/supabase/client';
import { supabase } from '../../../integrations/supabase/client';
```

**Setelah refactor** (struktur target — `src/features/` + `src/shared/`):
```typescript
// ✅ BENAR — path target
import { supabase } from '@/shared/integrations/supabase/client';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ✅ BENAR — fitur gunakan shared, BUKAN import langsung dari fitur lain
import { formatCurrency } from '@/shared/lib/currency';  // ← lewat shared

// ❌ SALAH — feature-to-feature import langsung (melanggar ST01)
import { useBookingStatus } from '@/features/booking/hooks/useBookingStatus';  // ← dari fitur paket ke fitur booking
```

> **ST01:** Satu fitur tidak boleh import langsung dari fitur lain.  
> Jika dua fitur butuh berbagi kode → pindahkan ke `@/shared/`.

### Urutan Import
```typescript
// 1. React core
import React, { useState, useEffect } from 'react';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

// 3. Internal — shared (atau @/components, @/lib sebelum refactor)
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 4. Internal — feature-local (komponen/hook dalam fitur yang sama)
import { PackageCard } from '../components/PackageCard';

// 5. Types
import type { Package } from '@/integrations/supabase/types';
```

---

## Penanganan Error

```typescript
// ✅ BENAR — gunakan errorLogger, bukan console.log
import { logError } from '@/lib/errorLogger';

try {
  const result = await riskyOperation();
} catch (error) {
  logError(error, { context: 'booking-creation', userId });
  // Tampilkan pesan ke user
  toast({ title: 'Terjadi kesalahan', variant: 'destructive' });
}

// ✅ BENAR — handle Supabase error eksplisit
const { data, error } = await supabase.from('bookings').insert(payload);
if (error) {
  logError(error, { context: 'insert-booking' });
  throw new Error(error.message);
}

// ❌ SALAH — silent fallback
const { data } = await supabase.from('bookings').select('*');
// Kalau data null, app rusak tanpa pesan error
setBookings(data || []);  // ← ini silent fallback yang berbahaya jika tidak disengaja
```

---

## i18n (Multi-bahasa)

```typescript
// ✅ BENAR — semua teks user-facing pakai hook
import { useLanguage } from '@/i18n/LanguageContext';

const MyComponent = () => {
  const { t } = useLanguage();
  
  return <h1>{t('welcome_title')}</h1>;
};

// ❌ SALAH — hardcode bahasa
const MyComponent = () => <h1>Selamat Datang</h1>;
```

> Exception: teks dalam kode yang tidak pernah dilihat user (console.log, error code) boleh hardcode bahasa Inggris.

---

## Tailwind CSS

```tsx
// ✅ BENAR — gunakan cn() untuk conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  'px-4 py-2 rounded-lg',
  isActive && 'bg-primary text-white',
  isDisabled && 'opacity-50 cursor-not-allowed',
  className  // selalu terima className dari props
)}>
  ...
</div>

// ❌ HINDARI — string concatenation untuk conditional
<div className={`px-4 py-2 ${isActive ? 'bg-primary' : ''}`}>

// ✅ BENAR — CSS variables untuk warna brand
// Definisi di index.css, pakai via Tailwind tokens
<div className="bg-primary text-primary-foreground">
```

---

## Anti-Patterns yang Harus Dihindari

| Anti-pattern | Kenapa Buruk | Solusi |
|--------------|-------------|--------|
| `console.log` di production code | Bocorkan data sensitif | Gunakan `logError()` dari `errorLogger.ts` |
| `any` type tanpa alasan | Hilangkan type safety | Gunakan type yang spesifik |
| Fetch langsung di komponen | Tidak bisa cache, retry, loading state | Gunakan TanStack Query |
| Hardcode URL | Rusak di environment lain | Gunakan `env.ts` helpers |
| `!important` di Tailwind | Sulit di-override | Perbaiki specificity |
| Import `*` (wildcard) | Bundle bloat | Named import saja |
| Mutate state langsung | React tidak re-render | Gunakan `setState` / `setData` |
| `useEffect` untuk fetch data | Race condition, no cache | Gunakan `useQuery` |

---

## Naming Convention

Lihat **PROJECT_ARCHITECTURE.md Section 3** untuk naming convention lengkap.

Summary:
- Component: `PascalCase.tsx`
- Hook: `useXxx.ts(x)`
- Util: `camelCase.ts`
- SQL migration: `YYYYMMDD_NNN_deskripsi.sql`
- Constant: `UPPER_SNAKE_CASE`
- DB column: `snake_case`
