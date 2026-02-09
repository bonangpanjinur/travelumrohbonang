import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Building2, Percent, Phone, Search } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  phone: string | null;
  branch_id: string | null;
  commission_percent: number | null;
  is_active: boolean;
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

  const [form, setForm] = useState({
    name: "",
    phone: "",
    branch_id: "",
    commission_percent: 0,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [agentsRes, branchesRes] = await Promise.all([
      supabase
        .from("agents")
        .select("*, branch:branches(name)")
        .order("name"),
      supabase
        .from("branches")
        .select("id, name")
        .eq("is_active", true)
        .order("name")
    ]);
    
    setAgents(agentsRes.data || []);
    setBranches(branchesRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name: form.name,
      phone: form.phone || null,
      branch_id: form.branch_id || null,
      commission_percent: form.commission_percent || 0,
      is_active: form.is_active
    };

    if (editing) {
      const { error } = await supabase.from("agents").update(payload).eq("id", editing.id);
      if (error) {
        toast({ title: "Gagal mengupdate agen", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Agen berhasil diupdate!" });
    } else {
      const { error } = await supabase.from("agents").insert(payload);
      if (error) {
        toast({ title: "Gagal menambahkan agen", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Agen berhasil ditambahkan!" });
    }
    
    fetchData();
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (agent: Agent) => {
    setEditing(agent);
    setForm({
      name: agent.name,
      phone: agent.phone || "",
      branch_id: agent.branch_id || "",
      commission_percent: agent.commission_percent || 0,
      is_active: agent.is_active
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus agen ini?")) return;
    
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus agen", description: error.message, variant: "destructive" });
      return;
    }
    
    toast({ title: "Agen berhasil dihapus" });
    fetchData();
  };

  const handleToggleActive = async (agent: Agent) => {
    const { error } = await supabase
      .from("agents")
      .update({ is_active: !agent.is_active })
      .eq("id", agent.id);
    
    if (error) {
      toast({ title: "Gagal mengubah status", variant: "destructive" });
      return;
    }
    
    fetchData();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      phone: "",
      branch_id: "",
      commission_percent: 0,
      is_active: true
    });
  };

  const filteredAgents = agents.filter((agent) => {
    const matchSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.phone?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchBranch = filterBranch === "all" || agent.branch_id === filterBranch;
    return matchSearch && matchBranch;
  });

  const activeCount = agents.filter(a => a.is_active).length;
  const totalCommission = agents.reduce((sum, a) => sum + (a.commission_percent || 0), 0);
  const avgCommission = agents.length > 0 ? (totalCommission / agents.length).toFixed(1) : 0;

  return (
    <div>
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
                <Label>Cabang</Label>
                <Select 
                  value={form.branch_id} 
                  onValueChange={(value) => setForm({ ...form, branch_id: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih cabang (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tanpa Cabang</SelectItem>
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
                  value={form.commission_percent} 
                  onChange={(e) => setForm({ ...form, commission_percent: parseFloat(e.target.value) || 0 })} 
                  placeholder="Persentase komisi"
                  className="mt-1" 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Status Aktif</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
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
        <div className="bg-card border border-border rounded-xl overflow-hidden">
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
              {filteredAgents.map((agent) => (
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
                      {agent.commission_percent || 0}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={agent.is_active}
                      onCheckedChange={() => handleToggleActive(agent)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(agent)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(agent.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminAgents;
