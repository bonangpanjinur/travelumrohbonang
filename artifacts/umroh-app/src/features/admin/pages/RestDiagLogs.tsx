import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/components/ui/select";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Pause, Play, Trash2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Live REST Diagnostics</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={live ? "default" : "outline"} size="sm" onClick={() => setLive((v) => !v)}>
            {live ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {live ? "Pause" : "Resume"}
          </Button>
          <Button variant="outline" size="sm" onClick={clear}>
            <Trash2 className="w-4 h-4 mr-1" /> Bersihkan Tampilan
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
