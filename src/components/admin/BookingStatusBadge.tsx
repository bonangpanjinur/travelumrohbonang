import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  waiting_payment: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
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
