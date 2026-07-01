import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Eye, Download, RefreshCw, Search, ShieldCheck } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import ErrorAlert from "@/components/ui/error-alert";
import AdminPagination from "@/admin/components/AdminPagination";
import { useAdminPagination } from "@/admin/hooks/useAdminPagination";
import { exportToCsv } from "@/shared/lib/exportCsv";

interface AccessLog {
  id: string;
  user_id: string | null;
  proof_path: string;
  context: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  profile?: { name: string | null; email: string | null } | null;
}

const CONTEXT_OPTIONS = [
  { value: "all", label: "Semua konteks" },
  { value: "admin/payments", label: "Admin · Pembayaran" },
  { value: "admin/template-upgrades", label: "Admin · Upgrade Template" },
  { value: "my-upgrades", label: "User · My Upgrades" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);
const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const PaymentProofAccessLogs = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState<string>(isoDaysAgo(30));
  const [to, setTo] = useState<string>(todayIso());
  const [contextFilter, setContextFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("payment_proof_access_logs")
        .select("id, user_id, proof_path, context, ip, user_agent, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (from) q = q.gte("created_at", `${from}T00:00:00`);
      if (to) q = q.lte("created_at", `${to}T23:59:59`);
      if (contextFilter !== "all") q = q.eq("context", contextFilter);

      const { data, error: e1 } = await q;
      if (e1) throw e1;

      // Fetch user profile names in a second query
      const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean))) as string[];
      let profilesMap = new Map<string, { name: string | null; email: string | null }>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);
        (profs || []).forEach((p: any) => profilesMap.set(p.id, { name: p.name, email: p.email }));
      }

      const merged = (data || []).map((r: any) => ({
        ...r,
        profile: r.user_id ? profilesMap.get(r.user_id) || null : null,
      })) as AccessLog[];
      setLogs(merged);
    } catch (e: any) {
      setError(e.message || "Gagal memuat histori akses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, contextFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const s = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.proof_path.toLowerCase().includes(s) ||
        (l.profile?.name || "").toLowerCase().includes(s) ||
        (l.profile?.email || "").toLowerCase().includes(s)
    );
  }, [logs, search]);

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } =
    useAdminPagination(filtered);

  useEffect(() => { resetPage(); }, [search, contextFilter, from, to]);

  const handleExport = () => {
    const headers = ["Tanggal", "Nama", "Email", "Konteks", "Path Bukti", "User Agent"];
    const rows = filtered.map((l) => [
      format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss"),
      l.profile?.name || "-",
      l.profile?.email || "-",
      l.context || "-",
      l.proof_path,
      l.user_agent || "-",
    ]);
    exportToCsv("payment-proof-access-logs", headers, rows);
  };

  const contextBadge = (ctx: string | null) => {
    const found = CONTEXT_OPTIONS.find((c) => c.value === ctx);
    if (!ctx) return <Badge variant="outline">-</Badge>;
    return <Badge variant="secondary" className="text-xs">{found?.label || ctx}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Histori Akses Bukti Transfer
          </h1>
          <p className="text-sm text-muted-foreground">
            Pelacakan siapa dan kapan membuka file bukti pembayaran (private storage).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-card border border-border rounded-lg">
        <div>
          <Label className="text-xs">Dari tanggal</Label>
          <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Sampai tanggal</Label>
          <Input type="date" value={to} min={from || undefined} max={todayIso()} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Konteks</Label>
          <Select value={contextFilter} onValueChange={setContextFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTEXT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Pencarian</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Nama, email, atau path…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorAlert message={error} onRetry={fetchLogs} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="Belum Ada Akses"
          description="Tidak ada akses bukti transfer pada filter yang dipilih."
        />
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Pengakses</TableHead>
                    <TableHead>Konteks</TableHead>
                    <TableHead>Path Bukti</TableHead>
                    <TableHead className="hidden lg:table-cell">User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), "d MMM yyyy HH:mm:ss", { locale: localeId })}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{log.profile?.name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{log.profile?.email || log.user_id || "-"}</div>
                      </TableCell>
                      <TableCell>{contextBadge(log.context)}</TableCell>
                      <TableCell className="font-mono text-xs break-all max-w-xs">{log.proof_path}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground truncate max-w-xs" title={log.user_agent || ""}>
                        {log.user_agent || "-"}
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

export default PaymentProofAccessLogs;
