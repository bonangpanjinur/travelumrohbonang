import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const { data: profiles } = await supabase.from("profiles").select("id, name, email").order("created_at", { ascending: false }).limit(200);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const map = new Map<string, string>();
    (roles || []).forEach((r: any) => map.set(r.user_id, r.role));
    const merged = (profiles || []).map((p: any) => ({ ...p, role: map.get(p.id) || "buyer" }));
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, newRole: string) => {
    if (!isSuper) { toast.error("Hanya super admin"); return; }
    try {
      // Delete existing roles, insert new
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
      if (error) throw error;
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
