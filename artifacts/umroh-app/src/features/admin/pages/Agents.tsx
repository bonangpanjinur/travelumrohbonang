import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Building2, Percent, Phone, Search, Download } from "lucide-react";
import { exportToCsv } from "@/shared/lib/exportCsv";
import { normalizePhone } from "@/shared/lib/phone";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import { useDeleteConfirm } from "@/features/admin/hooks/useDeleteConfirm";

interface Agent {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  referralCode: string | null;
  userId: string | null;
  branchId: string | null;
  commissionPercent: number | null;
  isActive: boolean;
  branch?: { name: string } | null;
}

interface Branch {
  id: string;
  name: string;
}

const AdminAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const { toast } = useToast();
  const { isDeleteOpen, requestDelete, cancelDelete, confirmDelete } = useDeleteConfirm();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    referralCode: "",
    branchId: "",
    commissionPercent: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, branchesRes] = await Promise.all([
        apiFetch<Agent[]>("/api/admin/agents"),
        apiFetch<Branch[]>("/api/admin/branches"),
      ]);
      
      setAgents((agentsRes || []).map((a: any) => ({
        ...a,
        commissionPercent: a.commissionPercent != null ? Number(a.commissionPercent) : null,
      })));
      setBranches(branchesRes || []);
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal memuat data agen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: any = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      referralCode: form.referralCode || null,
      branchId: form.branchId || null,
      commissionPercent: form.commissionPercent || 0,
      isActive: form.isActive,
    };

    // Try to find a user account by email and link it
    if (form.email) {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.email)
        .maybeSingle();
      if (userProfile?.id) payload.userId = userProfile.id;
    }

    try {
      if (editing) {
        await apiFetch(`/api/admin/agents/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Agen berhasil diupdate!" });
      } else {
        await apiFetch("/api/admin/agents", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Agen berhasil ditambahkan!" });
      }
      
      fetchData();
      setIsOpen(false);
      resetForm();
    } catch (e: any) {
      toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditing(agent);
    setForm({
      name: agent.name,
      phone: agent.phone || "",
      email: agent.email || "",
      referralCode: agent.referralCode || "",
      branchId: agent.branchId || "",
      commissionPercent: agent.commissionPercent || 0,
      isActive: agent.isActive,
    });
    setIsOpen(true);
  };

  const executeDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/agents/${id}`, { method: "DELETE" }); // Assuming delete endpoint exists
      toast({ title: "Agen berhasil dihapus" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Gagal menghapus agen", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (agent: Agent) => {
    try {
      await apiFetch(`/api/admin/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !agent.isActive }),
      });
      fetchData();
    } catch (e) {
      toast({ title: "Gagal mengubah status", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      phone: "",
      email: "",
      referralCode: "",
      branchId: "",
      commissionPercent: 0,
      isActive: true,
    });
  };

  const filteredAgents = agents.filter((agent) => {
    const term = searchTerm.trim().toLowerCase();
    const normalizedTerm = normalizePhone(searchTerm).toLowerCase();
    const agentPhoneNorm = normalizePhone(agent.phone || "").toLowerCase();
    const matchSearch = !term ||
      agent.name.toLowerCase().includes(term) ||
      (agent.phone?.toLowerCase().includes(term)) ||
      (normalizedTerm && agentPhoneNorm.includes(normalizedTerm));
    const matchBranch = filterBranch === "all" || agent.branchId === filterBranch;
    return matchSearch && matchBranch;
  });

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } = useAdminPagination(filteredAgents);

  useEffect(() => { resetPage(); }, [searchTerm, filterBranch]);

  const activeCount = agents.filter(a => a.isActive).length;
  const totalCommission = agents.reduce((sum, a) => sum + (a.commissionPercent || 0), 0);
  const avgCommission = agents.length > 0 ? (totalCommission / agents.length).toFixed(1) : 0;

  return (
    <div>
      <DeleteAlertDialog open={isDeleteOpen} onOpenChange={cancelDelete} onConfirm={() => confirmDelete(executeDelete)} title="Hapus Agen?" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Agen</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola data agen dan komisi</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah Agen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Agen" : "Tambah Agen Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama Agen *</Label>
                <Input 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  required 
                  placeholder="Masukkan nama agen"
                  className="mt-1" 
                />
              </div>
              
              <div>
                <Label>Nomor Telepon</Label>
                <Input 
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                  placeholder="08xxxxxxxxxx"
                  className="mt-1" 
                />
              </div>

              <div>
                <Label>Email (untuk login portal agen)</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="agen@email.com"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Jika email cocok dengan akun terdaftar, agen akan otomatis bisa akses Portal Agen.
                </p>
              </div>

              <div>
                <Label>Kode Referral</Label>
                <Input
                  value={form.referralCode}
                  onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase().replace(/\s/g, "") })}
                  placeholder="AGEN001"
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label>Cabang</Label>
                <Select 
                  value={form.branchId || "none"} 
                  onValueChange={(value) => setForm({ ...form, branchId: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih cabang (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Cabang</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Komisi (%)</Label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.commissionPercent} 
                  onChange={(e) => setForm({ ...form, commissionPercent: parseFloat(e.target.value) || 0 })} 
                  placeholder="Persentase komisi"
                  className="mt-1" 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Status Aktif</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" className="gradient-gold text-primary">
                  {editing ? "Update" : "Simpan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Agen</p>
            <p className="text-2xl font-bold">{agents.length}</p>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <Building2 className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Agen Aktif</p>
            <p className="text-2xl font-bold">{activeCount}</p>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
            <Percent className="w-6 h-6 text-gold" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rata-rata Komisi</p>
            <p className="text-2xl font-bold">{avgCommission}%</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Button variant="outline" className="shrink-0" onClick={() => {
          const headers = ["Nama", "Telepon", "Cabang", "Komisi (%)", "Status"];
          const rows = filteredAgents.map(a => [
            a.name, a.phone || "-", a.branch?.name || "-",
            String(a.commissionPercent || 0), a.isActive ? "Aktif" : "Nonaktif"
          ]);
          exportToCsv("agents", headers, rows);
        }}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => {
            const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
            window.open(`${API_BASE}/api/admin/reports/commissions.xlsx`, "_blank");
          }}
        >
          <Download className="w-4 h-4 mr-2" /> Export Komisi (Excel)
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Cari nama atau telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter cabang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Cabang</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {searchTerm || filterBranch !== "all" 
            ? "Tidak ada agen yang sesuai filter" 
            : "Belum ada agen terdaftar"}
        </div>
      ) : (
        <>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Agen</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead className="text-center">Komisi</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-semibold">{agent.name}</TableCell>
                    <TableCell>
                      {agent.phone ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {agent.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {agent.branch?.name ? (
                        <Badge variant="outline" className="font-normal">
                          <Building2 className="w-3 h-3 mr-1" />
                          {agent.branch.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-semibold">
                        {agent.commissionPercent || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={agent.isActive}
                        onCheckedChange={() => handleToggleActive(agent)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(agent)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => requestDelete(agent.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AdminAgents;
