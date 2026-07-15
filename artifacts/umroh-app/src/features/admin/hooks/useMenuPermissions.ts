import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";

interface PermissionRow {
  role: string;
  menuKey: string;
  enabled: boolean;
}

/**
 * Fetches role_menu_permissions from the API and returns a map
 * { [menuKey]: boolean } for the *current user's role*.
 *
 * Returns null when:
 *  - The user is not an admin role
 *  - The API hasn't resolved yet
 *  - No DB rows exist for this role (sidebar falls back to static item.roles)
 */
export function useMenuPermissions(): Record<string, boolean> | null {
  const { role } = useAuth();
  const isAdminRole =
    !!role && role !== "buyer" && role !== "user";

  const { data } = useQuery({
    queryKey: ["menu-permissions", "my", role],
    queryFn: () =>
      apiFetch<{ data: PermissionRow[] }>("/api/admin/menu-permissions/my"),
    enabled: isAdminRole,
    staleTime: 5 * 60 * 1000, // 5-min client cache
    gcTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    if (!data?.data || !role) return null;
    const map: Record<string, boolean> = {};
    for (const row of data.data) {
      if (row.role === role) {
        map[row.menuKey] = row.enabled;
      }
    }
    return Object.keys(map).length > 0 ? map : null;
  }, [data, role]);
}

/**
 * Fetches all permissions for ALL roles — used by the MenuPermissions admin page.
 */
export function useAllMenuPermissions() {
  return useQuery({
    queryKey: ["menu-permissions"],
    queryFn: () =>
      apiFetch<{ data: PermissionRow[] }>("/api/admin/menu-permissions"),
    staleTime: 5 * 60 * 1000,
  });
}
