

# Rencana: Tema Warna Merah & Sistem Tema Global

## Masalah Saat Ini

1. **Tema warna sekarang** menggunakan Brown/Gold (hue 25-38) — bukan merah
2. **Hardcoded color references** tersebar di banyak file: `emerald-light`, `emerald-500`, `green-500`, dll. — ini bukan dari CSS variables, jadi tidak ikut berubah saat tema diganti
3. **Sistem tema hanya light/dark** — tidak mendukung color scheme switching (misal merah, biru, hijau)

## Rencana Perbaikan

### Step 1: Ubah Skema Warna ke Merah-Gold

Update `src/index.css` — ganti semua HSL values:

| Token | Sekarang (Brown) | Baru (Merah) |
|-------|-----------------|--------------|
| `--primary` (light) | `25 35% 18%` (coklat gelap) | `0 65% 25%` (maroon/merah gelap) |
| `--primary` (dark) | `38 75% 55%` (gold) | `0 70% 55%` (merah terang) |
| `--accent` | `38 75% 55%` (gold) | `38 75% 55%` (gold — tetap sebagai aksen) |
| `--sidebar-*` | brown tones | red-maroon tones |
| `--elegant-black*` | brown-black | red-black (hue 0-5) |
| `--card`, `--background` | warm brown cream | warm red-tinted cream |

Palet identitas: **Merah Maroon + Gold** — khas travel umroh premium.

### Step 2: Bersihkan Hardcoded Colors

Cari dan ganti semua hardcoded Tailwind colors yang tidak mengikuti tema:

| Hardcoded | Ganti ke |
|-----------|----------|
| `emerald-light/20` | `primary-foreground/20` atau `accent/20` |
| `border-emerald-light` | `border-primary-foreground/20` |
| `bg-emerald-light/30` | `bg-accent/30` |
| `text-emerald-500/600` | `text-success` (untuk status) |
| `text-green-500/600` | `text-success` |
| `bg-green-100` | `bg-success/10` |

**File yang perlu diupdate** (~6 file):
- `src/components/Navbar.tsx` — banyak `emerald-light` references
- `src/components/Footer.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/NotificationBell.tsx`
- `src/components/LanguageSwitcher.tsx`
- `src/pages/Dashboard.tsx` — `green-500`, `green-100`

### Step 3: Tambah Kemampuan Color Scheme Global (Opsional/Future)

Extend `ThemeProvider` agar mendukung `colorScheme` selain `light/dark`:

```text
ThemeProvider
├── mode: "light" | "dark"
└── colorScheme: "red" | "brown" | "blue" | "green"
```

Setiap `colorScheme` = set CSS variables berbeda yang di-apply via class `.theme-red`, `.theme-brown`, dll. Ini memungkinkan owner travel mengganti warna brand dari admin settings.

**Untuk saat ini**: fokus ke Step 1 & 2 (tema merah fixed). Step 3 bisa ditambahkan nanti.

## File yang Akan Diubah

1. **`src/index.css`** — ubah semua CSS variables ke palet merah-maroon
2. **`src/components/Navbar.tsx`** — ganti ~15 hardcoded `emerald-light` references
3. **`src/components/Footer.tsx`** — ganti `emerald-light` references
4. **`src/components/ThemeToggle.tsx`** — ganti `emerald-light`
5. **`src/components/NotificationBell.tsx`** — ganti `emerald-light`
6. **`src/components/LanguageSwitcher.tsx`** — ganti `emerald-light`
7. **`src/pages/Dashboard.tsx`** — ganti `green-*` ke semantic tokens
8. **`src/pages/admin/MultiBranch.tsx`** — ganti `emerald-*` ke semantic tokens
9. **`src/pages/admin/Accounting.tsx`** — ganti `emerald-*` ke semantic tokens
10. **`tailwind.config.ts`** — hapus `emeraldBlack` references jika ada, pastikan `elegantBlack` rename sesuai

## Hasil Akhir

- Tema identik **merah maroon + gold** di seluruh aplikasi
- Tidak ada lagi hardcoded color yang "bocor" saat tema berubah
- Dark mode tetap berfungsi dengan palet merah
- Fondasi siap untuk multi-color-scheme di masa depan

