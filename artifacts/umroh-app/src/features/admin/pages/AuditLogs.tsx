import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Loader2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const AuditLogs = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (search) q = q.ilike("action", `%${search}%`);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to + "T23:59:59");
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Audit Logs</h1></div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Cari aksi..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button onClick={load}>Terapkan</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Waktu</TableHead><TableHead>Aksi</TableHead>
                <TableHead>Entitas</TableHead><TableHead>User ID</TableHead><TableHead>Metadata</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Tidak ada log</TableCell></TableRow>
                ) : items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at), "dd MMM HH:mm:ss", { locale: localeId })}</TableCell>
                    <TableCell className="text-sm font-medium">{l.action}</TableCell>
                    <TableCell className="text-xs">{l.entity_type}{l.entity_id ? ` · ${l.entity_id.slice(0, 8)}…` : ""}</TableCell>
                    <TableCell className="font-mono text-xs">{l.user_id ? l.user_id.slice(0, 8) + "…" : "-"}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{l.metadata ? JSON.stringify(l.metadata) : "-"}</TableCell>
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

export default AuditLogs;
