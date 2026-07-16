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
import { Separator } from "@/shared/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Trash2, Users, Clock, CheckCircle2,
  Phone, Mail, Bell, AlertTriangle, MessageSquare, Tag, X,
  ChevronRight, History, Filter, BarChart3, Kanban,
  RefreshCcw, Repeat2, CalendarClock, CalendarCheck2,
  TrendingUp, Flame, Zap,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, addDays, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";

// ─── Constants ────────────────────────────────────────────────────────────────

const leadStatuses = [
  { value: "new",         label: "Baru",       color: "bg-blue-100 text-blue-700 border-blue-200",       cardBg: "bg-blue-50 dark:bg-blue-950/30" },
  { value: "contacted",   label: "Dihubungi",  color: "bg-yellow-100 text-yellow-700 border-yellow-200", cardBg: "bg-yellow-50 dark:bg-yellow-950/30" },
  { value: "interested",  label: "Tertarik",   color: "bg-green-100 text-green-700 border-green-200",    cardBg: "bg-green-50 dark:bg-green-950/30" },
  { value: "negotiation", label: "Negosiasi",  color: "bg-purple-100 text-purple-700 border-purple-200", cardBg: "bg-purple-50 dark:bg-purple-950/30" },
  { value: "converted",   label: "✅ Booking", color: "bg-primary/10 text-primary border-primary/20",    cardBg: "bg-primary/5" },
  { value: "lost",        label: "Lost",       color: "bg-red-100 text-red-700 border-red-200",          cardBg: "bg-red-50 dark:bg-red-950/30" },
];

const leadSources = ["Website", "WhatsApp", "Instagram", "Facebook", "Referral", "Walk-in", "Telepon", "Lainnya"];

const followUpTypes = [
  { value: "call",      label: "Telepon",   icon: Phone },
  { value: "whatsapp",  label: "WhatsApp",  icon: MessageSquare },
  { value: "email",     label: "Email",     icon: Mail },
  { value: "meeting",   label: "Meeting",   icon: Users },
];

const interactionTypes = [
  { value: "call",      label: "Telepon" },
  { value: "whatsapp",  label: "WhatsApp" },
  { value: "email",     label: "Email" },
  { value: "meeting",   label: "Meeting" },
  { value: "note",      label: "Catatan" },
];

const interactionOutcomes = [
  { value: "interested",    label: "Tertarik" },
  { value: "callback",      label: "Minta Callback" },
  { value: "not_interested",label: "Tidak Tertarik" },
  { value: "booked",        label: "Langsung Booking" },
  { value: "follow_up",     label: "Perlu Follow-up Lagi" },
];

const SUGGESTED_TAGS = [
  "Prioritas", "VIP", "Cicilan", "Grup", "Keluarga", "Solo",
  "Senior", "Referral", "Instagram", "Repeat Customer",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string;
  packageInterest: string | null;
  notes: string | null;
  tags: string[];
  assignedTo: string | null;
  estimatedValue: number | null;
  isRepeatCustomer: boolean;
  lastInteractionAt: string | null;
  createdAt: string | null;
}

interface FollowUp {
  id: string;
  leadId: string;
  followUpDate: string | null;
  type: string | null;
  notes: string | null;
  isDone: boolean;
  doneAt: string | null;
  leadName?: string | null;
  leadPhone?: string | null;
  leadStatus?: string | null;
}

interface LeadForm {
  name: string; phone: string; email: string; source: string;
  status: string; packageInterest: string; notes: string;
  tags: string[]; estimatedValue: string;
}

const defaultLeadForm: LeadForm = {
  name: "", phone: "", email: "", source: "Website", status: "new",
  packageInterest: "", notes: "", tags: [], estimatedValue: "",
};

/** Always compute relative to now so the date isn't stale from bundle-load time. */
const makeDefaultFollowUpForm = () => ({
  leadId: "", followUpDate: addDays(new Date(), 1).toISOString().slice(0, 16),
  type: "call", notes: "",
});
const defaultFollowUpForm = makeDefaultFollowUpForm();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusInfo = (status: string) => leadStatuses.find((s) => s.value === status);

const getStaleness = (lastInteractionAt: string | null, createdAt: string | null): number | null => {
  const ref = lastInteractionAt ?? createdAt;
  if (!ref) return null;
  return differenceInDays(new Date(), new Date(ref));
};

const StalenessBadge = ({ days }: { days: number | null }) => {
  if (days === null || days < 7) return null;
  const label = days >= 30 ? `${days}h tanpa kontak` : `${days}h diam`;
  const cls = days >= 30
    ? "bg-red-100 text-red-700 border-red-200"
    : "bg-amber-100 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border ${cls}`}>
      <Flame className="w-2.5 h-2.5" /> {label}
    </span>
  );
};

const RepeatBadge = () => (
  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
    <Repeat2 className="w-2.5 h-2.5" /> Repeat
  </span>
);

// ─── Component ────────────────────────────────────────────────────────────────

const AdminCRM = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [leadDialogOpen, setLeadDialogOpen]     = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [editLeadId, setEditLeadId]             = useState<string | null>(null);
  const [leadForm, setLeadForm]                 = useState<LeadForm>(defaultLeadForm);
  const [followUpForm, setFollowUpForm]         = useState(defaultFollowUpForm);
  const [search, setSearch]                     = useState("");
  const [filterStatus, setFilterStatus]         = useState("all");
  const [filterTag, setFilterTag]               = useState("all");
  const [fuFilter, setFuFilter]                 = useState<"all"|"overdue"|"today"|"upcoming"|"done">("all");
  const [deleteLeadId, setDeleteLeadId]         = useState<string | null>(null);
  const [activeTab, setActiveTab]               = useState<"leads"|"pipeline"|"follow-ups">("leads");
  const [tagInput, setTagInput]                 = useState("");
  const [selectedLeadId, setSelectedLeadId]     = useState<string | null>(null);
  const [detailTab, setDetailTab]               = useState<"interactions"|"followups">("interactions");
  const [interactionForm, setInteractionForm]   = useState({ type: "call", summary: "", outcome: "" });

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["crm_leads"],
    queryFn: () => apiFetch<Lead[]>("/api/admin/crm/leads"),
  });

  const { data: followUps = [], isLoading: followUpsLoading } = useQuery<FollowUp[]>({
    queryKey: ["crm_follow_ups"],
    queryFn: () => apiFetch<FollowUp[]>("/api/admin/crm/follow-ups"),
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

  const { data: leadFollowUps = [], isLoading: leadFuLoading } = useQuery<FollowUp[]>({
    queryKey: ["crm_lead_followups", selectedLeadId],
    queryFn: () => apiFetch<FollowUp[]>(`/api/admin/crm/leads/${selectedLeadId}/follow-ups`),
    enabled: !!selectedLeadId,
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const allTags = useMemo(() => {
    const s = new Set<string>();
    leads.forEach((l) => (l.tags ?? []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [leads]);

  const filteredLeads = useMemo(() =>
    leads.filter((l) => {
      const q = search.toLowerCase();
      return (
        (!search || l.name?.toLowerCase().includes(q) || l.phone?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q)) &&
        (filterStatus === "all" || l.status === filterStatus) &&
        (filterTag === "all" || (l.tags ?? []).includes(filterTag))
      );
    }),
  [leads, search, filterStatus, filterTag]);

  const { page, setPage, totalPages, totalCount, pageSize, paginatedItems } = useAdminPagination(filteredLeads);

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const categorisedFu = useMemo(() => {
    const pending = followUps.filter((f) => !f.isDone);
    const overdue  = pending.filter((f) => f.followUpDate && new Date(f.followUpDate) < todayStart);
    const today    = pending.filter((f) => {
      if (!f.followUpDate) return false;
      const d = new Date(f.followUpDate);
      return d >= todayStart && d <= todayEnd;
    });
    const upcoming = pending.filter((f) => f.followUpDate && new Date(f.followUpDate) > todayEnd);
    const done     = followUps.filter((f) => f.isDone);
    return { overdue, today, upcoming, done, all: followUps };
  }, [followUps, todayStart, todayEnd]);

  const displayedFu: FollowUp[] = (() => {
    switch (fuFilter) {
      case "overdue":  return categorisedFu.overdue;
      case "today":    return categorisedFu.today;
      case "upcoming": return categorisedFu.upcoming;
      case "done":     return categorisedFu.done;
      default:         return categorisedFu.all;
    }
  })();

  const stats = useMemo(() => {
    const total     = leads.length;
    const byStatus  = Object.fromEntries(leadStatuses.map((s) => [s.value, leads.filter((l) => l.status === s.value).length]));
    return {
      total, byStatus,
      pendingFollowUps:  categorisedFu.overdue.length + categorisedFu.today.length + categorisedFu.upcoming.length,
      overdueFollowUps:  categorisedFu.overdue.length,
      todayFollowUps:    categorisedFu.today.length,
      conversionRate:    total > 0 ? Math.round((byStatus.converted / total) * 100) : 0,
      repeatCustomers:   leads.filter((l) => l.isRepeatCustomer).length,
    };
  }, [leads, categorisedFu]);

  const selectedLead = useMemo(() => leads.find((l) => l.id === selectedLeadId), [leads, selectedLeadId]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveLeadMutation = useMutation({
    mutationFn: (data: LeadForm) => {
      const parsedValue = data.estimatedValue
        ? parseInt(data.estimatedValue.replace(/\D/g, ""), 10)
        : null;
      const payload = { ...data, estimatedValue: parsedValue !== null && !isNaN(parsedValue) ? parsedValue : null };
      return editLeadId
        ? apiFetch(`/api/admin/crm/leads/${editLeadId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : apiFetch("/api/admin/crm/leads", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
      toast.success(editLeadId ? "Lead diperbarui" : "Lead ditambahkan");
      setLeadDialogOpen(false); setEditLeadId(null); setLeadForm(defaultLeadForm);
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
    mutationFn: (data: typeof defaultFollowUpForm) =>
      apiFetch(`/api/admin/crm/leads/${data.leadId}/follow-ups`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_follow_ups"] });
      queryClient.invalidateQueries({ queryKey: ["crm_lead_followups", selectedLeadId] });
      toast.success("Follow-up dijadwalkan");
      setFollowUpDialogOpen(false); setFollowUpForm(makeDefaultFollowUpForm());
    },
    onError: () => toast.error("Gagal menjadwalkan follow-up"),
  });

  const toggleFollowUpDone = useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) =>
      apiFetch(`/api/admin/crm/follow-ups/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDone, doneAt: isDone ? new Date().toISOString() : null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_follow_ups"] });
      queryClient.invalidateQueries({ queryKey: ["crm_lead_followups", selectedLeadId] });
    },
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
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] }); // refresh lastInteractionAt
      toast.success("Interaksi dicatat");
      setInteractionForm({ type: "call", summary: "", outcome: "" });
    },
    onError: () => toast.error("Gagal mencatat interaksi"),
  });

  const detectRepeatMutation = useMutation({
    mutationFn: () => apiFetch<{ detected: number }>("/api/admin/crm/repeat-customers"),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
      toast.success(`Ditemukan ${res.detected} repeat customer dari data jemaah`);
    },
    onError: () => toast.error("Gagal mendeteksi repeat customer"),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  const handleEditLead = (l: Lead) => {
    setEditLeadId(l.id);
    setLeadForm({
      name: l.name, phone: l.phone || "", email: l.email || "",
      source: l.source || "Website", status: l.status,
      packageInterest: l.packageInterest || "", notes: l.notes || "",
      tags: l.tags ?? [], estimatedValue: l.estimatedValue?.toString() ?? "",
    });
    setLeadDialogOpen(true);
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !leadForm.tags.includes(t)) setLeadForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };
  const removeTag = (tag: string) => setLeadForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  const getFollowUpUrgency = (date: string | null, isDone: boolean) => {
    if (isDone || !date) return "";
    if (isPast(new Date(date)) && !isToday(new Date(date))) return "text-destructive font-bold";
    if (isToday(new Date(date))) return "text-amber-600 font-semibold";
    return "";
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> CRM & Pipeline Leads
          </h1>
          <p className="text-muted-foreground text-sm">Tracking calon jemaah dari interest hingga booking</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            onClick={() => detectRepeatMutation.mutate()}
            disabled={detectRepeatMutation.isPending}
          >
            <Repeat2 className="w-4 h-4 mr-1.5" />
            {detectRepeatMutation.isPending ? "Mendeteksi..." : "Deteksi Repeat Customer"}
          </Button>

          {/* Schedule Follow-up */}
          <Dialog open={followUpDialogOpen} onOpenChange={(o) => { setFollowUpDialogOpen(o); if (!o) setFollowUpForm(makeDefaultFollowUpForm()); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-1.5" /> Follow-up
                {stats.overdueFollowUps > 0 && (
                  <span className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5">{stats.overdueFollowUps}</span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Jadwalkan Follow-up</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveFollowUpMutation.mutate(followUpForm); }} className="space-y-4">
                <div>
                  <Label>Lead</Label>
                  <Select value={followUpForm.leadId} onValueChange={(v) => setFollowUpForm((f) => ({ ...f, leadId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pilih lead" /></SelectTrigger>
                    <SelectContent>
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name} {l.phone ? `(${l.phone})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tanggal & Waktu</Label>
                    <Input type="datetime-local" value={followUpForm.followUpDate}
                      onChange={(e) => setFollowUpForm((f) => ({ ...f, followUpDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Tipe</Label>
                    <Select value={followUpForm.type} onValueChange={(v) => setFollowUpForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{followUpTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Catatan</Label>
                  <Textarea value={followUpForm.notes} onChange={(e) => setFollowUpForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Topik yang akan dibahas..." />
                </div>
                <Button type="submit" className="w-full" disabled={saveFollowUpMutation.isPending || !followUpForm.leadId}>Jadwalkan</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Lead */}
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
                        {tag}<button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                      placeholder="Ketik tag + Enter" className="text-sm" />
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {leadStatuses.map((s) => (
          <Card key={s.value} className="cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => { setFilterStatus(s.value); setActiveTab("leads"); }}>
            <CardContent className="pt-3 pb-2 px-3">
              <Badge variant="outline" className={`text-[10px] mb-1 ${s.color}`}>{s.label}</Badge>
              <p className="text-2xl font-bold">{stats.byStatus[s.value] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="col-span-1">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center gap-1 text-violet-600 text-[10px] mb-1">
              <Repeat2 className="w-3 h-3" /> Repeat
            </div>
            <p className="text-2xl font-bold">{stats.repeatCustomers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up alerts row */}
      {(stats.overdueFollowUps > 0 || stats.todayFollowUps > 0) && (
        <div className="flex gap-3 flex-wrap">
          {stats.overdueFollowUps > 0 && (
            <button onClick={() => { setActiveTab("follow-ups"); setFuFilter("overdue"); }}
              className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors">
              <AlertTriangle className="w-4 h-4" />
              {stats.overdueFollowUps} follow-up overdue
            </button>
          )}
          {stats.todayFollowUps > 0 && (
            <button onClick={() => { setActiveTab("follow-ups"); setFuFilter("today"); }}
              className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors">
              <CalendarClock className="w-4 h-4" />
              {stats.todayFollowUps} follow-up hari ini
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { key: "leads",      label: "Daftar Lead", icon: Users },
          { key: "pipeline",   label: "Pipeline",    icon: Kanban },
          { key: "follow-ups", label: "Follow-up",   icon: Bell },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-4 h-4" />
            {label}
            {key === "follow-ups" && stats.overdueFollowUps > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5">{stats.overdueFollowUps}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─────────────────── LEADS TAB ─────────────────── */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nama, telepon, email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44">
                <Filter className="w-4 h-4 mr-1.5 text-muted-foreground" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {leadStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {allTags.length > 0 && (
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-40">
                  <Tag className="w-4 h-4 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Filter tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tag</SelectItem>
                  {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Table */}
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
                      (paginatedItems as Lead[]).map((l) => {
                        const sInfo = getStatusInfo(l.status);
                        const staleDays = getStaleness(l.lastInteractionAt, l.createdAt);
                        return (
                          <TableRow key={l.id} className={selectedLeadId === l.id ? "bg-primary/5" : ""}>
                            <TableCell>
                              <button onClick={() => setSelectedLeadId(selectedLeadId === l.id ? null : l.id)}
                                className="font-semibold hover:text-primary transition-colors text-left">
                                {l.name}
                              </button>
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                {l.isRepeatCustomer && <RepeatBadge />}
                                <StalenessBadge days={staleDays} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm space-y-0.5">
                                {l.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" />{l.phone}</div>}
                                {l.email && <div className="flex items-center gap-1 truncate max-w-[150px]"><Mail className="w-3 h-3 text-muted-foreground" />{l.email}</div>}
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{l.source || "-"}</Badge></TableCell>
                            <TableCell className="max-w-[120px] truncate text-sm">{l.packageInterest || "-"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(l.tags ?? []).slice(0, 2).map((tag) => (
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
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Riwayat Interaksi"
                                  onClick={() => { setSelectedLeadId(selectedLeadId === l.id ? null : l.id); setDetailTab("interactions"); }}>
                                  <History className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Follow-up"
                                  onClick={() => { setFollowUpForm({ ...makeDefaultFollowUpForm(), leadId: l.id }); setFollowUpDialogOpen(true); }}>
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

          {/* ── Lead Detail Panel ── */}
          {selectedLead && (
            <Card className="border-primary/20">
              <CardHeader className="pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {selectedLead.name}
                      {selectedLead.isRepeatCustomer && <RepeatBadge />}
                    </CardTitle>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                      {selectedLead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedLead.phone}</span>}
                      {selectedLead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedLead.email}</span>}
                      {selectedLead.packageInterest && <span>📦 {selectedLead.packageInterest}</span>}
                      {selectedLead.estimatedValue && (
                        <span className="text-success font-medium">
                          Rp {Number(selectedLead.estimatedValue).toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const days = getStaleness(selectedLead.lastInteractionAt, selectedLead.createdAt);
                      return days !== null && days >= 7 ? (
                        <p className="text-xs text-amber-600 mt-1">
                          ⏱ Terakhir interaksi: {days} hari yang lalu
                        </p>
                      ) : null;
                    })()}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedLeadId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Detail sub-tabs */}
                <div className="flex gap-1 mt-3">
                  {(["interactions", "followups"] as const).map((t) => (
                    <button key={t} onClick={() => setDetailTab(t)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${detailTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                      {t === "interactions" ? (
                        <span className="flex items-center gap-1"><History className="w-3 h-3" /> Riwayat Interaksi</span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Bell className="w-3 h-3" /> Follow-up
                          {leadFollowUps.filter((f) => !f.isDone).length > 0 && (
                            <span className="bg-primary/20 text-primary rounded-full px-1 text-[10px]">
                              {leadFollowUps.filter((f) => !f.isDone).length}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Interactions sub-tab */}
                {detailTab === "interactions" && (
                  <>
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
                      <Textarea rows={2} placeholder="Ringkasan percakapan / catatan..."
                        value={interactionForm.summary}
                        onChange={(e) => setInteractionForm((f) => ({ ...f, summary: e.target.value }))}
                        className="text-sm" />
                      <Button size="sm" disabled={!interactionForm.summary || addInteractionMutation.isPending}
                        onClick={() => addInteractionMutation.mutate(interactionForm)}>
                        Simpan Interaksi
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {interactionsLoading ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Memuat riwayat...</p>
                      ) : interactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat interaksi</p>
                      ) : (
                        interactions.map((item: any) => (
                          <div key={item.id} className="flex gap-3 text-sm">
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{interactionTypes.find((t) => t.value === item.type)?.label ?? item.type}</span>
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
                  </>
                )}

                {/* Follow-ups sub-tab */}
                {detailTab === "followups" && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline"
                        onClick={() => { setFollowUpForm({ ...makeDefaultFollowUpForm(), leadId: selectedLead.id }); setFollowUpDialogOpen(true); }}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Jadwalkan Follow-up
                      </Button>
                    </div>
                    {leadFuLoading ? (
                      <p className="text-sm text-center text-muted-foreground py-4">Memuat...</p>
                    ) : leadFollowUps.length === 0 ? (
                      <p className="text-sm text-center text-muted-foreground py-4">Belum ada follow-up untuk lead ini</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {leadFollowUps.map((fu) => {
                          const typeInfo = followUpTypes.find((t) => t.value === fu.type);
                          const Icon = typeInfo?.icon ?? Clock;
                          return (
                            <div key={fu.id} className={`flex items-start gap-3 p-2 rounded-lg border ${fu.isDone ? "opacity-50 bg-muted/20" : "bg-card"}`}>
                              <Checkbox checked={fu.isDone}
                                onCheckedChange={(c) => toggleFollowUpDone.mutate({ id: fu.id, isDone: !!c })}
                                className="mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{typeInfo?.label ?? fu.type}</span>
                                  {fu.followUpDate && (
                                    <span className={`text-xs ${getFollowUpUrgency(fu.followUpDate, fu.isDone)}`}>
                                      {format(new Date(fu.followUpDate), "dd MMM yyyy HH:mm", { locale: localeId })}
                                      {!fu.isDone && fu.followUpDate && isPast(new Date(fu.followUpDate)) && !isToday(new Date(fu.followUpDate)) && " ⚠️"}
                                      {!fu.isDone && fu.followUpDate && isToday(new Date(fu.followUpDate)) && " 📌"}
                                    </span>
                                  )}
                                </div>
                                {fu.notes && <p className="text-xs text-muted-foreground mt-0.5">{fu.notes}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─────────────────── PIPELINE TAB ─────────────────── */}
      {activeTab === "pipeline" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {leadStatuses.map((col) => {
              const colLeads = leads.filter((l) => l.status === col.value);
              const totalValue = colLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
              return (
                <div key={col.value} className={`w-72 rounded-xl border p-3 space-y-2 ${col.cardBg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className={`text-xs ${col.color}`}>{col.label}</Badge>
                    <span className="text-xs text-muted-foreground font-medium">{colLeads.length}</span>
                  </div>
                  {totalValue > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Est: Rp {totalValue.toLocaleString("id-ID")}
                    </p>
                  )}
                  {colLeads.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground opacity-60">Tidak ada lead</div>
                  ) : (
                    colLeads.map((l) => {
                      const staleDays = getStaleness(l.lastInteractionAt, l.createdAt);
                      return (
                        <div key={l.id}
                          className="bg-card border rounded-lg p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer"
                          onClick={() => { setSelectedLeadId(l.id); setActiveTab("leads"); }}>
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-semibold text-sm">{l.name}</span>
                            <div className="flex gap-1 shrink-0">
                              {l.isRepeatCustomer && <Repeat2 className="w-3.5 h-3.5 text-violet-500" aria-label="Repeat Customer" />}
                              {staleDays !== null && staleDays >= 14 && <Flame className="w-3.5 h-3.5 text-amber-500" aria-label={`${staleDays} hari tanpa kontak`} />}
                            </div>
                          </div>
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
                            <div className="text-xs font-medium text-success">Rp {Number(l.estimatedValue).toLocaleString("id-ID")}</div>
                          )}
                          <div className="flex gap-1 pt-1 border-t border-border/50">
                            {leadStatuses.filter((s) => s.value !== l.status).slice(0, 3).map((target) => (
                              <button key={target.value}
                                onClick={(e) => { e.stopPropagation(); moveStatusMutation.mutate({ id: l.id, status: target.value }); }}
                                className="flex-1 text-[10px] text-muted-foreground hover:text-primary transition-colors truncate text-center"
                                title={`Pindah ke ${target.label}`}>
                                → {target.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────── FOLLOW-UPS TAB ─────────────────── */}
      {activeTab === "follow-ups" && (
        <div className="space-y-4">
          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap">
            {([
              { key: "all",      label: `Semua (${categorisedFu.all.length})`,               cls: "" },
              { key: "overdue",  label: `⚠️ Overdue (${categorisedFu.overdue.length})`,       cls: categorisedFu.overdue.length > 0 ? "border-destructive text-destructive" : "" },
              { key: "today",    label: `📌 Hari Ini (${categorisedFu.today.length})`,        cls: categorisedFu.today.length > 0 ? "border-amber-500 text-amber-700" : "" },
              { key: "upcoming", label: `📅 Mendatang (${categorisedFu.upcoming.length})`,    cls: "" },
              { key: "done",     label: `✅ Selesai (${categorisedFu.done.length})`,           cls: "" },
            ] as { key: typeof fuFilter; label: string; cls: string }[]).map(({ key, label, cls }) => (
              <button key={key} onClick={() => setFuFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${fuFilter === key ? "bg-primary text-primary-foreground border-primary" : `border-border text-muted-foreground hover:border-foreground ${cls}`}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Grouped sections when showing all */}
          {fuFilter === "all" ? (
            <div className="space-y-6">
              {categorisedFu.overdue.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-destructive flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4" /> Overdue ({categorisedFu.overdue.length})
                  </h3>
                  <FollowUpTable followUps={categorisedFu.overdue} onToggle={(id, isDone) => toggleFollowUpDone.mutate({ id, isDone })} />
                </section>
              )}
              {categorisedFu.today.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                    <CalendarClock className="w-4 h-4" /> Hari Ini ({categorisedFu.today.length})
                  </h3>
                  <FollowUpTable followUps={categorisedFu.today} onToggle={(id, isDone) => toggleFollowUpDone.mutate({ id, isDone })} />
                </section>
              )}
              {categorisedFu.upcoming.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <CalendarCheck2 className="w-4 h-4" /> Mendatang ({categorisedFu.upcoming.length})
                  </h3>
                  <FollowUpTable followUps={categorisedFu.upcoming} onToggle={(id, isDone) => toggleFollowUpDone.mutate({ id, isDone })} />
                </section>
              )}
              {categorisedFu.done.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-4 h-4" /> Selesai ({categorisedFu.done.length})
                  </h3>
                  <FollowUpTable followUps={categorisedFu.done} onToggle={(id, isDone) => toggleFollowUpDone.mutate({ id, isDone })} dim />
                </section>
              )}
              {categorisedFu.all.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Belum ada follow-up. Jadwalkan dari daftar lead.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {followUpsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Memuat...</div>
              ) : displayedFu.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Tidak ada follow-up di kategori ini</div>
              ) : (
                <FollowUpTable
                  followUps={displayedFu}
                  onToggle={(id, isDone) => toggleFollowUpDone.mutate({ id, isDone })}
                  dim={fuFilter === "done"}
                />
              )}
            </>
          )}
        </div>
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

// ─── FollowUpTable sub-component ─────────────────────────────────────────────

const FollowUpTable = ({
  followUps,
  onToggle,
  dim = false,
}: {
  followUps: FollowUp[];
  onToggle: (id: string, isDone: boolean) => void;
  dim?: boolean;
}) => (
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
            {followUps.map((f) => {
              const typeInfo = followUpTypes.find((t) => t.value === f.type);
              const Icon = typeInfo?.icon ?? Clock;
              const urgency = (() => {
                if (f.isDone || !f.followUpDate) return "";
                const d = new Date(f.followUpDate);
                if (isPast(d) && !isToday(d)) return "text-destructive font-bold";
                if (isToday(d)) return "text-amber-600 font-semibold";
                return "";
              })();
              return (
                <TableRow key={f.id} className={dim ? "opacity-50" : ""}>
                  <TableCell>
                    <Checkbox checked={f.isDone} onCheckedChange={(c) => onToggle(f.id, !!c)} />
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{f.leadName || "-"}</div>
                    {f.leadPhone && <span className="text-xs text-muted-foreground">{f.leadPhone}</span>}
                    {f.leadStatus && (
                      <div className="mt-0.5">
                        <Badge variant="outline" className={`text-[10px] ${getStatusInfo(f.leadStatus)?.color ?? ""}`}>
                          {getStatusInfo(f.leadStatus)?.label ?? f.leadStatus}
                        </Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{typeInfo?.label ?? f.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className={urgency || "text-sm"}>
                    {f.followUpDate ? format(new Date(f.followUpDate), "dd MMM yyyy HH:mm", { locale: localeId }) : "-"}
                    {!f.isDone && f.followUpDate && isPast(new Date(f.followUpDate)) && !isToday(new Date(f.followUpDate)) && (
                      <span className="ml-1.5 text-xs">⚠️ Overdue</span>
                    )}
                    {!f.isDone && f.followUpDate && isToday(new Date(f.followUpDate)) && (
                      <span className="ml-1.5 text-xs">📌 Hari ini</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{f.notes || "-"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

export default AdminCRM;
