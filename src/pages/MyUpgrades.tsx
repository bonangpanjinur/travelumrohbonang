import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Crown, ExternalLink, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface UpgradeOrder {
  id: string;
  current_template: string;
  target_template: string;
  price: number;
  status: string;
  proof_url: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  tenant_sites: { site_name: string; subdomain: string } | null;
}

const templateLabel = (t: string) => {
  if (t === "premium") return "Premium ✨";
  if (t === "modern") return "Modern";
  return "Classic";
};

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Menunggu Pembayaran", variant: "outline", icon: Clock },
  paid: { label: "Menunggu Konfirmasi", variant: "secondary", icon: Clock },
  confirmed: { label: "Dikonfirmasi", variant: "default", icon: CheckCircle },
  rejected: { label: "Ditolak", variant: "destructive", icon: XCircle },
};

const MyUpgrades = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<UpgradeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("template_upgrade_orders")
        .select("*, tenant_sites(site_name, subdomain)")
        .eq("requested_by", user.id)
        .order("created_at", { ascending: false });
      if (data) setOrders(data as unknown as UpgradeOrder[]);
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Riwayat Upgrade Template</h1>
            <p className="text-sm text-muted-foreground">Pantau status pengajuan upgrade website Anda</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Crown className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-1">Belum Ada Pengajuan</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Anda belum mengajukan upgrade template. Upgrade bisa dilakukan dari halaman Tenant Sites.
              </p>
              <Button variant="outline" onClick={() => navigate("/admin/tenant-sites")}>
                Kelola Tenant Sites
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const sc = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {order.tenant_sites?.site_name || "Site"}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("id-ID", {
                            day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                      <Badge variant={sc.variant} className="flex items-center gap-1 shrink-0">
                        <StatusIcon className="w-3 h-3" />
                        {sc.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant="outline">{templateLabel(order.current_template)}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge>{templateLabel(order.target_template)}</Badge>
                      <span className="ml-auto font-semibold text-primary">{formatRp(order.price)}</span>
                    </div>

                    {order.proof_url && (
                      <a
                        href={order.proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Lihat Bukti Transfer
                      </a>
                    )}

                    {order.notes && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Catatan Anda:</span> {order.notes}
                      </p>
                    )}

                    {order.admin_notes && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        <span className="font-medium">Catatan Admin:</span> {order.admin_notes}
                      </p>
                    )}

                    {order.confirmed_at && (
                      <p className="text-xs text-success">
                        Dikonfirmasi pada {new Date(order.confirmed_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "long", year: "numeric"
                        })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default MyUpgrades;
