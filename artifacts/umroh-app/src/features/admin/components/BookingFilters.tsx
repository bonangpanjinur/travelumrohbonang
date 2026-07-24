import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

interface BookingFiltersProps {
  filter: string;
  onFilterChange: (value: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (value: string) => void;
}

const BookingFilters = ({ filter, onFilterChange, paymentFilter, onPaymentFilterChange }: BookingFiltersProps) => {
  return (
    <div className="flex gap-2">
      {/* Filter status booking */}
      <Select value={filter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Status</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="confirmed">Terkonfirmasi</SelectItem>
          <SelectItem value="waiting_payment">Menunggu Pembayaran</SelectItem>
          <SelectItem value="completed">Selesai</SelectItem>
          <SelectItem value="cancelled">Dibatalkan</SelectItem>
        </SelectContent>
      </Select>

      {/* Filter status pembayaran — terpisah dari status booking */}
      <Select value={paymentFilter} onValueChange={onPaymentFilterChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status bayar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Bayar</SelectItem>
          <SelectItem value="unpaid">Belum Bayar</SelectItem>
          <SelectItem value="partial">DP/Cicilan</SelectItem>
          <SelectItem value="paid">Lunas</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default BookingFilters;
