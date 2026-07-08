# DATABASE_MAP.md
> Peta database lengkap — tabel, kolom, relasi, ERD, dan daftar SQL.
> Terakhir diperbarui: 2026-07-08

---

## Ringkasan Tabel

| Kategori | Tabel |
|----------|-------|
| Auth & Users | `profiles`, `user_roles` |
| Paket | `packages`, `package_categories`, `package_departures` |
| Booking | `bookings`, `booking_pilgrims`, `pilgrim_documents` |
| Pembayaran | `payments` |
| Agen | `agents`, `agent_commissions`, `agent_withdrawals` |
| Master Data | `hotels`, `airlines`, `airports`, `muthawifs`, `branches` |
| CMS | `blog_posts`, `pages`, `gallery`, `faqs`, `cms_navigation` |
| Config | `site_settings` |
| Social | `wishlists`, `reviews`, `notifications` |
| System | `logs` |

---

## Detail Tabel

### Auth & Users

#### `profiles`
```
id          uuid        PK, FK → auth.users.id
fullName    text
email       text        unique
phone       text
avatarUrl   text
role        text        (legacy field, gunakan user_roles)
isActive    boolean     default true
createdAt   timestamptz
updatedAt   timestamptz
```

#### `user_roles`
```
id          uuid        PK
userId      uuid        FK → profiles.id
role        enum        super_admin | admin | branch_manager | staff | agent | buyer
isActive    boolean     default true
assignedBy  uuid        FK → profiles.id (nullable)
createdAt   timestamptz
```

Hierarki role: `super_admin > admin > branch_manager > staff > agent > buyer`

---

### Paket

#### `package_categories`
```
id              uuid        PK
name            text
description     text
parentId        uuid        FK → package_categories.id (self-ref, nullable)
icon            text
showExtraHotels boolean
isActive        boolean
sortOrder       int
createdAt       timestamptz
```

#### `packages`
```
id              uuid        PK
slug            text        unique
title           text
description     text
categoryId      uuid        FK → package_categories.id
basePrice       numeric
durationDays    int
isActive        boolean
isFeatured      boolean
createdAt       timestamptz
```

#### `package_departures`
```
id              uuid        PK
packageId       uuid        FK → packages.id
departureDate   date
returnDate      date
quota           int
bookedCount     int         default 0 (updated by trigger)
hotelMekkahId   uuid        FK → hotels.id
hotelMadinahId  uuid        FK → hotels.id
airlineId       uuid        FK → airlines.id
price           numeric
status          text        open | closed | full
createdAt       timestamptz
```

---

### Booking

#### `bookings`
```
id              uuid        PK
bookingCode     text        unique (generated)
userId          uuid        FK → profiles.id
packageId       uuid        FK → packages.id
departureId     uuid        FK → package_departures.id
agentId         uuid        FK → agents.id (nullable)
roomType        text        double | triple | quad
totalAmount     numeric
status          enum        pending | confirmed | cancelled | completed
paymentStatus   enum        unpaid | partial | paid | refunded
createdAt       timestamptz
updatedAt       timestamptz
```

#### `booking_pilgrims`
```
id              uuid        PK
bookingId       uuid        FK → bookings.id
name            text
nik             text        (nomor induk kependudukan)
passportNumber  text
gender          text
birthDate       date
mahramRelation  text        (nullable)
```

#### `pilgrim_documents`
```
id              uuid        PK
bookingId       uuid        FK → bookings.id
pilgrimId       uuid        FK → booking_pilgrims.id
type            text        passport | ktp | visa | photo | etc.
fileUrl         text
status          text        pending | verified | rejected
uploadedAt      timestamptz
verifiedAt      timestamptz (nullable)
verifiedBy      uuid        FK → profiles.id (nullable)
```

---

### Pembayaran

#### `payments`
```
id              uuid        PK
bookingId       uuid        FK → bookings.id
amount          numeric
method          text        bank_transfer | gateway | cash
status          enum        pending | verified | rejected | refunded
proofUrl        text        (bukti transfer, nullable)
notes           text
createdAt       timestamptz
verifiedAt      timestamptz (nullable)
verifiedBy      uuid        FK → profiles.id (nullable)
```

---

### Agen

#### `agents`
```
id              uuid        PK
userId          uuid        FK → profiles.id, unique
agentCode       text        unique
commissionRate  numeric     (percentage)
totalCommission numeric     default 0
withdrawnAmount numeric     default 0
isActive        boolean
createdAt       timestamptz
```

#### `agent_commissions`
```
id              uuid        PK
agentId         uuid        FK → agents.id
bookingId       uuid        FK → bookings.id
amount          numeric
status          text        pending | paid
paidAt          timestamptz (nullable)
```

#### `agent_withdrawals`
```
id              uuid        PK
agentId         uuid        FK → agents.id
amount          numeric
status          text        pending | approved | rejected | processed
processedAt     timestamptz (nullable)
processedBy     uuid        FK → profiles.id (nullable)
```

---

### Master Data

#### `hotels`
```
id, name, city, stars, imageUrl, description, createdAt
```

#### `airlines`
```
id, name, code, logoUrl, createdAt
```

#### `airports`
```
id, name, code, city, createdAt
```

#### `muthawifs`
```
id, name, phone, photoUrl, bio, isActive, createdAt
```

#### `branches`
```
id, name, slug, address, phone, email
city, region, postalCode, country
latitude, longitude (nullable)
openingHours, imageUrl, mapUrl
description, isActive, createdAt
```

---

### CMS & Config

#### `gallery`
```
id, title, imageUrl
departureId     uuid    FK → package_departures.id (nullable)
category, isActive, sortOrder, createdAt
```

#### `faqs`
```
id, question, answer, category, sortOrder, isActive, createdAt
```

#### `blog_posts`
```
id, title, slug, content (rich text)
authorId        uuid    FK → profiles.id
status          text    draft | published
publishedAt, createdAt, updatedAt
```

#### `pages` (static CMS pages)
```
id, title, slug, content, status, createdAt, updatedAt
```

#### `cms_navigation`
```
id, label, href, icon
parentId        uuid    FK → cms_navigation.id (self-ref, nullable)
sortOrder, isActive
roles           text[]  (array of allowed roles, empty = public)
```

#### `site_settings`
```
id      uuid    PK
key     text    unique  (e.g. "primary_color", "site_name")
value   text
type    text    string | color | boolean | json
```

---

### Social

#### `wishlists`
```
id, userId (FK → profiles.id), packageId (FK → packages.id), createdAt
UNIQUE(userId, packageId)
```

#### `reviews`
```
id
packageId       uuid    FK → packages.id
userId          uuid    FK → profiles.id
rating          int     1–5
comment         text
isApproved      boolean default false
createdAt
```

#### `notifications`
```
id
userId          uuid    FK → profiles.id
type            text    booking | payment | system | promo
title, message
isRead          boolean default false
relatedId       uuid    (nullable — booking/payment ID)
relatedType     text    (nullable)
createdAt
```

---

### System

#### `logs`
```
id
type            text    request | error | audit
userId          uuid    (nullable)
method, path, statusCode
duration        int     (ms)
message, metadata (jsonb)
createdAt
```

---

## ERD (Entity Relationship Diagram)

```
[package_categories] ──── N [packages]
[package_categories] ──── N [package_categories] (self-ref parent)

[packages]      ──── N [package_departures]
[packages]      ──── N [wishlists]
[packages]      ──── N [reviews]

[hotels]        ──── N [package_departures] (mekkah)
[hotels]        ──── N [package_departures] (madinah)
[airlines]      ──── N [package_departures]

[profiles]      ──── N [user_roles]
[profiles]      ──── N [bookings]
[profiles]      ──── N [notifications]
[profiles]      ──── N [wishlists]
[profiles]      ──── N [reviews]
[profiles]      ──── 1 [agents]

[bookings]      ──── N [payments]
[bookings]      ──── N [booking_pilgrims]
[bookings]      ──── N [pilgrim_documents]
[bookings]      ──── 1 [agent_commissions]

[booking_pilgrims] ── N [pilgrim_documents]

[agents]        ──── N [agent_commissions]
[agents]        ──── N [agent_withdrawals]

[package_departures] ── N [gallery]

[blog_posts]    ──── 1 [profiles] (author)
[cms_navigation] ─── N [cms_navigation] (self-ref parent)
```

---

## Daftar SQL Files

| File | Kategori | Status | Keterangan |
|------|----------|--------|------------|
| `supabase-schema.sql` | Schema | ✅ Source of truth | Generated dari Drizzle ORM, idempotent |
| `supabase-deploy.sql` | Schema + Config | ✅ | Combined deploy script |
| `supabase-seed.sql` | Seed | ✅ | Data awal umum |
| `supabase-seed-prod.sql` | Seed | ✅ | Production seed, idempotent |
| `scripts/seed.sql` | Seed | ✅ | Dev environment seed |
| `scripts/migrations/supabase_schema.sql` | Schema + Policy (RLS) | ⚠️ Mungkin drift | Berisi RLS policies, bisa beda dari Drizzle |
| `scripts/migrations/business_logic_triggers.sql` | Trigger + Function | ⚠️ Konflik auth | Ada trigger untuk Replit Auth — perlu di-review |
| `scripts/migrations/add_new_user_profile_trigger.sql` | Trigger | ⚠️ Supabase only | Butuh `auth` schema — gagal di local |
| `scripts/migrations/add_show_extra_hotels_to_package_categories.sql` | Migration | ✅ | Tambah kolom + backfill |

---

## Business Logic Triggers

Semua trigger ada di `scripts/migrations/business_logic_triggers.sql`.

| Trigger | Event | Tabel | Fungsi |
|---------|-------|-------|--------|
| `check_departure_quota` | BEFORE INSERT | `bookings` | Hard lock quota via `FOR UPDATE` — cegah overbooking |
| `update_departure_booked_count` | AFTER INSERT/UPDATE | `bookings` | Update counter `bookedCount` di `package_departures` |
| `auto_confirm_booking` | AFTER UPDATE | `payments` | Auto-confirm booking saat `payment.status = 'verified'` |
| `calculate_agent_commission` | AFTER INSERT | `bookings` | Insert row ke `agent_commissions` jika booking via agen |
| `send_booking_notification` | AFTER INSERT/UPDATE | `bookings` | Insert notifikasi ke `notifications` |
| `create_user_profile` | AFTER INSERT | `auth.users` | Auto-create row di `profiles` untuk user baru |
| `update_updated_at` | BEFORE UPDATE | Multiple tables | Auto-update kolom `updatedAt` |
| `log_booking_changes` | AFTER INSERT/UPDATE | `bookings` | Audit trail di `logs` |

> ⚠️ **Perhatian**: `business_logic_triggers.sql` berisi trigger yang merujuk Replit Auth schema. Ini konflik dengan Supabase Auth. Perlu diaudit dan dibersihkan sebelum deploy ke Supabase.
