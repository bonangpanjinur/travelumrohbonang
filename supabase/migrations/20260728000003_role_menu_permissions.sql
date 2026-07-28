-- Migration: role_menu_permissions
-- Table untuk menyimpan izin menu per role (Izin Menu per Role).
-- Jika tidak ada baris untuk kombinasi role+menu_key,
-- sidebar fallback ke array `item.roles` di adminMenuConfig.ts.

CREATE TABLE IF NOT EXISTS role_menu_permissions (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role        TEXT        NOT NULL,
  menu_key    TEXT        NOT NULL,
  enabled     BOOLEAN     NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_role_menu_permissions
  ON role_menu_permissions (role, menu_key);

CREATE INDEX IF NOT EXISTS idx_rmp_role
  ON role_menu_permissions (role);
