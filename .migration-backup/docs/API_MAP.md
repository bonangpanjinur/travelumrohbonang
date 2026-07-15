# API_MAP.md
> Semua endpoint API — method, URL, source file, dan status.
> Terakhir diperbarui: 2026-07-08

---

## Base URL

| Environment | URL |
|-------------|-----|
| Development (Replit) | `http://localhost:8080` |
| Production (Vercel) | `https://<your-domain>.vercel.app` |

---

## Autentikasi

Semua endpoint yang memerlukan auth harus menyertakan header:
```
Authorization: Bearer <supabase_access_token>
```

Token didapat dari Supabase Auth (`supabase.auth.signInWithPassword()`).

---

## Health Check

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/health` | `health.ts` | — | ✅ Working |
| GET | `/healthz` | `health.ts` | — | ✅ Working |

---

## Auth

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/auth/user` | `auth.ts` | Bearer | ✅ Working |
| GET | `/logout` | `auth.ts` | Bearer | ✅ Working |

---

## Paket (Public)

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/packages` | `packages.ts` | — | ✅ Working |
| GET | `/packages/filter-options` | `packages.ts` | — | ✅ Working |
| GET | `/packages/:slug` | `packages.ts` | — | ✅ Working |
| GET | `/packages/reviews/:packageId` | `packages.ts` | — | ✅ Working |

---

## FAQ (Public)

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/faqs` | `faqs.ts` | — | ✅ Working |

---

## CMS (Public)

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/cms/site-settings` | `cms.ts` | — | ✅ Working |
| GET | `/cms/navigation` | `cms.ts` | — | ✅ Working |
| GET | `/cms/blog` | `cms.ts` | — | ✅ Working |
| GET | `/cms/blog/:slug` | `cms.ts` | — | ✅ Working |
| GET | `/cms/gallery` | `cms.ts` | — | ✅ Working |
| GET | `/cms/services` | `cms.ts` | — | ✅ Working |
| GET | `/cms/chat-messages?booking_id=` | `cms.ts` | — | 🔴 **SECURITY BUG** — no auth/ownership check |

> 🔴 **Critical**: `/cms/chat-messages` tidak memiliki auth check. Siapapun yang mengetahui `booking_id` bisa membaca semua pesan chat booking tersebut. Lihat [BUG_TRACKER.md](./BUG_TRACKER.md) — Bug B6.

---

## Misc (Public)

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/currencies` | `misc.ts` | — | ✅ Working |
| GET | `/tenant-site` | `misc.ts` | — | ✅ Working |

---

## Logging (Public — rate limited)

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| POST | `/logs/request` | `logs.ts` | — | ✅ Working |
| POST | `/logs/error` | `logs.ts` | — | ✅ Working |
| POST | `/logs/audit` | `logs.ts` | — | ✅ Working |

---

## Booking (Auth Required)

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/bookings/my` | `bookings.ts` | Bearer | ✅ Working |
| POST | `/bookings` | `bookings.ts` | Bearer | ✅ Working |
| GET | `/bookings/:id` | `bookings.ts` | Bearer | ✅ Working |
| PATCH | `/bookings/:id/status` | `bookings.ts` | Bearer | ✅ Working |
| POST | `/bookings/:id/rooms` | `bookings.ts` | Bearer | ✅ Working |
| POST | `/bookings/:id/pilgrims` | `bookings.ts` | Bearer | ✅ Working |

---

## Profil (Auth Required)

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/profile/:id` | `profile.ts` | Bearer | ✅ Working |
| PATCH | `/profile/:id` | `profile.ts` | Bearer | ✅ Working |

---

## Notifikasi (Auth Required)

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/notifications` | `notifications.ts` | Bearer | ✅ Working |
| PATCH | `/notifications/:id/read` | `notifications.ts` | Bearer | ✅ Working |
| PATCH | `/notifications/read-all` | `notifications.ts` | Bearer | ✅ Working |

---

## Pilgrim Documents (Auth Required)

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/pilgrim-documents` | `pilgrim-documents.ts` | Bearer | ✅ Working |
| POST | `/pilgrim-documents` | `pilgrim-documents.ts` | Bearer | ✅ Working |
| PATCH | `/pilgrim-documents/:id` | `pilgrim-documents.ts` | Bearer | ✅ Working |

---

## Wishlist (Auth Required)

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/wishlists` | `wishlists.ts` | Bearer | ✅ Working |
| POST | `/wishlists/toggle` | `wishlists.ts` | Bearer | ✅ Working |

---

## Admin — Users

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/admin/users` | `admin/users.ts` | Admin | ✅ Working |
| GET | `/admin/users/:id` | `admin/users.ts` | Admin | ✅ Working |
| PATCH | `/admin/users/:id` | `admin/users.ts` | Admin | ✅ Working |
| DELETE | `/admin/users/:id` | `admin/users.ts` | Admin | ✅ Working |

## Admin — Agen

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/admin/agents` | `admin/agents.ts` | Admin | ✅ Working |
| POST | `/admin/agents` | `admin/agents.ts` | Admin | ✅ Working |
| GET | `/admin/agents/:id` | `admin/agents.ts` | Admin | ✅ Working |
| PATCH | `/admin/agents/:id` | `admin/agents.ts` | Admin | ✅ Working |
| GET | `/admin/agents/commissions` | `admin/agents.ts` | Admin | ✅ Working |

## Admin — Booking

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/admin/bookings` | `admin/bookings.ts` | Admin | ✅ Working |
| GET | `/admin/bookings/recent` | `admin/bookings.ts` | Admin | ✅ Working |
| GET | `/admin/bookings/:id` | `admin/bookings.ts` | Admin | ✅ Working |
| PATCH | `/admin/bookings/:id/status` | `admin/bookings.ts` | Admin | ✅ Working |

## Admin — Payments

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/admin/payments` | `admin/payments.ts` | Finance | ⚠️ Partial |
| PATCH | `/admin/payments/:id/verify` | `admin/payments.ts` | Finance | ⚠️ Partial |
| GET | `/admin/refunds` | `admin/refunds.ts` | Finance | ⚠️ Partial |

## Admin — Paket & Keberangkatan

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET/POST/PATCH/DELETE | `/admin/packages/*` | `admin/packages.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/departures/*` | `admin/departures.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/masterdata/*` | `admin/masterdata.ts` | Admin | ✅ Working |

## Admin — Settings & System

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/admin/settings` | `admin/settings.ts` | Admin | ✅ Working |
| PATCH | `/admin/settings` | `admin/settings.ts` | Admin | ✅ Working |
| GET | `/admin/system-health` | `admin/systemHealth.ts` | Admin | ✅ Working |
| GET/PATCH | `/admin/tenant` | `admin/tenant.ts` | Super Admin | ✅ Working |

## Admin — CRM

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET | `/admin/crm/leads` | `admin/crm.ts` | Admin | ✅ Working |
| POST | `/admin/crm/leads` | `admin/crm.ts` | Admin | ✅ Working |
| PATCH | `/admin/crm/leads/:id` | `admin/crm.ts` | Admin | ✅ Working |

## Admin — Content (CMS)

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET/POST/PATCH/DELETE | `/admin/content/blog` | `admin/content.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/content/gallery` | `admin/content.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/content/pages` | `admin/content.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/gallery` | `admin/gallery.ts` | Admin | ✅ Working |

## Admin — Lainnya

| Method | URL | File | Auth | Status |
|--------|-----|------|------|--------|
| GET/POST/PATCH/DELETE | `/admin/branches/*` | `admin/branches.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/reviews/*` | `admin/reviews.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/pilgrims/*` | `admin/pilgrims.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/documents/*` | `admin/documents.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/chats/*` | `admin/chats.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/loyalty/*` | `admin/loyalty.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/seo/*` | `admin/seo.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/redirects/*` | `admin/redirects.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/testimonials/*` | `admin/testimonials.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/coupons/*` | `admin/coupons.ts` | Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/integrations/*` | `admin/integrations.ts` | Super Admin | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/costs/*` | `admin/costs.ts` | Finance | ⚠️ Partial |
| GET/POST | `/admin/logs/*` | `admin/logs.ts` | Admin | ✅ Working |

---

## Proxy / Infrastructure

| Method | URL | File | Auth | Keterangan |
|--------|-----|------|------|------------|
| GET/POST/PATCH/DELETE | `/api/rest/:table` | `rest.ts` | Conditional | Supabase proxy, ALLOWED_TABLES whitelist |
| POST | `/api/rest/rpc/:func` | `rest.ts` | Conditional | Supabase RPC proxy |
| GET | `/api/storage/object/public/:bucket/*name` | `storage.ts` | — | Public storage access |
| POST | `/api/storage/object/:bucket/*name` | `storage.ts` | Bearer | Upload ke Supabase Storage |
| DELETE | `/api/storage/object/:bucket/*name` | `storage.ts` | Bearer | Hapus dari Supabase Storage |

---

## Error Responses

| Status | Situasi |
|--------|---------|
| `400` | Request tidak valid (missing field, tabel tidak ada di whitelist) |
| `401` | Token tidak ada, expired, atau tidak valid |
| `403` | Token valid tapi role tidak cukup |
| `404` | Resource tidak ditemukan |
| `429` | Rate limit terlampaui |
| `500` | Server error — lihat logs |
