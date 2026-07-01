import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";

interface ErrorLog {
  id: string;
  level: string;
  message: string;
  stack: string | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
}

const AdminErrorLogs = () => {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs((data as ErrorLog[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const clearAll = async () => {
    if (!confirm("Hapus semua log error?")) return;
    await supabase.from("error_logs").delete().gte("created_at", "1970-01-01");
    toast({ title: "Log dihapus" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Error Tracking</h1>
        <Button variant="outline" size="sm" onClick={clearAll}>
          <Trash2 className="w-4 h-4 mr-1" /> Bersihkan
        </Button>
      </div>

      {loading ? (
        <p>Memuat…</p>
      ) : logs.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Tidak ada error tercatat.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant={log.level === "error" ? "destructive" : "secondary"}>{log.level}</Badge>
                  <span className="text-muted-foreground font-normal text-xs">
                    {format(new Date(log.created_at), "dd MMM yyyy HH:mm:ss")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{log.message}</p>
                {log.url && <p className="text-xs text-muted-foreground truncate">{log.url}</p>}
                {log.stack && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Stack trace</summary>
                    <pre className="mt-1 whitespace-pre-wrap bg-muted p-2 rounded">{log.stack}</pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminErrorLogs;
