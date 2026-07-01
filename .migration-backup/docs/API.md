# API — Edge Functions
**Umroh Gateway** | Diperbarui: 2026-07-01

Semua server-side logic berjalan sebagai **Supabase Edge Functions** (Deno runtime).  
Lokasi: `supabase/functions/<nama-function>/index.ts`

---

## Cara Memanggil Edge Function dari Frontend

```typescript
const { data, error } = await supabase.functions.invoke('nama-function', {
  body: { key: 'value' },
});
```

Edge Functions otomatis menerima Supabase auth token dari request — tidak perlu kirim token manual.

---

## Daftar Edge Functions

### `payment-gateway`
Membuat transaksi pembayaran ke Midtrans atau Xendit.

**Trigger:** Jamaah klik "Bayar via Gateway"  
**Input:**
```json
{
  "booking_id": "uuid",
  "gateway": "midtrans | xendit",
  "amount": 5000000
}
```
**Output:**
```json
{
  "payment_url": "https://app.midtrans.com/...",
  "transaction_id": "MID-xxx"
}
```
**Side effect:** INSERT ke `payment_gateway_transactions` dengan status `pending`.  
**Env vars:** `MIDTRANS_SERVER_KEY`, `XENDIT_API_KEY`

---

### `payment-webhook`
Menerima notifikasi dari Midtrans/Xendit setelah pembayaran sukses/gagal.

**Trigger:** POST dari payment gateway (webhook)  
**URL:** `https://<project>.supabase.co/functions/v1/payment-webhook`  
**Validasi:** Verifikasi signature/token dari gateway  
**Side effect:**
- UPDATE `payment_gateway_transactions.status`
- UPDATE `payments.status` → `verified`
- UPDATE `bookings.status` → `paid`

---

### `send-email`
Kirim email transaksional via Resend.

**Trigger:** Dipanggil dari function lain (booking confirmed, payment verified, dll)  
**Input:**
```json
{
  "to": "user@example.com",
  "subject": "Booking Confirmed",
  "template": "booking_confirmed",
  "data": { "booking_code": "UMR-001", "name": "Ahmad" }
}
```
**Env vars:** `RESEND_API_KEY`  
**Status:** ❌ Belum aktif — butuh `RESEND_API_KEY`

---

### `send-whatsapp`
Kirim notifikasi WhatsApp via Fonnte atau Wablas.

**Input:**
```json
{
  "phone": "08123456789",
  "message": "Booking Anda berhasil dikonfirmasi.",
  "provider": "fonnte | wablas"
}
```
**Env vars:** `FONNTE_API_KEY` atau `WABLAS_API_KEY`  
**Status:** ❌ Belum aktif — butuh API key

---

### `payment-reminder`
Kirim reminder ke jamaah yang belum melunasi pembayaran.

**Trigger:** pg_cron — daily 09:00 WIB  
**Logic:**
1. Query bookings dengan status `dp_paid` / `installment` dan deadline < 7 hari
2. Kirim notifikasi in-app
3. (Opsional) Trigger `send-email` / `send-whatsapp`

---

### `follow-up-reminder`
Kirim reminder ke agen untuk follow-up CRM leads yang sudah lama tidak dikontak.

**Trigger:** pg_cron — daily 09:00 WIB  
**Logic:**
1. Query leads dengan `status = 'contacted'` dan `updated_at` > 7 hari lalu
2. Buat notifikasi untuk agen yang assigned

---

### `export-user-data`
Export semua data pribadi user (PDP compliance).

**Trigger:** User klik "Export Data Saya"  
**Auth:** Harus user sendiri (cek `auth.uid()`)  
**Output:** JSON file berisi semua data user (profile, bookings, payments, dll)  
**Side effect:** Log ke `audit_logs`

---

### `admin-impersonate`
Super admin masuk sebagai user lain untuk debugging.

**Auth:** Hanya `super_admin`  
**Input:** `{ "target_user_id": "uuid" }`  
**Output:** Custom access token  
**Side effect:** Log ke `audit_logs`

---

### `analytics-ai`
Generate AI insights dari data platform menggunakan LLM.

**Trigger:** Admin membuka halaman Analytics AI  
**Input:** Query/pertanyaan dalam bahasa natural  
**Output:** Analisis teks + data tabel  
**Env vars:** OpenAI API key atau Supabase AI integration

---

### `og-image`
Generate Open Graph image dinamis untuk setiap halaman paket.

**Trigger:** Bot/crawler request halaman paket  
**Input (query params):** `?title=...&price=...&image=...`  
**Output:** PNG image (800x420px)

---

### `sitemap`
Generate sitemap.xml dinamis berisi semua URL paket, blog, halaman.

**Trigger:** GET request ke `/functions/v1/sitemap`  
**Output:** XML sitemap

---

### `seo-audit`
Audit SEO halaman: cek meta tags, heading structure, image alt text.

**Input:** `{ "url": "https://..." }`  
**Output:** Laporan SEO dengan skor dan rekomendasi

---

### `translate`
Terjemahkan konten CMS ke bahasa lain.

**Input:**
```json
{
  "text": "Paket Umroh Hemat",
  "source_lang": "id",
  "target_lang": "en"
}
```
**Output:** `{ "translated": "Economical Umrah Package" }`  
**Env vars:** Translation API key (Google Translate / DeepL)

---

## Environment Variables Edge Functions

| Variable | Kegunaan | Status |
|----------|----------|--------|
| `MIDTRANS_SERVER_KEY` | Payment gateway Midtrans | 🟡 Butuh konfigurasi |
| `XENDIT_API_KEY` | Payment gateway Xendit | 🟡 Butuh konfigurasi |
| `RESEND_API_KEY` | Email transaksional | ❌ Belum ada |
| `FONNTE_API_KEY` | WhatsApp notifikasi | ❌ Belum ada |
| `WABLAS_API_KEY` | WhatsApp notifikasi (alt) | ❌ Belum ada |
| `SUPABASE_SERVICE_ROLE_KEY` | Database admin access dari Edge Func | ✅ Auto-inject Supabase |

---

## Deploy Edge Functions

```bash
# Deploy semua function
supabase functions deploy

# Deploy satu function
supabase functions deploy payment-gateway

# Set env var untuk functions
supabase secrets set MIDTRANS_SERVER_KEY=...
supabase secrets set RESEND_API_KEY=...

# Lihat daftar secrets
supabase secrets list
```

---

## Testing Edge Functions Lokal

```bash
# Start Supabase lokal
supabase start

# Jalankan function secara lokal
supabase functions serve payment-gateway --env-file .env.local

# Test via curl
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/payment-gateway' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"booking_id":"...","gateway":"midtrans","amount":5000000}'
```
