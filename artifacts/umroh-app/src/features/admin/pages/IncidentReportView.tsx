import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ShieldAlert, ClipboardCopy, Check, Clock } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { format } from "date-fns";

interface IncidentReportResponse {
  report: string;
  createdAt: number;
  expiresAt: number;
}

const IncidentReportView = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<IncidentReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    apiFetch<IncidentReportResponse>(`/api/admin/incident-reports/${id}`)
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const copy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Disalin ke clipboard" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Incident Report</h1>
        </div>
        {data && (
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <ClipboardCopy className="w-4 h-4 mr-1" />}
            {copied ? "Tersalin!" : "Copy"}
          </Button>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Report tidak ditemukan atau sudah kadaluarsa (link berlaku 24 jam sejak dibuat).
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Dibuat: {format(new Date(data.createdAt), "d MMM yyyy HH:mm:ss")} — Kadaluarsa: {format(new Date(data.expiresAt), "d MMM yyyy HH:mm:ss")}
          </p>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Isi Report</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded whitespace-pre-wrap overflow-x-auto">
                {data.report}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default IncidentReportView;
