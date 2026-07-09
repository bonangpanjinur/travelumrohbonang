import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/components/ui/select";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Pause, Play, Trash2, ShieldAlert, ClipboardCopy, Check, EyeOff, Download, Link2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/shared/hooks/use-toast";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const UUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;

function redactText(input: string): string {
  return input.replace(EMAIL_REGEX, "[REDACTED_EMAIL]").replace(UUID_REGEX, "[REDACTED_ID]");
}

interface DiagLogEntry {
  id: number;
  timestamp: string;
  method: string;
  table: string;
  stage: string;
  authenticated: boolean;
  userId: string | null;
  role: string | null;
  backend?: string;
  httpStatus?: number;
  error?: string;
  extra?: Record<string, unknown>;
}

interface HealthDetail {
  status: string;
  timestamp: string;
  nodeVersion?: string;
  nodeEnv?: string;
  uptimeSeconds?: number;
  isVercel?: boolean;
  allowedOrigins?: string[];
  checks?: Record<string, unknown>;
}

const METHODS = ["GET", "POST", "PATCH", "DELETE"];

function stageVariant(stage: string): "default" | "destructive" | "secondary" | "outline" {
  if (stage.startsWith("rejected")) return "secondary";
  if (stage.includes("exception") || stage.includes("error")) return "destructive";
  if (stage.includes("response")) return "default";
  return "outline";
}

const RestDiagLogs = () => {
  const [logs, setLogs] = useState<DiagLogEntry[]>([]);
  const [method, setMethod] = useState<string>("all");
  const [table, setTable] = useState("");
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [justShared, setJustShared] = useState(false);
  const [redact, setRedact] = useState(true);
  const { toast } = useToast();

  const lastIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async (reset = false) => {
    try {
      const params = new URLSearchParams();
      if (!reset) params.set("sinceId", String(lastIdRef.current));
      if (method !== "all") params.set("method", method);
      if (table.trim()) params.set("table", table.trim());
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", "200");

      const data = await apiFetch<DiagLogEntry[]>(`/api/admin/logs/rest-diag?${params.toString()}`);

      if (reset) {
        setLogs(data);
      } else if (data.length) {
        setLogs((prev) => [...prev, ...data].slice(-500));
      }
      if (data.length) lastIdRef.current = data[data.length - 1].id;
    } catch (e) {
      console.error(e);
    }
  };

  // Reset + refetch whenever a filter changes
  useEffect(() => {
    lastIdRef.current = 0;
    fetchLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, table, query]);

  // Poll for new entries while "live" is on
  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => fetchLogs(false), 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, method, table, query]);

  useEffect(() => {
    if (live) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, live]);

  const clear = () => {
    setLogs([]);
    lastIdRef.current = lastIdRef.current; // keep sinceId so cleared entries don't reappear
  };

  const buildIncidentReport = async (): Promise<string> => {
    const health = await apiFetch<HealthDetail>("/api/health/detail").catch((e) => ({
      status: "unreachable",
      timestamp: new Date().toISOString(),
      error: String(e),
    })) as HealthDetail & { error?: string };

    const filterSummary = [
      method !== "all" ? `method=${method}` : null,
      table.trim() ? `table=${table.trim()}` : null,
      query.trim() ? `q="${query.trim()}"` : null,
    ].filter(Boolean).join(", ") || "(tidak ada filter)";

    const lines: string[] = [];
    lines.push("# Incident Report — Umroh App API");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Filter aktif: ${filterSummary}`);
    lines.push(`Jumlah log ditampilkan: ${logs.length}`);
    if (redact) lines.push(`Redaksi: AKTIF (email & UUID/user id disamarkan)`);
    lines.push("");
    lines.push("## Health Snapshot (/api/health/detail)");
    lines.push("```json");
    lines.push(JSON.stringify(health, null, 2));
    lines.push("```");
    lines.push("");
    lines.push(`## REST Diagnostic Logs (${logs.length} entri, sesuai filter di atas)`);
    lines.push("```");
    if (logs.length === 0) {
      lines.push("(tidak ada log pada filter saat ini)");
    } else {
      for (const log of logs) {
        const parts = [
          log.timestamp,
          `${log.method} /${log.table}`,
          `stage=${log.stage}`,
          log.httpStatus ? `status=${log.httpStatus}` : null,
          log.backend ? `backend=${log.backend}` : null,
          `auth=${log.authenticated}`,
          log.role ? `role=${log.role}` : null,
          log.userId ? `userId=${redact ? "[REDACTED_ID]" : log.userId}` : null,
          log.error ? `error=${log.error}` : null,
        ].filter(Boolean);
        lines.push(parts.join(" | "));
        if (log.extra && Object.keys(log.extra).length) {
          lines.push(`  extra: ${JSON.stringify(log.extra)}`);
        }
      }
    }
    lines.push("```");

    let report = lines.join("\n");
    if (redact) report = redactText(report);
    return report;
  };

  const copyIncidentReport = async () => {
    setCopying(true);
    try {
      const report = await buildIncidentReport();
      await navigator.clipboard.writeText(report);

      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
      toast({ title: "Incident report disalin ke clipboard" });
    } catch (e) {
      toast({ title: "Gagal membuat incident report", description: String(e), variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  const downloadIncidentReport = async () => {
    setDownloading(true);
    try {
      const report = await buildIncidentReport();
      const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = format(new Date(), "yyyyMMdd-HHmmss");
      a.href = url;
      a.download = `incident-report-${stamp}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Incident report berhasil diunduh" });
    } catch (e) {
      toast({ title: "Gagal mengunduh incident report", description: String(e), variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const shareIncidentLink = async () => {
    setSharing(true);
    try {
      const report = await buildIncidentReport();
      const res = await apiFetch<{ id: string; expiresAt: number }>("/api/admin/incident-reports", {
        method: "POST",
        body: JSON.stringify({ report }),
      });
      const link = `${window.location.origin}/admin/incident-reports/${res.id}`;
      await navigator.clipboard.writeText(link);

      setJustShared(true);
      setTimeout(() => setJustShared(false), 2500);
      const hours = Math.round((res.expiresAt - Date.now()) / 3600000);
      toast({ title: "Link disalin ke clipboard", description: `Link kadaluarsa dalam ~${hours} jam. Hanya bisa dibuka oleh admin yang login.` });
    } catch (e) {
      toast({ title: "Gagal membuat share link", description: String(e), variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Live REST Diagnostics</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant={live ? "default" : "outline"} size="sm" onClick={() => setLive((v) => !v)}>
            {live ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {live ? "Pause" : "Resume"}
          </Button>
          <Button variant="outline" size="sm" onClick={clear}>
            <Trash2 className="w-4 h-4 mr-1" /> Bersihkan Tampilan
          </Button>
          <div className="flex items-center gap-1.5 pl-1">
            <Switch id="redact-toggle" checked={redact} onCheckedChange={setRedact} />
            <Label htmlFor="redact-toggle" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
              <EyeOff className="w-3.5 h-3.5" /> Redact
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={copyIncidentReport} disabled={copying}>
            {justCopied ? (
              <Check className="w-4 h-4 mr-1 text-green-600" />
            ) : (
              <ClipboardCopy className="w-4 h-4 mr-1" />
            )}
            {copying ? "Menyalin..." : justCopied ? "Tersalin!" : "Copy Incident Report"}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadIncidentReport} disabled={downloading}>
            <Download className="w-4 h-4 mr-1" />
            {downloading ? "Mengunduh..." : "Download as File"}
          </Button>
          <Button variant="outline" size="sm" onClick={shareIncidentLink} disabled={sharing}>
            {justShared ? (
              <Check className="w-4 h-4 mr-1 text-green-600" />
            ) : (
              <Link2 className="w-4 h-4 mr-1" />
            )}
            {sharing ? "Membuat link..." : justShared ? "Link tersalin!" : "Share Incident Link"}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Menampilkan log <code>[REST-DIAG]</code> secara real-time dari proses server yang sedang
        berjalan (bukan histori penuh — hanya entri yang terlihat oleh instance ini, sama seperti
        di log Vercel/console).
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Method</SelectItem>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Nama tabel (e.g. bookings)" value={table} onChange={(e) => setTable(e.target.value)} />
            <Input placeholder="Cari (user id, error, stage...)" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Badge variant="outline" className="flex items-center justify-center">
              {logs.length} entri
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]">
            <div className="divide-y">
              {logs.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Belum ada log. Lakukan request ke /rest/v1/* untuk melihat entri di sini.
                </div>
              ) : (
                logs.map((log) => (
                  <button
                    key={log.id}
                    className="w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors"
                    onClick={() => setExpanded((prev) => (prev === log.id ? null : log.id))}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-mono whitespace-nowrap">
                        {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                      </span>
                      <Badge variant="outline" className="font-mono">{log.method}</Badge>
                      <span className="font-medium">/{log.table}</span>
                      <Badge variant={stageVariant(log.stage)}>{log.stage}</Badge>
                      {log.httpStatus && (
                        <Badge variant={log.httpStatus >= 400 ? "destructive" : "default"}>
                          {log.httpStatus}
                        </Badge>
                      )}
                      {log.backend && (
                        <span className="text-muted-foreground">{log.backend}</span>
                      )}
                      {!log.authenticated && <span className="text-muted-foreground">unauth</span>}
                      {log.role && <span className="text-muted-foreground">role={log.role}</span>}
                    </div>
                    {log.error && (
                      <p className="text-xs text-destructive mt-1 truncate">{log.error}</p>
                    )}
                    {expanded === log.id && (
                      <pre className="mt-2 text-xs bg-muted p-2 rounded whitespace-pre-wrap">
                        {JSON.stringify(log.extra, null, 2)}
                      </pre>
                    )}
                  </button>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestDiagLogs;
