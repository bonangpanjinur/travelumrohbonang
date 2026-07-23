# Umroh App (Vins Tour Travel)

A full-stack Umrah management platform — public-facing booking site plus an admin back-office — built for an Indonesian travel agency.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind CSS, Radix UI, TanStack Query, Wouter |
| Backend | Express 5, Node.js, esbuild |
| Database | Supabase (PostgreSQL) + Drizzle ORM |
| Language | TypeScript throughout |
| Monorepo | pnpm workspaces |

## Workspace layout

```
artifacts/
  api-server/     Express backend (port 8080 in dev)
  umroh-app/      React + Vite frontend (port assigned by Replit)
  mockup-sandbox/ Design canvas previews
lib/
  db/             Drizzle schema + migrations
  api-spec/       OpenAPI spec + codegen
  api-client-react/  Generated React Query hooks
  api-zod/        Generated Zod validation schemas
  email/          Transactional email (Resend)
  whatsapp/       WhatsApp integration
supabase/         Supabase config and SQL migrations
```

## Running in development

Both workflows are configured and start automatically:

- **`artifacts/api-server: API Server`** — builds with esbuild then starts Express
- **`artifacts/umroh-app: web`** — starts Vite dev server

Install dependencies (one-time after cloning):

```bash
pnpm install
```

## Required environment secrets

The app needs a Supabase project. Add these in the Replit Secrets panel:

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only) |
| `SUPABASE_DATABASE_URL` | Direct Postgres connection string (used by Drizzle on Replit dev, so it doesn't clash with Replit's own `DATABASE_URL`) |
| `SESSION_SECRET` | ✅ Already set — used to sign session cookies |

Optional extras (features degrade gracefully without them):

| Secret | Feature |
|--------|---------|
| `VITE_SUPABASE_URL` | Frontend Supabase client (can reuse `SUPABASE_URL` value) |
| `VITE_SUPABASE_ANON_KEY` | Frontend Supabase client (can reuse `SUPABASE_ANON_KEY` value) |
| `RESEND_API_KEY` | Transactional email |
| `MIDTRANS_SERVER_KEY` | Midtrans payment gateway |
| `XENDIT_API_KEY` | Xendit payment gateway |
| `XENDIT_WEBHOOK_TOKEN` | Xendit webhook verification |
| `ADMIN_EMAILS` | Comma-separated super-admin emails |

## Database setup (first run)

After secrets are configured, push the schema to your Supabase database:

```bash
cd lib/db && pnpm drizzle-kit push
```

## Codegen (after OpenAPI spec changes)

```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`.

## User preferences

- Keep the existing monorepo structure — do not restructure or migrate the stack.
- `SUPABASE_DATABASE_URL` is the Drizzle connection string on Replit dev (avoids collision with Replit's own `DATABASE_URL`).
