import { Badge } from "@/shared/components/ui/badge";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  waiting_payment: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  confirmed: "Terkonfirmasi",
  completed: "Selesai",
  waiting_payment: "Menunggu Pembayaran",
  paid: "Lunas",
  cancelled: "Dibatalkan",
};

interface BookingStatusBadgeProps {
  status: string;
}

const BookingStatusBadge = ({ status }: BookingStatusBadgeProps) => {
  return (
    <Badge className={statusColors[status] || "bg-muted text-muted-foreground"}>
      {statusLabels[status] || status}
    </Badge>
  );
};

export default BookingStatusBadge;
export { statusColors, statusLabels };
