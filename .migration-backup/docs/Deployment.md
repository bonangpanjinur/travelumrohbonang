# Deployment
**Umroh Gateway** | Diperbarui: 2026-07-01

---

## Environment: Replit (Development / Production)

Project ini di-host di **Replit** menggunakan pnpm monorepo.

### Artifacts & Workflows

| Artifact | Workflow | Port |
|----------|---------|------|
| `umroh-app` (frontend) | `pnpm --filter @workspace/umroh-app run dev` | `$PORT` (env) |
| `api-server` (backend) | `pnpm --filter @workspace/api-server run dev` | `$PORT` (env) |

> ⚠️ Jangan hardcode port. Selalu gunakan `process.env.PORT` atau `import.meta.env.VITE_PORT`.

---

## Environment Variables yang Dibutuhkan

### Frontend (`artifacts/umroh-app`)
Set di Replit Secrets atau `.env.local` (jangan commit ke git):

| Variable | Wajib | Keterangan |
|----------|-------|-----------|
| `VITE_SUPABASE_URL` | ✅ | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon/public key Supabase |
| `VITE_SUPABASE_PROJECT_ID` | ⬜ | Project ID (untuk Supabase CLI) |
| `VITE_TURNSTILE_SITE_KEY` | ⬜ | Cloudflare Turnstile site key (CAPTCHA) |
| `VITE_SENTRY_DSN` | ⬜ | Sentry DSN (error tracking) |
| `VITE_ENVIRONMENT` | ⬜ | `development` / `production` |
| `VITE_APP_ORIGIN` | ⬜ | Base URL app (auto-detect dari `window.location`) |

### Backend / Edge Functions (set via `supabase secrets set`)
| Variable | Keterangan |
|----------|-----------|
| `MIDTRANS_SERVER_KEY` | Server key Midtrans |
| `MIDTRANS_CLIENT_KEY` | Client key Midtrans |
| `XENDIT_API_KEY` | API key Xendit |
| `RESEND_API_KEY` | API key Resend (email) |
| `FONNTE_API_KEY` | API key Fonnte (WhatsApp) |
| `WABLAS_API_KEY` | API key Wablas (WhatsApp alt) |

---

## Cara Set Environment Variables di Replit

### Via Replit Secrets (direkomendasikan)
1. Buka tab **Secrets** di Replit
2. Tambah key-value pair
3. Restart workflow setelah menambah secret baru

### Via `.env.local` (local dev only — jangan commit)
```bash
# artifacts/umroh-app/.env.local
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TURNSTILE_SITE_KEY=0x...
```

---

## Deploy ke Replit Production

1. Pastikan semua secrets sudah dikonfigurasi di Replit
2. Pastikan app berjalan normal di development
3. Klik **Deploy** di Replit UI → pilih **Autoscale** atau **Reserved VM**
4. Set environment production secrets terpisah dari development

---

## Deploy Supabase

### Database Migration
```bash
# Push semua migration baru ke Supabase
supabase db push

# Atau apply satu per satu
supabase migration apply

# Lihat status migration
supabase migration list
```

### Edge Functions
```bash
# Deploy semua Edge Functions
supabase functions deploy

# Deploy satu function
supabase functions deploy payment-gateway

# Set secrets untuk functions
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set MIDTRANS_SERVER_KEY=SB-Mid-server-...
```

### Update TypeScript Types setelah Migration
```bash
supabase gen types typescript --linked \
  > artifacts/umroh-app/src/integrations/supabase/types.ts
```

---

## Checklist Deployment

### Pre-Deploy
- [ ] Semua `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sudah di-set
- [ ] Database migration sudah di-push (`supabase db push`)
- [ ] Edge Functions sudah di-deploy
- [ ] `types.ts` sudah diupdate setelah migration terakhir
- [ ] Build berhasil (`pnpm --filter @workspace/umroh-app build`)
- [ ] Tidak ada TypeScript error kritis
- [ ] Workflow test passing (`pnpm test`)

### Post-Deploy
- [ ] Buka app, pastikan tidak ada blank screen
- [ ] Login berhasil
- [ ] Cek halaman paket tampil
- [ ] Cek admin panel bisa diakses
- [ ] Cek browser console — tidak ada error Supabase

---

## Troubleshooting Deployment

### Blank screen / app tidak muncul
1. Cek browser console untuk error
2. Pastikan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sudah di-set
3. Cek workflow logs di Replit
4. Pastikan port tidak di-hardcode (gunakan `$PORT`)

### `supabaseUrl is required`
```
Error: supabaseUrl is required
```
Penyebab: `VITE_SUPABASE_URL` belum di-set.  
Fix: Set di Replit Secrets → restart workflow.

### Edge Function error
```bash
# Cek logs Edge Function
supabase functions logs payment-gateway

# Cek apakah secrets sudah di-set
supabase secrets list
```

### Database connection error
- Pastikan RLS policy tidak terlalu restrictive
- Cek apakah migration sudah berhasil dijalankan
- Verifikasi anon key masih valid (tidak expired)

---

## Rollback

Jika terjadi error setelah deploy:

### Frontend
- Gunakan Replit Checkpoint untuk rollback ke versi sebelumnya
- Atau revert ke commit git terakhir yang berjalan

### Database
- Buat migration baru yang membatalkan perubahan (jangan edit migration lama)
- Jalankan `supabase db push`

### Edge Functions
- Revert kode function
- Jalankan `supabase functions deploy <nama-function>`
