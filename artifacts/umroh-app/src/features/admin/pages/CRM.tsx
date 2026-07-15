import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Trash2, Users, Clock, CheckCircle2,
  Phone, Mail, Bell, AlertTriangle, MessageSquare, Tag, X,
  ChevronRight, History, Filter, BarChart3, Kanban,
} from "lucide-react";
import { format, isPast, isToday, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";

const leadStatuses = [
  { value: "new", label: "Baru", color: "bg-blue-100 text-blue-700 border-blue-200", cardBg: "bg-blue-50 dark:bg-blue-950/30" },
  { value: "contacted", label: "Dihubungi", color: "bg-yellow-100 text-yellow-700 border-yellow-200", cardBg: "bg-yellow-50 dark:bg-yellow-950/30" },
  { value: "interested", label: "Tertarik", color: "bg-green-100 text-green-700 border-green-200", cardBg: "bg-green-50 dark:bg-green-950/30" },
  { value: "negotiation", label: "Negosiasi", color: "bg-purple-100 text-purple-700 border-purple-200", cardBg: "bg-purple-50 dark:bg-purple-950/30" },
  { value: "converted", label: "✅ Booking", color: "bg-primary/10 text-primary border-primary/20", cardBg: "bg-primary/5" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-700 border-red-200", cardBg: "bg-red-50 dark:bg-red-950/30" },
];

const leadSources = ["Website", "WhatsApp", "Instagram", "Facebook", "Referral", "Walk-in", "Telepon", "Lainnya"];

const followUpTypes = [
  { value: "call", label: "Telepon", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Users },
];

const interactionTypes = [
  { value: "call", label: "Telepon" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Catatan" },
];

const interactionOutcomes = [
  { value: "interested", label: "Tertarik" },
  { value: "callback", label: "Minta Callback" },
  { value: "not_interested", label: "Tidak Tertarik" },
  { value: "booked", label: "Langsung Booking" },
  { value: "follow_up", label: "Perlu Follow-up Lagi" },
];

const SUGGESTED_TAGS = ["Prioritas", "VIP", "Cicilan", "Grup", "Keluarga", "Solo", "Senior", "Referral", "Instagram"];

interface LeadForm {
  name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  packageInterest: string;
  notes: string;
  tags: string[];
  estimatedValue: string;
}

interface FollowUpForm {
  leadId: string;
  followUpDate: string;
  type: string;
  notes: string;
}

const defaultLeadForm: LeadForm = {
  name: "", phone: "", email: "", source: "Website", status: "new",
  packageInterest: "", notes: "", tags: [], estimatedValue: "",
};

const defaultFollowUpForm: FollowUpForm = {
  leadId: "", followUpDate: addDays(new Date(), 1).toISOString().slice(0, 16), type: "call", notes: "",
};

const AdminCRM = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [editLeadId, setEditLeadId] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState<LeadForm>(defaultLeadForm);
  const [followUpForm, setFollowUpForm] = useState<FollowUpForm>(defaultFollowUpForm);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"leads" | "pipeline" | "follow-ups">("leads");
  const [tagInput, setTagInput] = useState("");

  // Detail panel state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [interactionForm, setInteractionForm] = useState({ type: "call", summary: "", outcome: "" });

  // Data fetching
  const { data: leads = [], isLoading: leadsLoading } = useQuery<any[]>({
    queryKey: ["crm_leads"],
    queryFn: () => apiFetch<any[]>("/api/admin/crm/leads"),
  });

  const { data: followUps = [], isLoading: followUpsLoading } = useQuery<any[]>({
    queryKey: ["crm_follow_ups"],
    queryFn: () => apiFetch<any[]>("/api/admin/crm/follow-ups"),
  });

  const { data: packages = [] } = useQuery<any[]>({
    queryKey: ["packages_for_crm"],
    queryFn: () => apiFetch<any[]>("/api/packages?active=true"),
  });

  const { data: interactions = [], isLoading: interactionsLoading } = useQuery<any[]>({
    queryKey: ["crm_interactions", selectedLeadId],
    queryFn: () => apiFetch<any[]>(`/api/admin/crm/leads/${selectedLeadId}/interactions`),
    enabled: !!selectedLeadId,
  });

  // Collect all unique tags from leads for the tag filter
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    leads.forEach((l: any) => (l.tags ?? []).forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l: any) => {
      const matchSearch =
        !search ||
        l.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.phone?.toLowerCase().includes(search.toLowerCase()) ||
        l.email?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || l.status === filterStatus;
      const matchTag = filterTag === "all" || (l.tags ?? []).includes(filterTag);
      return matchSearch && matchStatus && matchTag;
    });
  }, [leads, search, filterStatus, filterTag]);

  const { page, setPage, totalPages, totalCount, pageSize, paginatedItems } = useAdminPagination(filteredLeads);

  const stats = useMemo(() => {
    const total = leads.length;
    const byStatus = Object.fromEntries(leadStatuses.map((s) => [s.value, leads.filter((l: any) => l.status === s.value).length]));
    const pendingFollowUps = followUps.filter((f: any) => !f.isDone).length;
    const overdueFollowUps = followUps.filter(
      (f: any) => !f.isDone && f.followUpDate && isPast(new Date(f.followUpDate))
    ).length;
    const conversionRate = total > 0 ? Math.round((byStatus.converted / total) * 100) : 0;
    return { total, byStatus, pendingFollowUps, overdueFollowUps, conversionRate };
  }, [leads, followUps]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveLeadMutation = useMutation({
    mutationFn: async (data: LeadForm) => {
      const payload = {
        ...data,
        estimatedValue: data.estimatedValue ? parseInt(data.estimatedValue.replace(/\D/g, "")) : null,
      };
      if (editLeadId) {
        return apiFetch(`/api/admin/crm/leads/${editLeadId}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      return apiFetch("/api/admin/crm/leads", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
      toast.success(editLeadId ? "Lead diperbarui" : "Lead ditambahkan");
      setLeadDialogOpen(false);
      setEditLeadId(null);
      setLeadForm(defaultLeadForm);
    },
    onError: () => toast.error("Gagal menyimpan lead"),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/crm/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm_follow_ups"] });
      toast.success("Lead dihapus");
      setDeleteLeadId(null);
      if (selectedLeadId === deleteLeadId) setSelectedLeadId(null);
    },
    onError: () => toast.error("Gagal menghapus lead"),
  });

  const moveStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/admin/crm/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm_leads"] }),
    onError: () => toast.error("Gagal update status"),
  });

  const saveFollowUpMutation = useMutation({
    mutationFn: (data: FollowUpForm) =>
      apiFetch(`/api/admin/crm/leads/${data.leadId}/follow-ups`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_follow_ups"] });
      toast.success("Follow-up dijadwalkan");
      setFollowUpDialogOpen(false);
      setFollowUpForm(defaultFollowUpForm);
    },
    onError: () => toast.error("Gagal menjadwalkan follow-up"),
  });

  const toggleFollowUpDone = useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) =>
      apiFetch(`/api/admin/crm/follow-ups/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDone, doneAt: isDone ? new Date().toISOString() : null }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm_follow_ups"] }),
    onError: () => toast.error("Gagal update follow-up"),
  });

  const addInteractionMutation = useMutation({
    mutationFn: (data: typeof interactionForm) =>
      apiFetch(`/api/admin/crm/leads/${selectedLeadId}/interactions`, {
        method: "POST",
        body: JSON.stringify({ ...data, createdBy: user?.email }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_interactions", selectedLeadId] });
      toast.success("Interaksi dicatat");
      setInteractionForm({ type: "call", summary: "", outcome: "" });
    },
    onError: () => toast.error("Gagal mencatat interaksi"),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  const handleEditLead = (l: any) => {
    setEditLeadId(l.id);
    setLeadForm({
      name: l.name, phone: l.phone || "", email: l.email || "",
      source: l.source || "Website", status: l.status,
      packageInterest: l.packageInterest || "", notes: l.notes || "",
      tags: l.tags ?? [], estimatedValue: l.estimatedValue?.toString() ?? "",
    });
    setLeadDialogOpen(true);
  };

  const getStatusInfo = (status: string) => leadStatuses.find((s) => s.value === status);

  const getFollowUpUrgency = (date: string, isDone: boolean) => {
    if (isDone) return "text-muted-foreground line-through";
    if (isPast(new Date(date))) return "text-destructive font-bold";
    if (isToday(new Date(date))) return "text-amber-600 font-semibold";
    return "";
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !leadForm.tags.includes(trimmed)) {
      setLeadForm((f) => ({ ...f, tags: [...f.tags, trimmed] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setLeadForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const selectedLead = useMemo(() => leads.find((l: any) => l.id === selectedLeadId), [leads, selectedLeadId]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            CRM & Pipeline Leads
          </h1>
          <p className="text-muted-foreground text-sm">Tracking calon jemaah dari interest hingga booking</p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={followUpDialogOpen}
            onOpenChange={(o) => { setFollowUpDialogOpen(o); if (!o) setFollowUpForm(defaultFollowUpForm); }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Bell className="w-4 h-4 mr-1.5" /> Follow-up</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Jadwalkan Follow-up</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveFollowUpMutation.mutate(followUpForm); }} className="space-y-4">
                <div>
                  <Label>Lead</Label>
                  <Select value={followUpForm.leadId} onValueChange={(v) => setFollowUpForm((f) => ({ ...f, leadId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pilih lead" /></SelectTrigger>
                    <SelectContent>
                      {leads.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>{l.name} {l.phone ? `(${l.phone})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tanggal & Waktu</Label>
                    <Input type="datetime-local" value={followUpForm.followUpDate} onChange={(e) => setFollowUpForm((f) => ({ ...f, followUpDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Tipe</Label>
                    <Select value={followUpForm.type} onValueChange={(v) => setFollowUpForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {followUpTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Catatan</Label>
                  <Textarea value={followUpForm.notes} onChange={(e) => setFollowUpForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Topik yang akan dibahas..." />
                </div>
                <Button type="submit" className="w-full" disabled={saveFollowUpMutation.isPending || !followUpForm.leadId}>
                  Jadwalkan
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={leadDialogOpen} onOpenChange={(o) => { setLeadDialogOpen(o); if (!o) { setEditLeadId(null); setLeadForm(defaultLeadForm); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Tambah Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editLeadId ? "Edit Lead" : "Tambah Lead Baru"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); if (!leadForm.name) { toast.error("Nama harus diisi"); return; } saveLeadMutation.mutate(leadForm); }} className="space-y-4">
                <div>
                  <Label>Nama *</Label>
                  <Input value={leadForm.name} onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama calon jemaah" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telepon</Label>
                    <Input value={leadForm.phone} onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))} placeholder="08xx" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={leadForm.email} onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Sumber</Label>
                    <Select value={leadForm.source} onValueChange={(v) => setLeadForm((f) => ({ ...f, source: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{leadSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={leadForm.status} onValueChange={(v) => setLeadForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{leadStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Paket Diminati</Label>
                    <Select value={leadForm.packageInterest} onValueChange={(v) => setLeadForm((f) => ({ ...f, packageInterest: v }))}>
                      <SelectTrigger><SelectValue placeholder="Pilih paket" /></SelectTrigger>
                      <SelectContent>{packages.map((p: any) => <SelectItem key={p.id} value={p.title}>{p.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Est. Nilai (Rp)</Label>
                    <Input value={leadForm.estimatedValue} onChange={(e) => setLeadForm((f) => ({ ...f, estimatedValue: e.target.value }))} placeholder="cth: 25000000" />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5"><Tag className="w-3.5 h-3.5" /> Segmentasi / Tags</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {leadForm.tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                      placeholder="Ketik tag + Enter"
                      className="text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => addTag(tagInput)}>+</Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {SUGGESTED_TAGS.filter((t) => !leadForm.tags.includes(t)).map((t) => (
                      <button key={t} type="button" onClick={() => addTag(t)}
                        className="text-xs px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Catatan</Label>
                  <Textarea value={leadForm.notes} onChange={(e) => setLeadForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Catatan tentang lead..." />
                </div>
                <Button type="submit" className="w-full" disabled={saveLeadMutation.isPending}>
                  {saveLeadMutation.isPending ? "Menyimpan..." : editLeadId ? "Perbarui" : "Simpan"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {leadStatuses.map((s) => (
          <Card key={s.value} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => { setFilterStatus(s.value); setActiveTab("leads"); }}>
            <CardContent className="pt-3 pb-2 px-3">
              <Badge variant="outline" className={`text-xs mb-1 ${s.color}`}>{s.label}</Badge>
              <p className="text-2xl font-bold">{stats.byStatus[s.value] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { key: "leads", label: "Daftar Lead", icon: Users },
          { key: "pipeline", label: "Pipeline", icon: Kanban },
          { key: "follow-ups", label: "Follow-up", icon: Bell },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === "follow-ups" && stats.overdueFollowUps > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5">{stats.overdueFollowUps}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── LEADS TAB ── */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nama, telepon, email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48"><Filter className="w-4 h-4 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {leadStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {allTags.length > 0 && (
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-44"><Tag className="w-4 h-4 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Filter tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tag</SelectItem>
                  {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Sumber</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
                    ) : paginatedItems.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Belum ada lead</TableCell></TableRow>
                    ) : (
                      paginatedItems.map((l: any) => {
                        const sInfo = getStatusInfo(l.status);
                        return (
                          <TableRow key={l.id} className={selectedLeadId === l.id ? "bg-primary/5" : ""}>
                            <TableCell className="font-semibold">
                              <button onClick={() => setSelectedLeadId(selectedLeadId === l.id ? null : l.id)} className="hover:text-primary transition-colors text-left">
                                {l.name}
                              </button>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm space-y-0.5">
                                {l.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" />{l.phone}</div>}
                                {l.email && <div className="flex items-center gap-1 truncate max-w-[150px]"><Mail className="w-3 h-3 text-muted-foreground" />{l.email}</div>}
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{l.source}</Badge></TableCell>
                            <TableCell className="max-w-[120px] truncate text-sm">{l.packageInterest || "-"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(l.tags ?? []).slice(0, 2).map((tag: string) => (
                                  <span key={tag} className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{tag}</span>
                                ))}
                                {(l.tags ?? []).length > 2 && <span className="text-[10px] text-muted-foreground">+{l.tags.length - 2}</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select value={l.status} onValueChange={(v) => moveStatusMutation.mutate({ id: l.id, status: v })}>
                                <SelectTrigger className="h-7 text-xs w-36">
                                  <Badge variant="outline" className={`text-xs ${sInfo?.color ?? ""}`}>{sInfo?.label ?? l.status}</Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  {leadStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {l.createdAt ? format(new Date(l.createdAt), "dd MMM yyyy", { locale: localeId }) : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedLeadId(selectedLeadId === l.id ? null : l.id)}>
                                  <History className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setFollowUpForm({ ...defaultFollowUpForm, leadId: l.id }); setFollowUpDialogOpen(true); }}>
                                  <Bell className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditLead(l)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteLeadId(l.id)}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />

          {/* Interaction Panel */}
          {selectedLead && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    Riwayat Interaksi — {selectedLead.name}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedLeadId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add interaction form */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Catat Interaksi Baru</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={interactionForm.type} onValueChange={(v) => setInteractionForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{interactionTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={interactionForm.outcome} onValueChange={(v) => setInteractionForm((f) => ({ ...f, outcome: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Hasil..." /></SelectTrigger>
                      <SelectContent>{interactionOutcomes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Ringkasan percakapan / catatan..."
                    value={interactionForm.summary}
                    onChange={(e) => setInteractionForm((f) => ({ ...f, summary: e.target.value }))}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    disabled={!interactionForm.summary || addInteractionMutation.isPending}
                    onClick={() => addInteractionMutation.mutate(interactionForm)}
                  >
                    Simpan Interaksi
                  </Button>
                </div>

                {/* Interaction history */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {interactionsLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Memuat riwayat...</p>
                  ) : interactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat interaksi</p>
                  ) : (
                    interactions.map((item: any) => (
                      <div key={item.id} className="flex gap-3 text-sm">
                        <div className="mt-0.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium capitalize">{interactionTypes.find((t) => t.value === item.type)?.label ?? item.type}</span>
                            {item.outcome && (
                              <Badge variant="outline" className="text-[10px]">
                                {interactionOutcomes.find((o) => o.value === item.outcome)?.label ?? item.outcome}
                              </Badge>
                            )}
                            <span className="text-muted-foreground text-xs ml-auto whitespace-nowrap">
                              {item.createdAt ? format(new Date(item.createdAt), "dd MMM HH:mm", { locale: localeId }) : ""}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-0.5">{item.summary}</p>
                          {item.createdBy && <p className="text-[10px] text-muted-foreground/60">oleh {item.createdBy}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── PIPELINE KANBAN TAB ── */}
      {activeTab === "pipeline" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {leadStatuses.map((col) => {
              const colLeads = leads.filter((l: any) => l.status === col.value);
              return (
                <div key={col.value} className={`w-72 rounded-xl border p-3 space-y-2 ${col.cardBg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className={`text-xs ${col.color}`}>{col.label}</Badge>
                    <span className="text-xs text-muted-foreground font-medium">{colLeads.length}</span>
                  </div>
                  {colLeads.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground opacity-60">Tidak ada lead</div>
                  ) : (
                    colLeads.map((l: any) => (
                      <div
                        key={l.id}
                        className="bg-card border rounded-lg p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => { setSelectedLeadId(l.id); setActiveTab("leads"); }}
                      >
                        <div className="font-semibold text-sm">{l.name}</div>
                        {l.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{l.phone}</div>}
                        {l.packageInterest && <div className="text-xs text-muted-foreground truncate">📦 {l.packageInterest}</div>}
                        {(l.tags ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(l.tags as string[]).map((tag) => (
                              <span key={tag} className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{tag}</span>
                            ))}
                          </div>
                        )}
                        {l.estimatedValue && (
                          <div className="text-xs font-medium text-success">
                            Rp {Number(l.estimatedValue).toLocaleString("id-ID")}
                          </div>
                        )}
                        <div className="flex gap-1 pt-1 border-t border-border/50">
                          {leadStatuses.filter((s) => s.value !== l.status).slice(0, 3).map((target) => (
                            <button
                              key={target.value}
                              onClick={(e) => { e.stopPropagation(); moveStatusMutation.mutate({ id: l.id, status: target.value }); }}
                              className="flex-1 text-[10px] text-muted-foreground hover:text-primary transition-colors truncate text-center"
                              title={`Pindah ke ${target.label}`}
                            >
                              → {target.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FOLLOW-UPS TAB ── */}
      {activeTab === "follow-ups" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">✓</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Jadwal</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followUpsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
                  ) : followUps.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada follow-up</TableCell></TableRow>
                  ) : (
                    (followUps as any[]).map((f) => {
                      const typeInfo = followUpTypes.find((t) => t.value === f.type);
                      const Icon = typeInfo?.icon ?? Clock;
                      return (
                        <TableRow key={f.id} className={f.isDone ? "opacity-50" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={f.isDone}
                              onCheckedChange={(checked) => toggleFollowUpDone.mutate({ id: f.id, isDone: !!checked })}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">{f.leadName || "-"}</div>
                            {f.leadPhone && <span className="text-xs text-muted-foreground">{f.leadPhone}</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">{typeInfo?.label || f.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className={f.followUpDate ? getFollowUpUrgency(f.followUpDate, f.isDone) : ""}>
                            {f.followUpDate ? format(new Date(f.followUpDate), "dd MMM yyyy HH:mm", { locale: localeId }) : "-"}
                            {!f.isDone && f.followUpDate && isPast(new Date(f.followUpDate)) && <span className="ml-1.5 text-xs">⚠️ Overdue</span>}
                            {!f.isDone && f.followUpDate && isToday(new Date(f.followUpDate)) && <span className="ml-1.5 text-xs">📌 Hari ini</span>}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{f.notes || "-"}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <DeleteAlertDialog
        open={!!deleteLeadId}
        onOpenChange={(o) => !o && setDeleteLeadId(null)}
        onConfirm={() => deleteLeadId && deleteLeadMutation.mutate(deleteLeadId)}
        title="Hapus Lead"
        description="Lead dan semua follow-up serta riwayat interaksi terkait akan dihapus permanen."
      />
    </div>
  );
};

export default AdminCRM;
