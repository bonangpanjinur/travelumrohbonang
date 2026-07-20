import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
  Loader2, ShieldCheck, Users, Crown, Briefcase, Building2, UserCheck, User,
  Package, CreditCard, Settings, FileText, MessageCircle, BarChart3, Lock,
  CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/shared/lib/audit";
import { cn } from "@/shared/lib/utils";

// ── Role definitions ────────────────────────────────────────────────────────

export const ROLES = [
  "super_admin",
  "admin",
  "branch_manager",
  "staff",
  "agent",
  "buyer",
] as const;

type Role = typeof ROLES[number];

interface RoleConfig {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badge: string;
  permissions: {
    operational: boolean | "partial";
    finance: boolean | "partial";
    marketing: boolean | "partial";
    content: boolean | "partial";
    settings: boolean | "partial";
    roles: boolean | "partial";
    integrations: boolean | "partial";
  };
}

const ROLE_CONFIG: Record<Role, RoleConfig> = {
  super_admin: {
    label: "Super Admin",
    description: "Akses penuh ke seluruh sistem, termasuk integrasi dan manajemen role",
    icon: Crown,
    color: "text-amber-600",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    permissions: {
      operational: true, finance: true, marketing: true,
      content: true, settings: true, roles: true, integrations: true,
    },
  },
  admin: {
    label: "Admin",
    description: "Akses hampir lengkap kecuali manajemen role dan integrasi sensitif",
    icon: ShieldCheck,
    color: "text-blue-600",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
    permissions: {
      operational: true, finance: true, marketing: true,
      content: true, settings: true, roles: false, integrations: false,
    },
  },
  branch_manager: {
    label: "Branch Manager",
    description: "Kelola operasional dan keuangan cabang, akses terbatas ke pengaturan",
    icon: Building2,
    color: "text-purple-600",
    badge: "bg-purple-100 text-purple-800 border-purple-300",
    permissions: {
      operational: true, finance: "partial", marketing: "partial",
      content: false, settings: false, roles: false, integrations: false,
    },
  },
  staff: {
    label: "Staff",
    description: "Operasional harian: booking, jemaah, manifest, dan komunikasi",
    icon: UserCheck,
    color: "text-green-600",
    badge: "bg-green-100 text-green-800 border-green-300",
    permissions: {
      operational: true, finance: false, marketing: false,
      content: false, settings: false, roles: false, integrations: false,
    },
  },
  agent: {
    label: "Agen",
    description: "Akses ke paket umroh, booking klien, dan laporan komisi pribadi",
    icon: Briefcase,
    color: "text-orange-600",
    badge: "bg-orange-100 text-orange-800 border-orange-300",
    permissions: {
      operational: "partial", finance: false, marketing: "partial",
      content: false, settings: false, roles: false, integrations: false,
    },
  },
  buyer: {
    label: "Buyer / Jemaah",
    description: "Pengguna biasa — hanya akses portal jemaah, tidak bisa masuk admin",
    icon: User,
    color: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
    permissions: {
      operational: false, finance: false, marketing: false,
      content: false, settings: false, roles: false, integrations: false,
    },
  },
};

const PERMISSION_COLS: { key: keyof RoleConfig["permissions"]; label: string; icon: React.ElementType }[] = [
  { key: "operational", label: "Operasional", icon: Package },
  { key: "finance", label: "Keuangan", icon: CreditCard },
  { key: "marketing", label: "Pemasaran", icon: BarChart3 },
  { key: "content", label: "Konten & CMS", icon: FileText },
  { key: "settings", label: "Pengaturan", icon: Settings },
  { key: "roles", label: "Manage Role", icon: ShieldCheck },
  { key: "integrations", label: "Integrasi", icon: Lock },
];

function PermIcon({ value }: { value: boolean | "partial" }) {
  if (value === true) return <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />;
  if (value === "partial") return <AlertCircle className="w-4 h-4 text-amber-500 mx-auto" />;
  return <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as Role];
  if (!cfg) return <Badge variant="outline">{role}</Badge>;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", cfg.badge)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

const RoleManagement = () => {
  const { role: currentRole } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "matrix">("users");
  const [saving, setSaving] = useState<string | null>(null);

  const isSuper = currentRole === "super_admin";

  const load = async () => {
    setLoading(true);
    try {
      const [profileRes, roles] = await Promise.all([
        apiFetch<{ data: any[] }>("/api/admin/users"),
        apiFetch<any[]>("/api/admin/agents/roles"),
      ]);
      const profiles = profileRes?.data ?? (Array.isArray(profileRes) ? profileRes : []);
      const map = new Map<string, string>();
      (roles || []).forEach((r: any) => map.set(r.userId, r.role));
      const merged = profiles.map((p: any) => ({
        ...p,
        displayRole: map.get(p.id) || "buyer",
        roleId: roles?.find((r: any) => r.userId === p.id)?.id,
      }));
      setUsers(merged);
    } catch {
      toast.error("Gagal memuat data pengguna");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, newRole: string) => {
    if (!isSuper) { toast.error("Hanya super admin yang dapat mengubah role"); return; }
    setSaving(userId);
    try {
      const user = users.find((u) => u.id === userId);
      // Create the new role first, then remove the old one — avoids a window
      // where the user has no role at all if the second request fails.
      if (newRole !== "buyer") {
        await apiFetch("/api/admin/agents/roles", {
          method: "POST",
          body: JSON.stringify({ userId, role: newRole }),
        });
      }
      if (user?.roleId) {
        await apiFetch(`/api/admin/agents/roles/${user.roleId}`, { method: "DELETE" });
      }
      await logAudit({
        action: "role_changed",
        entityType: "user",
        entityId: userId,
        metadata: { old_role: user?.displayRole, new_role: newRole },
      });
      toast.success("Role berhasil diperbarui");
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal mengubah role");
    } finally {
      setSaving(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Manajemen Role & Hak Akses</h1>
          <p className="text-muted-foreground text-sm">
            Kelola role dan izin akses setiap pengguna ke panel admin
          </p>
        </div>
      </div>

      {!isSuper && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-2 text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Hanya <strong>Super Admin</strong> yang dapat mengubah role pengguna.
          </CardContent>
        </Card>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("users")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Pengguna ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "matrix"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <ShieldCheck className="w-4 h-4 inline mr-2" />
          Matriks Izin
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daftar Pengguna</CardTitle>
            <CardDescription>
              Klik dropdown pada kolom "Ubah Role" untuk mengubah hak akses pengguna
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm mb-4"
            />

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pengguna</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role Saat Ini</TableHead>
                      {isSuper && <TableHead className="w-48">Ubah Role</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Tidak ada pengguna ditemukan
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((u) => {
                      const cfg = ROLE_CONFIG[u.displayRole as Role];
                      const Icon = cfg?.icon ?? User;
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                {(u.name || u.firstName || u.email || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-sm">
                                {u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                          <TableCell>
                            <RoleBadge role={u.displayRole} />
                          </TableCell>
                          {isSuper && (
                            <TableCell>
                              {saving === u.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Select
                                  value={u.displayRole}
                                  onValueChange={(v) => changeRole(u.id, v)}
                                >
                                  <SelectTrigger className="w-44 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ROLES.map((r) => {
                                      const c = ROLE_CONFIG[r];
                                      const RI = c.icon;
                                      return (
                                        <SelectItem key={r} value={r} className="text-xs">
                                          <span className="flex items-center gap-1.5">
                                            <RI className={cn("w-3 h-3", c.color)} />
                                            {c.label}
                                          </span>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permission Matrix Tab */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          {/* Role Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map((r) => {
              const cfg = ROLE_CONFIG[r];
              const Icon = cfg.icon;
              return (
                <Card key={r} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Icon className={cn("w-4 h-4", cfg.color)} />
                      <RoleBadge role={r} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">{cfg.description}</p>
                    <div className="space-y-1">
                      {PERMISSION_COLS.map(({ key, label, icon: PIcon }) => {
                        const val = cfg.permissions[key];
                        return (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <PIcon className="w-3 h-3" />
                              {label}
                            </span>
                            <span>
                              {val === true && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                              {val === "partial" && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                              {val === false && <XCircle className="w-3.5 h-3.5 text-muted-foreground/40" />}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Full Matrix Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tabel Perbandingan Izin</CardTitle>
              <CardDescription>
                <CheckCircle2 className="w-3 h-3 inline text-green-500 mr-1" />Akses penuh
                {" · "}
                <AlertCircle className="w-3 h-3 inline text-amber-500 mr-1" />Akses terbatas
                {" · "}
                <XCircle className="w-3 h-3 inline text-muted-foreground/40 mr-1" />Tidak dapat akses
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Fitur</TableHead>
                    {ROLES.map((r) => {
                      const cfg = ROLE_CONFIG[r];
                      const Icon = cfg.icon;
                      return (
                        <TableHead key={r} className="text-center min-w-24">
                          <div className="flex flex-col items-center gap-1">
                            <Icon className={cn("w-4 h-4", cfg.color)} />
                            <span className="text-xs">{cfg.label}</span>
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_COLS.map(({ key, label, icon: Icon }) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium text-sm">
                        <span className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          {label}
                        </span>
                      </TableCell>
                      {ROLES.map((r) => (
                        <TableCell key={r} className="text-center">
                          <PermIcon value={ROLE_CONFIG[r].permissions[key]} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
