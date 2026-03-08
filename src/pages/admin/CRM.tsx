import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Trash2, Users, UserPlus, Clock, CheckCircle2,
  Phone, Mail, Calendar, MessageSquare, Bell, AlertTriangle,
} from "lucide-react";
import { format, isPast, isToday, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import DeleteAlertDialog from "@/components/admin/DeleteAlertDialog";
import AdminPagination from "@/components/admin/AdminPagination";
import { useAdminPagination } from "@/hooks/useAdminPagination";

const leadStatuses = [
  { value: "new", label: "Baru", color: "bg-blue-100 text-blue-700" },
  { value: "contacted", label: "Sudah Dihubungi", color: "bg-yellow-100 text-yellow-700" },
  { value: "interested", label: "Tertarik", color: "bg-emerald-100 text-emerald-700" },
  { value: "negotiation", label: "Negosiasi", color: "bg-purple-100 text-purple-700" },
  { value: "converted", label: "Booking", color: "bg-primary/20 text-primary" },
  { value: "lost", label: "Lost", color: "bg-destructive/20 text-destructive" },
];

const leadSources = ["Website", "WhatsApp", "Instagram", "Facebook", "Referral", "Walk-in", "Telepon", "Lainnya"];
const followUpTypes = [
  { value: "call", label: "Telepon", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Users },
];

interface LeadForm {
  name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  package_interest: string;
  notes: string;
}

interface FollowUpForm {
  lead_id: string;
  follow_up_date: string;
  type: string;
  notes: string;
}

const defaultLeadForm: LeadForm = {
  name: "", phone: "", email: "", source: "Website", status: "new", package_interest: "", notes: "",
};

const defaultFollowUpForm: FollowUpForm = {
  lead_id: "", follow_up_date: addDays(new Date(), 1).toISOString().slice(0, 16), type: "call", notes: "",
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
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"leads" | "follow-ups">("leads");

  // Fetch leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["crm_leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch follow-ups
  const { data: followUps = [], isLoading: followUpsLoading } = useQuery({
    queryKey: ["crm_follow_ups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_follow_ups")
        .select("*, leads(name, phone)")
        .order("follow_up_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch packages for interest dropdown
  const { data: packages = [] } = useQuery({
    queryKey: ["packages_for_crm"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("id, title")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const filteredLeads = leads.filter((l: any) => {
    const matchSearch = !search ||
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize } =
    useAdminPagination(filteredLeads);

  // Summary stats
  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter((l: any) => l.status === "new").length;
    const interested = leads.filter((l: any) => l.status === "interested").length;
    const converted = leads.filter((l: any) => l.status === "converted").length;
    const pendingFollowUps = followUps.filter((f: any) => !f.is_done).length;
    const overdueFollowUps = followUps.filter(
      (f: any) => !f.is_done && isPast(new Date(f.follow_up_date))
    ).length;
    return { total, newLeads, interested, converted, pendingFollowUps, overdueFollowUps };
  }, [leads, followUps]);

  // Lead mutations
  const saveLeadMutation = useMutation({
    mutationFn: async (data: LeadForm) => {
      const payload = { ...data, assigned_to: user?.id };
      if (editLeadId) {
        const { error } = await supabase.from("leads").update(payload).eq("id", editLeadId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leads").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
      toast.success(editLeadId ? "Lead diperbarui" : "Lead ditambahkan");
      setLeadDialogOpen(false);
      setEditLeadId(null);
      setLeadForm(defaultLeadForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm_follow_ups"] });
      toast.success("Lead dihapus");
      setDeleteLeadId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Follow-up mutations
  const saveFollowUpMutation = useMutation({
    mutationFn: async (data: FollowUpForm) => {
      const { error } = await supabase.from("lead_follow_ups").insert({
        ...data,
        follow_up_date: new Date(data.follow_up_date).toISOString(),
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_follow_ups"] });
      toast.success("Follow-up dijadwalkan");
      setFollowUpDialogOpen(false);
      setFollowUpForm(defaultFollowUpForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleFollowUpDone = useMutation({
    mutationFn: async ({ id, isDone }: { id: string; isDone: boolean }) => {
      const { error } = await supabase
        .from("lead_follow_ups")
        .update({ is_done: isDone, done_at: isDone ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_follow_ups"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleEditLead = (l: any) => {
    setEditLeadId(l.id);
    setLeadForm({
      name: l.name, phone: l.phone || "", email: l.email || "",
      source: l.source || "Website", status: l.status, package_interest: l.package_interest || "", notes: l.notes || "",
    });
    setLeadDialogOpen(true);
  };

  const handleAddFollowUp = (leadId: string) => {
    setFollowUpForm({ ...defaultFollowUpForm, lead_id: leadId });
    setFollowUpDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const s = leadStatuses.find((ls) => ls.value === status);
    return <Badge variant="outline" className={s?.color || ""}>{s?.label || status}</Badge>;
  };

  const getFollowUpUrgency = (date: string, isDone: boolean) => {
    if (isDone) return "text-muted-foreground line-through";
    if (isPast(new Date(date))) return "text-destructive font-bold";
    if (isToday(new Date(date))) return "text-amber-600 font-semibold";
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">CRM & Follow-up</h1>
          <p className="text-muted-foreground text-sm">Tracking leads dan reminder follow-up</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={followUpDialogOpen} onOpenChange={(o) => { setFollowUpDialogOpen(o); if (!o) setFollowUpForm(defaultFollowUpForm); }}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Jadwalkan Follow-up</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveFollowUpMutation.mutate(followUpForm); }} className="space-y-4">
                <div>
                  <Label>Lead</Label>
                  <Select value={followUpForm.lead_id} onValueChange={(v) => setFollowUpForm({ ...followUpForm, lead_id: v })}>
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
                    <Input type="datetime-local" value={followUpForm.follow_up_date} onChange={(e) => setFollowUpForm({ ...followUpForm, follow_up_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tipe</Label>
                    <Select value={followUpForm.type} onValueChange={(v) => setFollowUpForm({ ...followUpForm, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {followUpTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Catatan</Label>
                  <Textarea value={followUpForm.notes} onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })} placeholder="Catatan follow-up..." />
                </div>
                <Button type="submit" className="w-full" disabled={saveFollowUpMutation.isPending || !followUpForm.lead_id}>
                  {saveFollowUpMutation.isPending ? "Menyimpan..." : "Jadwalkan"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={leadDialogOpen} onOpenChange={(o) => { setLeadDialogOpen(o); if (!o) { setEditLeadId(null); setLeadForm(defaultLeadForm); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Tambah Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editLeadId ? "Edit Lead" : "Tambah Lead Baru"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); if (!leadForm.name) { toast.error("Nama harus diisi"); return; } saveLeadMutation.mutate(leadForm); }} className="space-y-4">
                <div>
                  <Label>Nama *</Label>
                  <Input value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} placeholder="Nama calon jemaah" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telepon</Label>
                    <Input value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} placeholder="08xx" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} placeholder="email@..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Sumber</Label>
                    <Select value={leadForm.source} onValueChange={(v) => setLeadForm({ ...leadForm, source: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {leadSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={leadForm.status} onValueChange={(v) => setLeadForm({ ...leadForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {leadStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Paket Diminati</Label>
                  <Select value={leadForm.package_interest} onValueChange={(v) => setLeadForm({ ...leadForm, package_interest: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih paket" /></SelectTrigger>
                    <SelectContent>
                      {packages.map((p: any) => <SelectItem key={p.id} value={p.title}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Catatan</Label>
                  <Textarea value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} placeholder="Catatan tentang lead..." />
                </div>
                <Button type="submit" className="w-full" disabled={saveLeadMutation.isPending}>
                  {saveLeadMutation.isPending ? "Menyimpan..." : editLeadId ? "Perbarui" : "Simpan"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Lead</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Baru</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.newLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Tertarik</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.interested}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Converted</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.converted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Follow-up</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.pendingFollowUps}</p>
          </CardContent>
        </Card>
        <Card className={stats.overdueFollowUps > 0 ? "border-destructive" : ""}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${stats.overdueFollowUps > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground">Overdue</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${stats.overdueFollowUps > 0 ? "text-destructive" : ""}`}>{stats.overdueFollowUps}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("leads")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "leads" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab("follow-ups")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "follow-ups" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Bell className="w-4 h-4 inline mr-1.5" />
          Follow-up ({followUps.filter((f: any) => !f.is_done).length})
          {stats.overdueFollowUps > 0 && (
            <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5">{stats.overdueFollowUps}</span>
          )}
        </button>
      </div>

      {/* Leads Tab */}
      {activeTab === "leads" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari lead..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {leadStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
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
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
                    ) : paginatedItems.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada lead</TableCell></TableRow>
                    ) : (
                      paginatedItems.map((l: any) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-semibold">{l.name}</TableCell>
                          <TableCell>
                            <div className="text-sm space-y-0.5">
                              {l.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" />{l.phone}</div>}
                              {l.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-muted-foreground" />{l.email}</div>}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{l.source}</Badge></TableCell>
                          <TableCell className="max-w-[150px] truncate text-sm">{l.package_interest || "-"}</TableCell>
                          <TableCell>{getStatusBadge(l.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(l.created_at), "dd MMM yyyy", { locale: localeId })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" title="Follow-up" onClick={() => handleAddFollowUp(l.id)}>
                                <Calendar className="w-4 h-4 text-amber-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditLead(l)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteLeadId(l.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}

      {/* Follow-ups Tab */}
      {activeTab === "follow-ups" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Jadwal Follow-up</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setFollowUpDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Tambah
            </Button>
          </CardHeader>
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
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada jadwal follow-up</TableCell></TableRow>
                  ) : (
                    followUps.map((f: any) => {
                      const typeInfo = followUpTypes.find((t) => t.value === f.type);
                      const Icon = typeInfo?.icon || Phone;
                      return (
                        <TableRow key={f.id} className={f.is_done ? "opacity-60" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={f.is_done}
                              onCheckedChange={(checked) => toggleFollowUpDone.mutate({ id: f.id, isDone: !!checked })}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-semibold">{f.leads?.name || "-"}</span>
                              {f.leads?.phone && <span className="text-xs text-muted-foreground ml-2">{f.leads.phone}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">{typeInfo?.label || f.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className={getFollowUpUrgency(f.follow_up_date, f.is_done)}>
                            {format(new Date(f.follow_up_date), "dd MMM yyyy HH:mm", { locale: localeId })}
                            {!f.is_done && isPast(new Date(f.follow_up_date)) && (
                              <span className="ml-1.5 text-xs">⚠️ Overdue</span>
                            )}
                            {!f.is_done && isToday(new Date(f.follow_up_date)) && (
                              <span className="ml-1.5 text-xs">📌 Hari ini</span>
                            )}
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
        description="Lead dan semua follow-up terkait akan dihapus permanen."
      />
    </div>
  );
};

export default AdminCRM;
