import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Database, Ticket, AlertTriangle, RefreshCw, KeyRound } from "lucide-react";
import { useSystemHealth } from "../hooks/useSystemHealth";

const AdminSystemHealth = () => {
  const { data, loading, error, refresh } = useSystemHealth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kesehatan Sistem</h1>
          <p className="text-muted-foreground text-sm">
            Ringkasan status koneksi database, autentikasi, dan performa API.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-3 text-red-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard
          icon={Database}
          title="Koneksi Database"
          loading={loading}
          statusOk={data?.database.status === "ok"}
          okLabel={data?.database.latencyMs != null ? `Online • ${data.database.latencyMs} ms` : "Online"}
          badLabel={data?.database.error ?? "Tidak dapat terhubung"}
        />
        <StatusCard
          icon={KeyRound}
          title="Autentikasi Supabase"
          loading={loading}
          statusOk={data?.supabaseAuth.configured === true}
          okLabel="Terkonfigurasi"
          badLabel="Secret belum diisi"
        />
        <StatusCard
          icon={AlertTriangle}
          title="Error Rate API"
          loading={loading}
          statusOk={(data?.api.errorRate ?? 0) < 5}
          okLabel={data ? `${data.api.errorRate}% dari ${data.api.totalRequests} request` : "-"}
          badLabel={data ? `${data.api.errorRate}% dari ${data.api.totalRequests} request` : "-"}
          neutral
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4" /> Booking
            </CardTitle>
            <CardDescription>Jumlah booking yang tercatat di sistem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Booking</p>
                {loading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1" />
                ) : (
                  <h2 className="text-2xl font-bold">{data?.bookings.total ?? 0}</h2>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Booking Aktif</p>
                {loading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1" />
                ) : (
                  <h2 className="text-2xl font-bold">{data?.bookings.active ?? 0}</h2>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performa API</CardTitle>
            <CardDescription>
              Diukur dari {data?.api.windowMinutes ?? 15} menit terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Request</p>
                <h2 className="text-xl font-bold">{data?.api.totalRequests ?? 0}</h2>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Error (5xx)</p>
                <h2 className="text-xl font-bold">{data?.api.errorRequests ?? 0}</h2>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <h2 className="text-xl font-bold">{data?.api.errorRate ?? 0}%</h2>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {data?.timestamp && (
        <p className="text-xs text-muted-foreground">
          Terakhir diperbarui: {new Date(data.timestamp).toLocaleString("id-ID")}
        </p>
      )}
    </div>
  );
};

interface StatusCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  loading: boolean;
  statusOk: boolean;
  okLabel: string;
  badLabel: string;
  neutral?: boolean;
}

const StatusCard = ({ icon: Icon, title, loading, statusOk, okLabel, badLabel, neutral }: StatusCardProps) => (
  <Card className={`border-l-4 ${statusOk ? "border-l-green-500" : neutral ? "border-l-orange-400" : "border-l-red-500"}`}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-x-4">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-6 w-24 bg-muted animate-pulse rounded" />
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant={statusOk ? "default" : neutral ? "secondary" : "destructive"} className={statusOk ? "bg-green-600 hover:bg-green-600" : ""}>
                {statusOk ? "Baik" : neutral ? "Perhatian" : "Bermasalah"}
              </Badge>
            </div>
          )}
          {!loading && (
            <p className="text-xs text-muted-foreground truncate">{statusOk ? okLabel : badLabel}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl text-white shadow-lg shrink-0 ${statusOk ? "bg-green-500" : neutral ? "bg-orange-500" : "bg-red-500"}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AdminSystemHealth;
