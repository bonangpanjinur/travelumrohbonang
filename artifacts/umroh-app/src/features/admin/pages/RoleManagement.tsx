import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/shared/lib/audit";

const ROLES = ["super_admin", "admin", "staff", "agent", "branch_manager", "buyer"];

const RoleManagement = () => {
  const { role: currentRole } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const isSuper = currentRole === "super_admin";

  const load = async () => {
    setLoading(true);
    try {
      const [profiles, roles] = await Promise.all([
        apiFetch<any[]>("/api/admin/users"), // Assuming this endpoint exists based on usual patterns
        apiFetch<any[]>("/api/admin/agents/roles"),
      ]);
      const map = new Map<string, string>();
      (roles || []).forEach((r: any) => map.set(r.userId, r.role));
      const merged = (profiles || []).map((p: any) => ({ ...p, role: map.get(p.id) || "buyer" }));
      setUsers(merged);
    } catch (e: any) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, newRole: string) => {
    if (!isSuper) { toast.error("Hanya super admin"); return; }
    try {
      // Find and delete if exists, then insert
      const existingRole = users.find(u => u.id === userId)?.role;
      if (existingRole && existingRole !== "buyer") {
        const roles = await apiFetch<any[]>("/api/admin/agents/roles");
        const roleObj = roles.find((r: any) => r.userId === userId);
        if (roleObj) {
          await apiFetch(`/api/admin/agents/roles/${roleObj.id}`, { method: "DELETE" });
        }
      }
      
      await apiFetch("/api/admin/agents/roles", {
        method: "POST",
        body: JSON.stringify({ userId, role: newRole }),
      });

      await logAudit({ action: "role_changed", entityType: "user", entityId: userId, metadata: { new_role: newRole } });
      toast.success("Role diperbarui");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = users.filter((u) => !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Manajemen Role</h1></div>
      {!isSuper && <Card><CardContent className="p-4 text-sm text-warning">Hanya super admin yang dapat mengubah role.</CardContent></Card>}

      <Card>
        <CardHeader><CardTitle className="text-base">Pengguna</CardTitle></CardHeader>
        <CardContent>
          <Input placeholder="Cari nama / email..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm mb-4" />
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Ubah</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm">{u.name || "-"}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                    <TableCell>
                      {isSuper ? (
                        <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                          <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleManagement;
