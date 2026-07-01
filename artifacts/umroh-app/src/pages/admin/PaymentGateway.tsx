import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Search, Plus, CreditCard, Wallet, RefreshCw, Copy, CheckCircle,
  Clock, XCircle, AlertTriangle, QrCode, Building2, Eye
} from "lucide-react";

const BANKS_MIDTRANS = [
  { code: "bca", label: "BCA" },
  { code: "bni", label: "BNI" },
  { code: "bri", label: "BRI" },
  { code: "permata", label: "Permata" },
];

const BANKS_XENDIT = [
  { code: "BCA", label: "BCA" },
  { code: "BNI", label: "BNI" },
  { code: "BRI", label: "BRI" },
  { code: "MANDIRI", label: "Mandiri" },
  { code: "PERMATA", label: "Permata" },
  { code: "BSI", label: "BSI" },
];

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Virtual Account", icon: Building2 },
  { value: "qris", label: "QRIS", icon: QrCode },
];

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  pending: { label: "Menunggu", variant: "outline", icon: Clock },
  paid: { label: "Dibayar", variant: "default", icon: CheckCircle },
  expired: { label: "Kadaluarsa", variant: "secondary", icon: AlertTriangle },
  failed: { label: "Gagal", variant: "destructive", icon: XCircle },
  cancelled: { label: "Dibatalkan", variant: "secondary", icon: XCircle },
};

const PaymentGateway = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialog, setCreateDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);

  // Form state
  const [selectedGateway, setSelectedGateway] = useState<string>("midtrans");
  const [selectedMethod, setSelectedMethod] = useState<string>("bank_transfer");
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");

  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["gateway-transactions", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("payment_gateway_transactions")
        .select("*, bookings(booking_code, packages(title))")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (search) {
        return (data || []).filter((tx: any) =>
          tx.gateway_transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
          tx.va_number?.includes(search) ||
          tx.bookings?.booking_code?.toLowerCase().includes(search.toLowerCase())
        );
      }

      return data || [];
    },
  });

  // Fetch bookings for selection
  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-for-gateway"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, total_price, status, profiles(name, email)")
        .in("status", ["pending", "draft", "confirmed"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("payment-gateway", {
        body: {
          action: "create_payment",
          gateway: selectedGateway,
          booking_id: selectedBookingId || null,
          amount: parseFloat(paymentAmount),
          bank_code: selectedBank,
          payment_method: selectedMethod,
          customer_name: customerName,
          customer_email: customerEmail,
          order_id: `TRX-${Date.now()}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["gateway-transactions"] });
      toast.success(`Pembayaran berhasil dibuat via ${selectedGateway.toUpperCase()}`);
      setCreateDialog(false);
      setDetailDialog(data);
      resetForm();
    },
    onError: (e: any) => toast.error("Gagal membuat pembayaran: " + e.message),
  });

  // Check status mutation
  const checkStatusMutation = useMutation({
    mutationFn: async ({ gateway, txId }: { gateway: string; txId: string }) => {
      const { data, error } = await supabase.functions.invoke("payment-gateway", {
        body: {
          action: "check_status",
          gateway,
          order_id: txId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateway-transactions"] });
      toast.success("Status diperbarui");
    },
    onError: (e: any) => toast.error("Gagal cek status: " + e.message),
  });

  const resetForm = () => {
    setSelectedGateway("midtrans");
    setSelectedMethod("bank_transfer");
    setSelectedBank("");
    setSelectedBookingId("");
    setPaymentAmount("");
    setCustomerName("");
    setCustomerEmail("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard");
  };

  const bankList = selectedGateway === "midtrans" ? BANKS_MIDTRANS : BANKS_XENDIT;

  // Stats
  const totalPending = transactions.filter((t: any) => t.status === "pending").length;
  const totalPaid = transactions.filter((t: any) => t.status === "paid").length;
  const totalAmount = transactions.filter((t: any) => t.status === "paid").reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const handleBookingSelect = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    const booking = bookings.find((b: any) => b.id === bookingId);
    if (booking) {
      setPaymentAmount(String(booking.total_price));
      setCustomerName((booking as any).profiles?.name || "");
      setCustomerEmail((booking as any).profiles?.email || "");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payment Gateway</h1>
          <p className="text-muted-foreground">Kelola pembayaran online via Midtrans & Xendit</p>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> Buat Pembayaran
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CreditCard className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{transactions.length}</p><p className="text-xs text-muted-foreground">Total Transaksi</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold">{totalPending}</p><p className="text-xs text-muted-foreground">Menunggu Bayar</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><CheckCircle className="w-5 h-5 text-success" /></div>
            <div><p className="text-2xl font-bold">{totalPaid}</p><p className="text-xs text-muted-foreground">Sudah Bayar</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Wallet className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">Rp {totalAmount.toLocaleString("id-ID")}</p><p className="text-xs text-muted-foreground">Total Terbayar</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari ID transaksi, VA, booking code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="paid">Dibayar</SelectItem>
                <SelectItem value="expired">Kadaluarsa</SelectItem>
                <SelectItem value="failed">Gagal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada transaksi payment gateway</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Transaksi</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>VA / Ref</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: any) => {
                    const config = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
                    const StatusIcon = config.icon;
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">{tx.gateway_transaction_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-xs">{tx.gateway}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{tx.bookings?.booking_code || "-"}</TableCell>
                        <TableCell className="text-sm capitalize">{tx.payment_method?.replace("_", " ") || "-"} {tx.bank_code ? `(${tx.bank_code.toUpperCase()})` : ""}</TableCell>
                        <TableCell>
                          {tx.va_number ? (
                            <button onClick={() => copyToClipboard(tx.va_number)} className="flex items-center gap-1 font-mono text-xs hover:text-primary">
                              {tx.va_number} <Copy className="w-3 h-3" />
                            </button>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">Rp {Number(tx.amount).toLocaleString("id-ID")}</TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />{config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.created_at ? format(new Date(tx.created_at), "dd MMM yyyy HH:mm", { locale: localeId }) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {tx.status === "pending" && tx.gateway === "midtrans" && (
                              <Button size="sm" variant="outline" onClick={() => checkStatusMutation.mutate({ gateway: tx.gateway, txId: tx.gateway_transaction_id })}>
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setDetailDialog(tx)}>
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Pembayaran Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Gateway</Label>
              <Select value={selectedGateway} onValueChange={setSelectedGateway}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="midtrans">Midtrans (Sandbox)</SelectItem>
                  <SelectItem value="xendit">Xendit (Sandbox)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Metode Pembayaran</Label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMethod === "bank_transfer" && (
              <div>
                <Label>Bank</Label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger><SelectValue placeholder="Pilih bank" /></SelectTrigger>
                  <SelectContent>
                    {bankList.map(b => (
                      <SelectItem key={b.code} value={b.code}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Booking (opsional)</Label>
              <Select value={selectedBookingId} onValueChange={handleBookingSelect}>
                <SelectTrigger><SelectValue placeholder="Pilih booking" /></SelectTrigger>
                <SelectContent>
                  {bookings.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.booking_code} - Rp {Number(b.total_price).toLocaleString("id-ID")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Jumlah (Rp)</Label>
              <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="100000" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nama Customer</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nama" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@..." />
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!paymentAmount || createPaymentMutation.isPending}
              onClick={() => createPaymentMutation.mutate()}
            >
              {createPaymentMutation.isPending ? "Memproses..." : "Generate Pembayaran"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-3">
              {detailDialog.va_number && (
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-xs text-muted-foreground mb-1">Virtual Account Number</p>
                  <p className="text-2xl font-mono font-bold tracking-wider">{detailDialog.va_number}</p>
                  <Button size="sm" variant="ghost" className="mt-2" onClick={() => copyToClipboard(detailDialog.va_number)}>
                    <Copy className="w-3 h-3 mr-1" /> Salin
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Gateway:</span></div>
                <div className="font-medium uppercase">{detailDialog.gateway}</div>
                <div><span className="text-muted-foreground">ID Transaksi:</span></div>
                <div className="font-mono text-xs">{detailDialog.gateway_transaction_id || detailDialog.transaction_id}</div>
                <div><span className="text-muted-foreground">Jumlah:</span></div>
                <div className="font-medium">Rp {Number(detailDialog.amount).toLocaleString("id-ID")}</div>
                <div><span className="text-muted-foreground">Status:</span></div>
                <div>
                  {(() => {
                    const config = STATUS_CONFIG[detailDialog.status] || STATUS_CONFIG.pending;
                    return <Badge variant={config.variant}>{config.label}</Badge>;
                  })()}
                </div>
                {detailDialog.expiry_time && (
                  <>
                    <div><span className="text-muted-foreground">Expired:</span></div>
                    <div className="text-xs">{format(new Date(detailDialog.expiry_time), "dd MMM yyyy HH:mm", { locale: localeId })}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentGateway;
