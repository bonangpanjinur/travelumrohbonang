# Admin API — Structured Error Schema

Semua route di bawah `/api/admin/*` yang sudah memakai `sendAdminError()` dari
`artifacts/api-server/src/lib/adminApiError.ts` mengembalikan **shape JSON yang
sama** untuk error 4xx/5xx. Frontend boleh mengandalkan field-field ini tanpa
harus optional-chaining setiap properti.

## Shape

```jsonc
{
  "ok": false,              // selalu false untuk error response
  "error": "db_unreachable", // machine code — cocok untuk switch/case di UI
  "endpoint": "GET /api/admin/bookings", // route asal error
  "status": 503,            // HTTP status yang di-set di response
  "detail": "connect ECONNREFUSED 10.0.0.1:6543", // pesan mentah dari driver/Supabase
  "code": "ECONNREFUSED",   // Postgres/PostgREST/driver code, atau null
  "hint": "Database tidak bisa dihubungi. Cek env DATABASE_URL ...", // saran actionable
  "timestamp": "2026-07-13T04:12:33.101Z" // ISO-8601 UTC
}
```

### Field reference

| Field       | Tipe               | Selalu ada | Keterangan |
| ----------- | ------------------ | :--------: | ---------- |
| `ok`        | `false`            | ✅ | Diskriminator. Response sukses tidak punya field ini. |
| `error`     | `string`           | ✅ | Machine code stabil (lihat tabel di bawah). Aman untuk `switch`. |
| `endpoint`  | `string`           | ✅ | Format `"<METHOD> <path>"`, mis. `"GET /api/admin/bookings"`. |
| `status`    | `number`           | ✅ | Sama dengan HTTP status code response. |
| `detail`    | `string`           | ✅ | Pesan singkat dari sumber error. Boleh ditampilkan ke admin, jangan ke buyer. |
| `code`      | `string \| null`   | ✅ | Kode teknis (SQLSTATE, PostgREST code, errno). `null` bila tidak tersedia. |
| `hint`      | `string`           | ✅ | Saran perbaikan berbahasa Indonesia untuk admin/operator. |
| `timestamp` | `string` (ISO-8601)| ✅ | Waktu server saat error dibentuk. |

Tidak ada field lain yang di-emit. Jangan berasumsi ada `stack`, `data`, atau
`details` — mereka **tidak** ada.

## Machine codes (`error`)

| `error`                 | `status` | Kapan terjadi |
| ----------------------- | :------: | ------------- |
| `db_unreachable`        | 503 | Postgres tidak bisa dihubungi (`ECONNREFUSED`, `ETIMEDOUT`, `57P03`, `08006`, `08001`, `UND_ERR_CONNECT_TIMEOUT`, dst). |
| `db_auth_failed`        | 503 | Kredensial DATABASE_URL salah (`password authentication failed`, role tidak ada). |
| `table_missing`         | 503 | Tabel belum ada di project Supabase aktif (`42P01` / `relation ... does not exist`). |
| `supabase_unauthorized` | 401 | Supabase menolak request (`PGRST301`, JWT invalid, anon/service key salah project). |
| `internal_error`        | 500 | Fallback — belum terklasifikasi. `detail` + Vercel log adalah sumber kebenaran. |

Klasifikasi diatur di `classify()` pada `adminApiError.ts`. Menambah kode baru
= tambah cabang di sana + baris di tabel ini.

## Contoh per skenario

### 1. DB down / DATABASE_URL salah host

```json
{
  "ok": false,
  "error": "db_unreachable",
  "endpoint": "GET /api/admin/bookings",
  "status": 503,
  "detail": "connect ECONNREFUSED 10.0.0.1:6543",
  "code": "ECONNREFUSED",
  "hint": "Database tidak bisa dihubungi. Cek env DATABASE_URL (Vercel Production, port 6543 pooler) dan buka /api/health/detail untuk diagnosa detail.",
  "timestamp": "2026-07-13T04:12:33.101Z"
}
```

### 2. Anon key beda project

```json
{
  "ok": false,
  "error": "supabase_unauthorized",
  "endpoint": "GET /api/admin/menu-permissions/my",
  "status": 401,
  "detail": "JWT expired",
  "code": "PGRST301",
  "hint": "Supabase menolak request. Cek VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY sesuai project aktif (hindari duplikat/scope Preview yang override Production).",
  "timestamp": "2026-07-13T04:12:33.101Z"
}
```

### 3. Schema belum ter-push ke Supabase production

```json
{
  "ok": false,
  "error": "table_missing",
  "endpoint": "GET /api/admin/bookings",
  "status": 503,
  "detail": "relation \"bookings\" does not exist",
  "code": "42P01",
  "hint": "Tabel belum ada di database production. Sinkronkan schema (drizzle push / SQL migration) ke project Supabase yang aktif.",
  "timestamp": "2026-07-13T04:12:33.101Z"
}
```

### 4. Error tak terklasifikasi

```json
{
  "ok": false,
  "error": "internal_error",
  "endpoint": "PATCH /api/admin/menu-permissions/:id",
  "status": 500,
  "detail": "Cannot read properties of undefined (reading 'role')",
  "code": null,
  "hint": "Error tidak terklasifikasi. Lihat 'detail' + Vercel function log. Buka /api/health/detail untuk cek env & konektivitas.",
  "timestamp": "2026-07-13T04:12:33.101Z"
}
```

## Pola konsumsi di frontend

```ts
import { apiFetch } from "@/shared/lib/apiClient";

type AdminApiError = {
  ok: false;
  error: string;
  endpoint: string;
  status: number;
  detail: string;
  code: string | null;
  hint: string;
  timestamp: string;
};

try {
  const bookings = await apiFetch<Booking[]>("/api/admin/bookings");
} catch (e) {
  // apiFetch melempar Error(body.error) — untuk pesan lengkap,
  // handler yang butuh field terstruktur harus pakai fetch langsung
  // atau extend apiFetch untuk mengembalikan body error mentah.
}
```

> ⚠️ `apiFetch` saat ini hanya melempar `Error(body.error)`.
> Bila komponen admin butuh `hint` / `code` / `endpoint` untuk ditampilkan,
> panggil `fetch` langsung dan parse response error sebagai `AdminApiError`.

## Route yang sudah pakai schema ini

- `GET  /api/admin/bookings`
- `GET  /api/admin/menu-permissions/my`
- `GET  /api/admin/menu-permissions`
- `PATCH /api/admin/menu-permissions/:id`
- `DELETE /api/admin/menu-permissions/:id`

Route admin lain masih pakai `res.status(500).json({ error: "..." })` legacy
dan akan dimigrasikan secara bertahap. Sebelum migrasi, response mereka **belum**
menjamin field-field di atas.

## Menambah route baru

```ts
import { sendAdminError } from "../../lib/adminApiError";

router.get("/things", async (req, res) => {
  try {
    const data = await db.select().from(things);
    res.json(data);
  } catch (err) {
    return sendAdminError(res, "GET /api/admin/things", err);
  }
});
```

`sendAdminError` sudah:
1. Klasifikasi error → `{ error, status, hint }`.
2. Meng-log `[admin-api] <endpoint> → <status> <error>` ke stderr Vercel.
3. Mengirim JSON dengan shape di atas.

Cukup panggil sekali di setiap `catch` — jangan format response error manual.
