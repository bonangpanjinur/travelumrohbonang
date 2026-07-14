-- =============================================================================
-- Migration: Add role_menu_permissions table
-- Status: cek dulu apakah sudah diterapkan sebelum jalankan ulang. Riwayat
-- patch — lihat sql/README.md.
-- =============================================================================
-- Purpose: Stores per-role menu visibility overrides set by super_admin.
-- menu_key maps to MenuItem.labelKey values in adminMenuConfig.ts.
-- If no row exists for a role+menu_key combo, the sidebar falls back to the
-- static `item.roles` array in adminMenuConfig.ts.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.role_menu_permissions (
  id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role        text        NOT NULL,
  menu_key    text        NOT NULL,
  enabled     boolean     NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_role_menu_permissions UNIQUE (role, menu_key)
);

CREATE INDEX IF NOT EXISTS idx_rmp_role ON public.role_menu_permissions (role);

COMMENT ON TABLE public.role_menu_permissions IS
  'Per-role menu visibility overrides. Managed by super_admin via /admin/menu-permissions.';
