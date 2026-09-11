import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { QRCodeSVG } from "qrcode.react";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Building2, Percent, Phone, Search, Download, QrCode, ExternalLink, CalendarDays, Copy } from "lucide-react";
import { exportToCsv } from "@/shared/lib/exportCsv";
import { normalizePhone } from "@/shared/lib/phone";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import { useDeleteConfirm } from "@/features/admin/hooks/useDeleteConfirm";

interface Branch {
  id: string;
  code: string | null;
  name: string;
}

interface Agent {
  id: string;
  name: string;
  agentCode: string | null;
  gender: string | null;
  address: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  referralCode: string | null;
  publicSlug: string | null;
  publicDescription: string | null;
  publicPageEnabled: boolean;
  userId: string | null;
  branchId: string | null;
  commissionPercent: number | null;
  monthlyTarget: number | null;
  isActive: boolean;
  branch?: Branch | null;
}

type AgentForm = {
  name: string;
  agentCode: string;
  gender: string;
  address: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  referralCode: string;
  publicSlug: string;
  publicDescription: string;
  publicPageEnabled: boolean;
  branchId: string;
  commissionPercent: number;
  monthlyTarget: number | "";
  isActive: boolean;
};

const emptyForm: AgentForm = {
  name: "",
  agentCode: "",
  gender: "",
  address: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  referralCode: "",
  publicSlug: "",
  publicDescription: "",
  publicPageEnabled: true,
  branchId: "",
  commissionPercent: 0,
  monthlyTarget: "",
  isActive: true,
};

const AdminAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [qrAgent, setQrAgent] = useState<Agent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const { toast } = useToast();
  const { isDeleteOpen, requestDelete, cancelDelete, confirmDelete } = useDeleteConfirm();
  const [form, setForm] = useState<AgentForm>({ ...emptyForm });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, branchesRes] = await Promise.all([
        apiFetch<any[]>("/api/admin/agents"),
        apiFetch<any[]>("/api/admin/branches"),
      ]);
      const branchRows: Branch[] = (branchesRes || []).map((branch) => ({
        id: branch.id,
        code: branch.code || null,
        name: branch.name,
      }));
      setBranches(branchRows);
      setAgents((agentsRes || []).map((agent) => ({
        ...agent,
        commissionPercent: agent.commissionPercent != null ? Number(agent.commissionPercent) : null,
        monthlyTarget: agent.monthlyTarget != null ? Number(agent.monthlyTarget) : null,
        publicPageEnabled: agent.publicPageEnabled !== false,
        branch: branchRows.find((branch) => branch.id === agent.branchId) || null,
      })));
    } catch (error) {
      console.error(error);
      toast({ title: "Gagal memuat data agen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      agentCode: form.agentCode.trim().toUpperCase() || null,
      gender: form.gender || null,
      address: form.address.trim() || null,
      dateOfBirth: form.dateOfBirth || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      referralCode: form.referralCode.trim().toUpperCase() || null,
      publicSlug: form.publicSlug.trim() || null,
      publicDescription: form.publicDescription.trim() || null,
      publicPageEnabled: form.publicPageEnabled,
      branchId: form.branchId || null,
      commissionPercent: form.commissionPercent || 0,
      monthlyTarget: form.monthlyTarget === "" ? null : Number(form.monthlyTarget),
      isActive: form.isActive,
    };

    if (form.email) {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.email.trim())
        .maybeSingle();
      if (userProfile?.id) payload.userId = userProfile.id;
    }

    try {
      if (editing) {
        await apiFetch(`/api/admin/agents/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast({ title: "Agen berhasil diperbarui" });
      } else {
        await apiFetch("/api/admin/agents", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Agen berhasil ditambahkan" });
      }
      setIsOpen(false);
      resetForm();
      await fetchData();
    } catch (error: any) {
      toast({ title: "Gagal menyimpan agen", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditing(agent);
    setForm({
      name: agent.name || "",
      agentCode: agent.agentCode || "",
      gender: agent.gender || "",
      address: agent.address || "",
      dateOfBirth: agent.dateOfBirth || "",
      phone: agent.phone || "",
      email: agent.email || "",
      referralCode: agent.referralCode || "",
      publicSlug: agent.publicSlug || "",
      publicDescription: agent.publicDescription || "",
      publicPageEnabled: agent.publicPageEnabled !== false,
      branchId: agent.branchId || "",
      commissionPercent: agent.commissionPercent || 0,
      monthlyTarget: agent.monthlyTarget ?? "",
      isActive: agent.isActive,
    });
    setIsOpen(true);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ ...emptyForm });
  };

  const executeDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/agents/${id}`, { method: "DELETE" });
      toast({ title: "Agen berhasil dihapus" });
      await fetchData();
    } catch (error: any) {
      toast({ title: "Gagal menghapus agen", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (agent: Agent) => {
    try {
      await apiFetch(`/api/admin/agents/${agent.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !agent.isActive }) });
      await fetchData();
    } catch (error: any) {
      toast({ title: "Gagal mengubah status", description: error.message, variant: "destructive" });
    }
  };

  const publicUrl = (agent: Agent) => agent.publicSlug ? `${window.location.origin}/agen/${agent.publicSlug}` : "";

  const copyPublicUrl = async (agent: Agent) => {
    const url = publicUrl(agent);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link halaman agen disalin" });
  };

  const downloadQr = async (agent: Agent) => {
    const url = publicUrl(agent);
    if (!url) return;
    const dataUrl = await QRCode.toDataURL(url, { width: 900, margin: 2, errorCorrectionLevel: "H" });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-agen-${agent.publicSlug}.png`;
    link.click();
  };

  const filteredAgents = useMemo(() => agents.filter((agent) => {
    const term = searchTerm.trim().toLowerCase();
    const normalizedSearch = normalizePhone(searchTerm).toLowerCase();
    const agentPhone = normalizePhone(agent.phone || "").toLowerCase();
    const matchesSearch = !term || agent.name.toLowerCase().includes(term) || (agent.agentCode || "").toLowerCase().includes(term) || (agent.phone || "").toLowerCase().includes(term) || Boolean(normalizedSearch && agentPhone.includes(normalizedSearch));
    return matchesSearch && (filterBranch === "all" || agent.branchId === filterBranch);
  }), [agents, searchTerm, filterBranch]);

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } = useAdminPagination(filteredAgents);
  useEffect(() => { resetPage(); }, [searchTerm, filterBranch]);

  const activeCount = agents.filter((agent) => agent.isActive).length;
  const publishedCount = agents.filter((agent) => agent.isActive && agent.publicPageEnabled).length;
  const avgCommission = agents.length ? (agents.reduce((sum, agent) => sum + Number(agent.commissionPercent || 0), 0) / agents.length).toFixed(1) : "0";

  return (
    <div>
      <DeleteAlertDialog open={isDeleteOpen} onOpenChange={cancelDelete} onConfirm={() => confirmDelete(executeDelete)} title="Hapus Agen?" description="Data agen dan relasi komisinya akan ikut terdampak. Gunakan status nonaktif bila ingin menyimpan riwayat." />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Agen & Mitra</h1>
          <p className="text-muted-foreground text-sm mt-1">Data identitas, kode agen, dan halaman publik dengan QR masing-masing.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary"><Plus className="w-4 h-4 mr-2" /> Tambah Agen</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Data Agen" : "Tambah Agen Baru"}</DialogTitle>
              <DialogDescription>Field bertanda * wajib diisi. Data tanggal lahir dan gender hanya untuk administrasi internal.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <section className="space-y-3">
                <p className="text-sm font-semibold text-primary">Data sesuai daftar mitra</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Nama Agen *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Bonang Panji Nur" className="mt-1" /></div>
                  <div><Label>Gender</Label><Select value={form.gender || "none"} onValueChange={(value) => setForm({ ...form, gender: value === "none" ? "" : value })}><SelectTrigger className="mt-1"><SelectValue placeholder="Pilih gender" /></SelectTrigger><SelectContent><SelectItem value="none">Belum diisi</SelectItem><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent></Select></div>
                  <div><Label>Tanggal Lahir</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="mt-1" /></div>
                  <div><Label>Nomor Telepon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" className="mt-1" /></div>
                </div>
                <div><Label>Alamat Agen</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap agen" rows={2} className="mt-1" /></div>
              </section>

              <section className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-semibold text-primary">Kode, cabang, dan komisi</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label>Kode Cabang</Label><Select value={form.branchId || "none"} onValueChange={(value) => setForm({ ...form, branchId: value === "none" ? "" : value })}><SelectTrigger className="mt-1"><SelectValue placeholder="Pilih cabang" /></SelectTrigger><SelectContent><SelectItem value="none">Pusat / tanpa cabang</SelectItem>{branches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.code ? `${branch.code} — ` : ""}{branch.name}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Kode Agen</Label><Input value={form.agentCode} onChange={(e) => setForm({ ...form, agentCode: e.target.value.toUpperCase().replace(/\s+/g, "-") })} placeholder="A001VINS26" className="mt-1 font-mono" /><p className="text-[11px] text-muted-foreground mt-1">Otomatis dibuat bila dikosongkan.</p></div>
                  <div><Label>Komisi (%)</Label><Input type="number" min="0" max="100" step="0.5" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) || 0 })} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Target Bulanan (opsional)</Label><Input type="number" min="0" value={form.monthlyTarget} onChange={(e) => setForm({ ...form, monthlyTarget: e.target.value === "" ? "" : Number(e.target.value) })} className="mt-1" /></div>
                  <div><Label>Kode Referral / Legacy</Label><Input value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase().replace(/\s+/g, "") })} placeholder="A001VINS26" className="mt-1 font-mono" /><p className="text-[11px] text-muted-foreground mt-1">Untuk atribusi booking lama; otomatis mengikuti kode agen bila kosong.</p></div>
                </div>
              </section>

              <section className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-semibold text-primary">Halaman publik & QR</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Slug Halaman Publik</Label><Input value={form.publicSlug} onChange={(e) => setForm({ ...form, publicSlug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") })} placeholder="bonang-panji-nur" className="mt-1 font-mono" /><p className="text-[11px] text-muted-foreground mt-1">URL: /agen/{form.publicSlug || "nama-agen"}</p></div>
                  <div><Label>Email Portal Agen</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="agen@email.com" className="mt-1" /></div>
                </div>
                <div><Label>Deskripsi singkat publik</Label><Textarea value={form.publicDescription} onChange={(e) => setForm({ ...form, publicDescription: e.target.value })} placeholder="Bantu jamaah menemukan paket umroh yang sesuai." rows={2} className="mt-1" /></div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3"><div><Label>Publikasikan halaman agen</Label><p className="text-xs text-muted-foreground">QR hanya aktif jika agen aktif dan halaman dipublikasikan.</p></div><Switch checked={form.publicPageEnabled} onCheckedChange={(checked) => setForm({ ...form, publicPageEnabled: checked })} /></div>
              </section>

              <div className="flex items-center justify-between border-t border-border pt-4"><div><Label>Status Agen Aktif</Label><p className="text-xs text-muted-foreground">Agen nonaktif tidak dapat diakses dari halaman publik.</p></div><Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} /></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button><Button type="submit" className="gradient-gold text-primary">{editing ? "Simpan Perubahan" : "Simpan Agen"}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Total Agen</p><p className="text-2xl font-bold">{agents.length}</p></div></div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"><Building2 className="w-5 h-5 text-secondary-foreground" /></div><div><p className="text-xs text-muted-foreground">Agen Aktif</p><p className="text-2xl font-bold">{activeCount}</p></div></div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center"><QrCode className="w-5 h-5 text-gold" /></div><div><p className="text-xs text-muted-foreground">Halaman Publik</p><p className="text-2xl font-bold">{publishedCount}</p></div></div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center"><Percent className="w-5 h-5 text-gold" /></div><div><p className="text-xs text-muted-foreground">Rata-rata Komisi</p><p className="text-2xl font-bold">{avgCommission}%</p></div></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <Button variant="outline" className="shrink-0" onClick={() => exportToCsv("agents", ["Kode Cabang", "Kode Agen", "Nama", "Gender", "Alamat", "Tgl Lahir", "No Tel", "Cabang", "Komisi (%)", "Status"], filteredAgents.map((agent) => [agent.branch?.code || "-", agent.agentCode || "-", agent.name, agent.gender || "-", agent.address || "-", agent.dateOfBirth || "-", agent.phone || "-", agent.branch?.name || "-", String(agent.commissionPercent || 0), agent.isActive ? "Aktif" : "Nonaktif"]))}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
        <Button variant="outline" className="shrink-0" onClick={() => window.open(`${(import.meta.env.VITE_API_URL as string | undefined) ?? ""}/api/admin/reports/commissions.xlsx`, "_blank")}><Download className="w-4 h-4 mr-2" /> Export Komisi</Button>
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" /><Input placeholder="Cari nama, kode agen, atau telepon..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
        <Select value={filterBranch} onValueChange={setFilterBranch}><SelectTrigger className="w-full lg:w-[220px]"><SelectValue placeholder="Filter cabang" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Cabang</SelectItem>{branches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.code ? `${branch.code} — ` : ""}{branch.name}</SelectItem>)}</SelectContent></Select>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold" /></div> : filteredAgents.length === 0 ? <div className="text-center py-16 text-muted-foreground">{searchTerm || filterBranch !== "all" ? "Tidak ada agen yang sesuai filter" : "Belum ada agen terdaftar"}</div> : <>
        <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama & Kontak</TableHead><TableHead>Gender / Tgl Lahir</TableHead><TableHead>Alamat</TableHead><TableHead>Cabang</TableHead><TableHead>Publik / QR</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{paginatedItems.map((agent) => <TableRow key={agent.id}>
          <TableCell><div className="font-mono text-xs font-semibold">{agent.agentCode || "-"}</div><div className="text-[10px] text-muted-foreground">ref: {agent.referralCode || "-"}</div></TableCell>
          <TableCell><div className="font-semibold">{agent.name}</div><div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><Phone className="w-3 h-3" />{agent.phone || "-"}</div></TableCell>
          <TableCell><div>{agent.gender === "L" ? "Laki-laki" : agent.gender === "P" ? "Perempuan" : "-"}</div><div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><CalendarDays className="w-3 h-3" />{agent.dateOfBirth || "-"}</div></TableCell>
          <TableCell className="max-w-[220px]"><div className="truncate text-sm" title={agent.address || ""}>{agent.address || "-"}</div></TableCell>
          <TableCell>{agent.branch ? <Badge variant="outline" className="font-normal"><Building2 className="w-3 h-3 mr-1" />{agent.branch.code ? `${agent.branch.code} — ` : ""}{agent.branch.name}</Badge> : <span className="text-muted-foreground">Pusat</span>}</TableCell>
          <TableCell><div className="flex items-center gap-2">{agent.publicPageEnabled && agent.isActive && agent.publicSlug ? <><button type="button" onClick={() => setQrAgent(agent)} className="rounded-lg bg-primary/10 p-1.5 text-primary hover:bg-primary/20" title="Tampilkan QR"><QrCode className="w-4 h-4" /></button><a href={`/agen/${agent.publicSlug}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline" title="Buka halaman publik"><ExternalLink className="w-3.5 h-3.5" /></a></> : <Badge variant="secondary" className="text-[10px]">Tidak terbit</Badge>}</div></TableCell>
          <TableCell className="text-center"><Switch checked={agent.isActive} onCheckedChange={() => handleToggleActive(agent)} /></TableCell>
          <TableCell className="text-right whitespace-nowrap"><Button variant="ghost" size="icon" onClick={() => handleEdit(agent)} title="Edit"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => requestDelete(agent.id)} title="Hapus"><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
        </TableRow>)}</TableBody></Table></div></div><AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
      </>}

      <Dialog open={!!qrAgent} onOpenChange={(open) => { if (!open) setQrAgent(null); }}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>QR Halaman Agen</DialogTitle><DialogDescription>Scan QR ini untuk membuka halaman publik agen di website.</DialogDescription></DialogHeader>{qrAgent && <div className="flex flex-col items-center gap-4"><div className="bg-white p-5 rounded-2xl border shadow-sm"><QRCodeSVG value={publicUrl(qrAgent)} size={240} level="H" includeMargin /></div><div className="text-center"><p className="font-semibold">{qrAgent.name}</p><p className="text-xs text-muted-foreground break-all mt-1">{publicUrl(qrAgent)}</p></div><div className="flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={() => copyPublicUrl(qrAgent)}><Copy className="w-4 h-4 mr-2" /> Salin Link</Button><Button className="gradient-gold text-primary" onClick={() => downloadQr(qrAgent)}><Download className="w-4 h-4 mr-2" /> Download QR</Button><Button variant="outline" onClick={() => window.open(publicUrl(qrAgent), "_blank")}><ExternalLink className="w-4 h-4 mr-2" /> Buka Halaman</Button></div></div>}</DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAgents;
