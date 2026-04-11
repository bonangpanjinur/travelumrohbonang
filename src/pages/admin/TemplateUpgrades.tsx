import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Check, X, Eye, Crown, Settings, ArrowUpCircle } from "lucide-react";
import ConfirmAlertDialog from "@/components/admin/ConfirmAlertDialog";

interface UpgradeOrder {
  id: string;
  tenant_site_id: string;
  requested_by: string;
  current_template: string;
  target_template: string;
  price: number;
  status: string;
  proof_url: string | null;
  notes: string | null;
  admin_notes: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  tenant_sites?: { site_name: string; subdomain: string } | null;
  profiles?: { name: string; email: string } | null;
}

interface TemplatePricing {
  id: string;
  template_name: string;
  price: number;
  description: string | null;
  is_active: boolean;
}

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const templateLabel = (t: string) => {
  if (t === "premium") return "Premium ✨";
  if (t === "modern") return "Modern";
  return "Classic";
};

const statusBadge = (status: string) => {
  switch (status) {
    case "pending": return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Menunggu</Badge>;
    case "paid": return <Badge variant="outline" className="bg-info/10 text-info border-info/30">Bukti Dikirim</Badge>;
    case "confirmed": return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Dikonfirmasi</Badge>;
    case "rejected": return <Badge variant="destructive">Ditolak</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

const TemplateUpgradesAdmin = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<UpgradeOrder[]>([]);
  const [pricing, setPricing] = useState<TemplatePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<UpgradeOrder | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ order: UpgradeOrder; action: "confirmed" | "rejected" } | null>(null);
  const [editPricing, setEditPricing] = useState<TemplatePricing | null>(null);
  const [priceForm, setPriceForm] = useState({ price: 0, description: "" });

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("template_upgrade_orders")
      .select("*, tenant_sites(site_name, subdomain), profiles:requested_by(name, email)")
      .order("created_at", { ascending: false });
    if (data) setOrders(data as any);
  };

  const fetchPricing = async () => {
    const { data } = await supabase
      .from("template_pricing")
      .select("*")
      .order("template_name");
    if (data) setPricing(data as TemplatePricing[]);
  };

  useEffect(() => {
    Promise.all([fetchOrders(), fetchPricing()]).then(() => setLoading(false));
  }, []);

  const handleAction = async () => {
    if (!confirmAction) return;
    const { order, action } = confirmAction;

    try {
      // Update order status
      const { error } = await supabase
        .from("template_upgrade_orders")
        .update({
          status: action,
          admin_notes: adminNotes || null,
          confirmed_by: user?.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      if (error) throw error;

      // If confirmed, update tenant template
      if (action === "confirmed") {
        const { error: tenantError } = await supabase
          .from("tenant_sites")
          .update({ template: order.target_template })
          .eq("id", order.tenant_site_id);
        if (tenantError) throw tenantError;
      }

      toast.success(action === "confirmed" ? "Upgrade dikonfirmasi! Template tenant telah diperbarui." : "Pengajuan ditolak.");
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConfirmAction(null);
      setAdminNotes("");
    }
  };

  const handleSavePricing = async () => {
    if (!editPricing) return;
    try {
      const { error } = await supabase
        .from("template_pricing")
        .update({ price: priceForm.price, description: priceForm.description })
        .eq("id", editPricing.id);
      if (error) throw error;
      toast.success("Harga template berhasil diperbarui");
      setEditPricing(null);
      fetchPricing();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const pendingCount = orders.filter(o => o.status === "pending" || o.status === "paid").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowUpCircle className="w-6 h-6" /> Upgrade Template
        </h1>
        <p className="text-muted-foreground">Kelola pengajuan upgrade template dan harga</p>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="gap-1.5">
            <Crown className="w-4 h-4" /> Pengajuan
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-1.5">
            <Settings className="w-4 h-4" /> Harga Template
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Pengaju</TableHead>
                    <TableHead>Upgrade</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Belum ada pengajuan upgrade
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{(order as any).tenant_sites?.site_name || "-"}</p>
                            <code className="text-xs text-muted-foreground">{(order as any).tenant_sites?.subdomain}</code>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{(order as any).profiles?.name || "-"}</p>
                            <p className="text-xs text-muted-foreground">{(order as any).profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Badge variant="secondary" className="text-xs">{templateLabel(order.current_template)}</Badge>
                            <span>→</span>
                            <Badge className="text-xs">{templateLabel(order.target_template)}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatRp(order.price)}</TableCell>
                        <TableCell>{statusBadge(order.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), "dd MMM yyyy", { locale: localeId })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)} title="Detail">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(order.status === "pending" || order.status === "paid") && (
                              <>
                                <Button
                                  variant="ghost" size="icon"
                                  className="text-success hover:text-success"
                                  onClick={() => setConfirmAction({ order, action: "confirmed" })}
                                  title="Konfirmasi"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="text-destructive"
                                  onClick={() => setConfirmAction({ order, action: "rejected" })}
                                  title="Tolak"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pricing.map(tp => (
              <Card key={tp.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-primary" />
                      {templateLabel(tp.template_name)}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditPricing(tp);
                      setPriceForm({ price: tp.price, description: tp.description || "" });
                    }}>
                      Edit Harga
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">{formatRp(tp.price)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{tp.description || "-"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={o => !o && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Pengajuan Upgrade</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Tenant</p>
                  <p className="font-medium">{(selectedOrder as any).tenant_sites?.site_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pengaju</p>
                  <p className="font-medium">{(selectedOrder as any).profiles?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Template Saat Ini</p>
                  <Badge variant="secondary">{templateLabel(selectedOrder.current_template)}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Template Tujuan</p>
                  <Badge>{templateLabel(selectedOrder.target_template)}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Harga</p>
                  <p className="font-bold text-primary">{formatRp(selectedOrder.price)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {statusBadge(selectedOrder.status)}
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Catatan Pengaju</p>
                  <p className="text-sm bg-muted p-2 rounded">{selectedOrder.notes}</p>
                </div>
              )}
              {selectedOrder.proof_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bukti Transfer</p>
                  <img src={selectedOrder.proof_url} alt="Bukti Transfer" className="w-full max-h-64 object-contain rounded border" />
                </div>
              )}
              {selectedOrder.admin_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Catatan Admin</p>
                  <p className="text-sm bg-muted p-2 rounded">{selectedOrder.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm/Reject Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={o => !o && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "confirmed" ? "Konfirmasi Upgrade?" : "Tolak Pengajuan?"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {confirmAction?.action === "confirmed"
                ? `Template tenant akan otomatis diubah ke "${templateLabel(confirmAction?.order.target_template || "")}".`
                : "Pengajuan upgrade ini akan ditolak."}
            </p>
            <div>
              <Label>Catatan Admin (opsional)</Label>
              <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Tulis catatan..." rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Batal</Button>
              <Button
                variant={confirmAction?.action === "confirmed" ? "default" : "destructive"}
                onClick={handleAction}
              >
                {confirmAction?.action === "confirmed" ? "Konfirmasi & Aktifkan" : "Tolak Pengajuan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Pricing Dialog */}
      <Dialog open={!!editPricing} onOpenChange={o => !o && setEditPricing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Harga - {editPricing && templateLabel(editPricing.template_name)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Harga (Rp)</Label>
              <Input
                type="number"
                value={priceForm.price}
                onChange={e => setPriceForm(p => ({ ...p, price: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={priceForm.description}
                onChange={e => setPriceForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditPricing(null)}>Batal</Button>
              <Button onClick={handleSavePricing}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplateUpgradesAdmin;
