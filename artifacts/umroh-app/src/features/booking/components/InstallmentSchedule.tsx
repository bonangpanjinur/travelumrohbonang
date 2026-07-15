import { useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useInstallments } from "@/features/booking/hooks/useInstallments";
import { apiFetch } from "@/shared/lib/apiClient";
import { useToast } from "@/shared/hooks/use-toast";
import { useCurrency } from "@/shared/hooks/useCurrency";

interface InstallmentScheduleProps {
  bookingId: string;
  customerName?: string;
  customerEmail?: string;
}

const statusConfig = {
  pending: {
    label: "Belum Dibayar",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  paid: {
    label: "Lunas",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  overdue: {
    label: "Jatuh Tempo",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
} as const;

export default function InstallmentSchedule({
  bookingId,
  customerName = "Jamaah",
  customerEmail = "",
}: InstallmentScheduleProps) {
  const { installments, loading, error, refetch } = useInstallments(bookingId);
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState<number | null>(null);
  const { toast } = useToast();
  const { format: fmt } = useCurrency();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat jadwal cicilan…
      </div>
    );
  }

  if (error || installments.length === 0) return null;

  const totalAmount = installments.reduce((s, i) => s + i.amount, 0);
  const paidAmount = installments
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount, 0);
  const nextPending = installments.find(
    (i) => i.status === "pending" || i.status === "overdue",
  );

  async function handlePay(installmentNumber: number) {
    setPaying(installmentNumber);
    try {
      const data = await apiFetch<{
        vaNumber?: string;
        bankCode?: string;
        orderId: string;
        amount: number;
        expiryTime?: string;
      }>(`/api/bookings/${bookingId}/installments/${installmentNumber}/pay`, {
        method: "POST",
        body: JSON.stringify({
          gateway: "midtrans",
          paymentMethod: "bank_transfer",
          bankCode: "bca",
          customerName,
          customerEmail,
        }),
      });

      toast({
        title: "Transaksi Berhasil Dibuat",
        description: data.vaNumber
          ? `Virtual Account ${data.bankCode?.toUpperCase() ?? "BCA"}: ${data.vaNumber}`
          : `Order ID: ${data.orderId}. Silakan selesaikan pembayaran.`,
      });
      refetch();
    } catch (err: unknown) {
      toast({
        title: "Gagal Membuat Transaksi",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setPaying(null);
    }
  }

  return (
    <div className="mt-3 border border-border rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="w-4 h-4 text-primary" />
          Jadwal Cicilan
          <Badge variant="outline" className="text-xs">
            {installments.filter((i) => i.status === "paid").length}/
            {installments.length} lunas
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {fmt(paidAmount)} / {fmt(totalAmount)}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-1 bg-primary transition-all"
          style={{
            width: `${totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Installment rows */}
      {open && (
        <div className="divide-y divide-border">
          {installments.map((item) => {
            const cfg =
              statusConfig[item.status as keyof typeof statusConfig] ??
              statusConfig.pending;
            const StatusIcon = cfg.icon;
            const isDP = item.installmentNumber === 0;
            const canPay =
              item.status === "pending" || item.status === "overdue";
            const dueDateObj = item.dueDate ? new Date(item.dueDate) : null;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusIcon
                    className={`w-4 h-4 flex-shrink-0 ${
                      item.status === "paid"
                        ? "text-success"
                        : item.status === "overdue"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {isDP ? "DP (Uang Muka)" : `Cicilan ke-${item.installmentNumber}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dueDateObj
                        ? `Jatuh tempo: ${format(dueDateObj, "d MMM yyyy", { locale: localeId })}`
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="font-semibold">{fmt(item.amount)}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${cfg.className}`}
                  >
                    {cfg.label}
                  </Badge>
                  {canPay && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2"
                      disabled={paying === item.installmentNumber}
                      onClick={() => handlePay(item.installmentNumber)}
                    >
                      {paying === item.installmentNumber ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-3 h-3 mr-1" />
                          Bayar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {nextPending && (
            <div className="px-4 py-2 bg-warning/5 text-xs text-warning flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Cicilan berikutnya: {fmt(nextPending.amount)} —{" "}
              {nextPending.dueDate
                ? format(new Date(nextPending.dueDate), "d MMM yyyy", {
                    locale: localeId,
                  })
                : "—"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
