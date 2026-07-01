import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BookingFiltersProps {
  filter: string;
  onFilterChange: (value: string) => void;
}

const BookingFilters = ({ filter, onFilterChange }: BookingFiltersProps) => {
  return (
    <Select value={filter} onValueChange={onFilterChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Filter status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Status</SelectItem>
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="waiting_payment">Menunggu Pembayaran</SelectItem>
        <SelectItem value="paid">Lunas</SelectItem>
        <SelectItem value="cancelled">Dibatalkan</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default BookingFilters;
