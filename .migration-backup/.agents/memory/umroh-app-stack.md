---
name: Umroh App Stack
description: Key decisions and quirks for the Umroh travel app migrated from Vercel into the Replit pnpm_workspace stack.
---

## Tailwind v4 CSS Variable Fix
The app uses shadcn/ui `:root` HSL variables (`--border`, `--background`, etc.) but Tailwind v4 requires these to be registered via `@theme inline {}` to work with `@apply`.

**Fix applied to `artifacts/umroh-app/src/index.css`:**
- Replace `@tailwind base/components/utilities` with `@import "tailwindcss";`
- Add `@theme inline { --color-border: hsl(var(--border)); ... }` block for all CSS variables.

**Why:** Tailwind v4 doesn't auto-map `:root` variables to utility classes; they must be declared in `@theme`.

## Runtime Dependencies Not in pnpm-workspace.yaml
These packages were missing and must be added to `artifacts/umroh-app/package.json`:
- `@supabase/supabase-js`, `react-router-dom`, `react-signature-canvas`, `@sentry/react`, `react-helmet-async`
- `html5-qrcode`, `qrcode.react`, `otpauth`, `qrcode`, `jspdf`
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-text-align`, `@tiptap/extension-underline`, `@tiptap/extension-placeholder`
- Dev: `@types/qrcode`

## booking_rooms DB Table Column Names
The `booking_rooms` Supabase table uses: `booking_id`, `room_type`, `price`, `quantity`, `subtotal`.
NOT `price_per_person` / `num_persons` (those don't exist).

## Environment Variables Required
- `VITE_SUPABASE_URL` — Supabase project URL (set as Replit secret)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (set as Replit secret)

## .migration-backup Workflows
The `.migration-backup/artifacts/*` directories are registered as artifacts but are NOT in pnpm-workspace.yaml (only `artifacts/*` is). Their workflows always fail with "node_modules missing" — this is expected and cannot be fixed without a naming conflict. Use individual workflow restart (not Project run button) to avoid failure propagation.

## PRD
Full PRD at `docs/PRD-operasional-modul.md` — covers UX analysis, SQL mapping, and 3-phase plan.
