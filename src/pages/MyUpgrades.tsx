import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Crown, ExternalLink, Clock, CheckCircle, XCircle, Loader2, Upload, Image, X, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConfirmAlertDialog from "@/components/admin/ConfirmAlertDialog";

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
  cancelled: { label: "Dibatalkan", variant: "destructive", icon: Ban },
};

const MyUpgrades = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<UpgradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("template_upgrade_orders")
      .select("*, tenant_sites(site_name, subdomain)")
      .eq("requested_by", user.id)
      .order("created_at", { ascending: false });
    if (data) setOrders(data as unknown as UpgradeOrder[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("my-upgrades")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "template_upgrade_orders",
          filter: `requested_by=eq.${user.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchOrders]);

  const handleUploadProof = async (orderId: string, file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang diperbolehkan");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    setUploadingId(orderId);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `upgrade-proofs/${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("template_upgrade_orders")
        .update({ proof_url: urlData.publicUrl, status: "paid" })
        .eq("id", orderId)
        .eq("requested_by", user.id);

      if (updateError) throw updateError;

      toast.success("Bukti transfer berhasil diupload!");
      fetchOrders();
    } catch (err: any) {
      toast.error("Gagal upload: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setUploadingId(null);
      setDragOverId(null);
    }
  };

  const handleDrop = (orderId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverId(null);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUploadProof(orderId, file);
  };

  const handleFileSelect = (orderId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadProof(orderId, file);
    e.target.value = "";
  };

  const handleCancel = async () => {
    if (!cancelId || !user) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("template_upgrade_orders")
        .update({ status: "cancelled" })
        .eq("id", cancelId)
        .eq("requested_by", user.id);
      if (error) throw error;
      toast.success("Pengajuan upgrade berhasil dibatalkan");
      fetchOrders();
    } catch (err: any) {
      toast.error("Gagal membatalkan: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setCancelling(false);
      setCancelId(null);
    }
  };

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

        {!loading && orders.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { value: "all", label: "Semua" },
              { value: "pending", label: "Pending" },
              { value: "paid", label: "Menunggu Konfirmasi" },
              { value: "confirmed", label: "Dikonfirmasi" },
              { value: "cancelled", label: "Dibatalkan" },
              { value: "rejected", label: "Ditolak" },
            ].map((f) => {
              const count = f.value === "all" ? orders.length : orders.filter((o) => o.status === f.value).length;
              return (
                <Button
                  key={f.value}
                  variant={statusFilter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                  {count > 0 && (
                    <Badge variant={statusFilter === f.value ? "secondary" : "outline"} className="ml-1.5 px-1.5 py-0 text-xs min-w-[1.25rem] justify-center">
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        )}

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
            {orders
              .filter((o) => statusFilter === "all" || o.status === statusFilter)
              .map((order) => {
              const sc = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              const canUpload = order.status === "pending" && !order.proof_url;
              const isUploading = uploadingId === order.id;
              const isDragOver = dragOverId === order.id;

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

                    {/* Upload area for pending orders without proof */}
                    {canUpload && (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOverId(order.id); }}
                        onDragLeave={() => setDragOverId(null)}
                        onDrop={handleDrop(order.id)}
                        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                        }`}
                        onClick={() => {
                          if (!isUploading) {
                            fileInputRef.current?.setAttribute("data-order-id", order.id);
                            fileInputRef.current?.click();
                          }
                        }}
                      >
                        {isUploading ? (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Mengupload...
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="w-6 h-6 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              Klik atau drag file bukti transfer di sini
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                              Gambar, maks 5MB
                            </p>
                          </div>
                        )}
                      </div>
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
                      <p className="text-xs text-green-600">
                        Dikonfirmasi pada {new Date(order.confirmed_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "long", year: "numeric"
                        })}
                      </p>
                    )}

                    {order.status === "pending" && (
                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setCancelId(order.id)}
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          Batalkan Pengajuan
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden file input shared across cards */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const orderId = fileInputRef.current?.getAttribute("data-order-id");
          if (orderId) handleFileSelect(orderId)(e);
        }}
      />

      <ConfirmAlertDialog
        open={!!cancelId}
        onOpenChange={(open) => { if (!open) setCancelId(null); }}
        onConfirm={handleCancel}
        title="Batalkan Pengajuan Upgrade?"
        description="Pengajuan upgrade yang dibatalkan tidak dapat dikembalikan. Anda harus membuat pengajuan baru jika ingin upgrade lagi."
        confirmLabel={cancelling ? "Membatalkan..." : "Ya, Batalkan"}
        variant="destructive"
      />

      <Footer />
    </div>
  );
};

export default MyUpgrades;
