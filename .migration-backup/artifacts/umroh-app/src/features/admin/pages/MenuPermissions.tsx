import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { useAllMenuPermissions } from "@/features/admin/hooks/useMenuPermissions";
import { menuGroups } from "@/features/admin/components/adminMenuConfig";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Crown, ShieldCheck, Building2, UserCheck, Briefcase,
  Loader2, Save, RotateCcw, Layers, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

// ── Role definitions ───────────────────────────────────────────────────────

const ADMIN_ROLES = [
  { value: "super_admin",    label: "Super Admin",    icon: Crown,       color: "text-amber-600",  badge: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "admin",          label: "Admin",          icon: ShieldCheck, color: "text-blue-600",   badge: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "branch_manager", label: "Branch Manager", icon: Building2,   color: "text-purple-600", badge: "bg-purple-100 text-purple-800 border-purple-300" },
  { value: "staff",          label: "Staff",          icon: UserCheck,   color: "text-green-600",  badge: "bg-green-100 text-green-800 border-green-300" },
  { value: "agent",          label: "Agen",           icon: Briefcase,   color: "text-orange-600", badge: "bg-orange-100 text-orange-800 border-orange-300" },
] as const;

type AdminRole = typeof ADMIN_ROLES[number]["value"];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Compute the static default for a menuKey × role from adminMenuConfig */
function staticDefault(roles: string[] | undefined, role: AdminRole): boolean {
  if (!roles) return true; // no restriction → all roles can see it
  return roles.includes(role);
}

/** Build the full default matrix from adminMenuConfig */
function buildDefaultMatrix(): Record<string, Record<AdminRole, boolean>> {
  const matrix: Record<string, Record<AdminRole, boolean>> = {};
  for (const group of menuGroups) {
    for (const item of group.items) {
      matrix[item.labelKey] = {} as Record<AdminRole, boolean>;
      for (const r of ADMIN_ROLES) {
        matrix[item.labelKey][r.value] = staticDefault(item.roles, r.value);
      }
    }
  }
  return matrix;
}

// ── Component ──────────────────────────────────────────────────────────────

const MenuPermissions = () => {
  const { role: currentRole } = useAuth();
  const isSuper = currentRole === "super_admin";
  const queryClient = useQueryClient();

  const { data: dbData, isLoading } = useAllMenuPermissions();

  // Local state: matrix[menuKey][role] = enabled
  const [matrix, setMatrix] = useState<Record<string, Record<AdminRole, boolean>>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Build matrix from DB + static defaults
  const defaultMatrix = useMemo(() => buildDefaultMatrix(), []);

  useEffect(() => {
    const m = buildDefaultMatrix();
    // Override with DB values
    for (const row of dbData?.data ?? []) {
      if (m[row.menuKey] && ADMIN_ROLES.some((r) => r.value === row.role)) {
        (m[row.menuKey] as Record<string, boolean>)[row.role] = row.enabled;
      }
    }
    setMatrix(m);
    setDirty(false);
  }, [dbData]);

  const toggle = (menuKey: string, role: AdminRole) => {
    if (!isSuper) return;
    if (role === "super_admin") return; // super_admin always has full access
    setMatrix((prev) => ({
      ...prev,
      [menuKey]: { ...prev[menuKey], [role]: !prev[menuKey]?.[role] },
    }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const permissions: Array<{ role: string; menuKey: string; enabled: boolean }> = [];
      for (const [menuKey, roleMap] of Object.entries(matrix)) {
        for (const [role, enabled] of Object.entries(roleMap)) {
          permissions.push({ role, menuKey, enabled });
        }
      }
      await apiFetch("/api/admin/menu-permissions", {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      });
      await queryClient.invalidateQueries({ queryKey: ["menu-permissions"] });
      setDirty(false);
      toast.success("Izin menu berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan izin menu");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    setResetting(true);
    try {
      await apiFetch("/api/admin/menu-permissions/reset", { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["menu-permissions"] });
      setMatrix(buildDefaultMatrix());
      setDirty(false);
      toast.success("Izin menu dikembalikan ke default");
    } catch {
      toast.error("Gagal mereset izin menu");
    } finally {
      setResetting(false);
    }
  };

  // Count visible items per role
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of ADMIN_ROLES) {
      c[r.value] = Object.values(matrix).filter((m) => m[r.value]).length;
    }
    return c;
  }, [matrix]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Izin Menu per Role</h1>
            <p className="text-muted-foreground text-sm">
              Kustomisasi menu mana yang terlihat di sidebar untuk setiap role
            </p>
          </div>
        </div>
        {isSuper && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              disabled={resetting || saving}
            >
              {resetting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Reset Default
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Simpan Perubahan
            </Button>
          </div>
        )}
      </div>

      {/* Info banner */}
      {!isSuper && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-2 text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Hanya <strong className="mx-1">Super Admin</strong> yang dapat mengubah izin menu.
          </CardContent>
        </Card>
      )}

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ADMIN_ROLES.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.value} className="text-center p-3">
              <div className={cn("flex items-center justify-center mb-1", r.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold">{r.label}</p>
              <p className="text-lg font-bold text-primary">{counts[r.value] ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">menu aktif</p>
            </Card>
          );
        })}
      </div>

      {/* Permission matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Matriks Izin Menu</CardTitle>
          <CardDescription>
            Centang = role dapat melihat menu tersebut di sidebar. Super Admin selalu memiliki akses penuh.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[200px]">
                    Menu
                  </th>
                  {ADMIN_ROLES.map((r) => {
                    const Icon = r.icon;
                    return (
                      <th key={r.value} className="px-3 py-3 text-center min-w-[100px]">
                        <span className={cn("inline-flex flex-col items-center gap-1", r.color)}>
                          <Icon className="w-4 h-4" />
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                            r.badge
                          )}>
                            {r.label}
                          </span>
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {menuGroups.map((group) => (
                  <>
                    {/* Group header row */}
                    <tr key={`group-${group.label}`} className="bg-muted/20 border-b border-t">
                      <td
                        colSpan={ADMIN_ROLES.length + 1}
                        className="px-4 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground"
                      >
                        {group.label}
                      </td>
                    </tr>
                    {/* Menu item rows */}
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const perms = matrix[item.labelKey] ?? {};
                      return (
                        <tr
                          key={item.labelKey}
                          className="border-b hover:bg-muted/10 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-2 text-sm">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              {item.label}
                            </span>
                          </td>
                          {ADMIN_ROLES.map((r) => {
                            const isLocked = r.value === "super_admin";
                            const checked = isLocked ? true : (perms[r.value] ?? false);
                            return (
                              <td key={r.value} className="px-3 py-2.5 text-center">
                                <Checkbox
                                  checked={checked}
                                  disabled={isLocked || !isSuper}
                                  onCheckedChange={() => toggle(item.labelKey, r.value as AdminRole)}
                                  className={cn(
                                    isLocked && "opacity-50 cursor-not-allowed",
                                    !isLocked && isSuper && "cursor-pointer"
                                  )}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sticky save bar when dirty */}
      {dirty && isSuper && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-background border rounded-xl shadow-lg px-4 py-3">
          <span className="text-sm text-muted-foreground">Ada perubahan yang belum disimpan</span>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan
          </Button>
        </div>
      )}
    </div>
  );
};

export default MenuPermissions;
