import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  waiting_payment: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  waiting_payment: "Menunggu Pembayaran",
  paid: "Lunas",
  cancelled: "Dibatalkan",
};

interface BookingStatusBadgeProps {
  status: string;
}

const BookingStatusBadge = ({ status }: BookingStatusBadgeProps) => {
  return (
    <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
      {statusLabels[status] || status}
    </Badge>
  );
};

export default BookingStatusBadge;
export { statusColors, statusLabels };
