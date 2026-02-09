import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import BookingStatusBadge from "./BookingStatusBadge";
import BookingDetailPanel from "./BookingDetailPanel";

interface Booking {
  id: string;
  booking_code: string;
  total_price: number;
  status: string;
  created_at: string;
  package_id: string | null;
  pic_type: string | null;
  pic_id: string | null;
  package: { title: string } | null;
  departure: { departure_date: string } | null;
  profile: { name: string; email: string } | null;
}

interface BookingTableProps {
  bookings: Booking[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onVerifyPayment: (id: string) => void;
}

const BookingTable = ({ 
  bookings, 
  expandedId, 
  onToggleExpand, 
  onVerifyPayment 
}: BookingTableProps) => {
  return (
    <div className="bg-card border border-border rounded-xl overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Paket</TableHead>
            <TableHead>Keberangkatan</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b) => (
            <>
              <TableRow key={b.id} className={expandedId === b.id ? "border-b-0" : ""}>
                <TableCell className="font-mono text-sm">{b.booking_code}</TableCell>
                <TableCell>
                  <div className="font-semibold">{b.profile?.name || "-"}</div>
                  <div className="text-xs text-muted-foreground">{b.profile?.email}</div>
                </TableCell>
                <TableCell>{b.package?.title || "-"}</TableCell>
                <TableCell>
                  {b.departure?.departure_date
                    ? format(new Date(b.departure.departure_date), "d MMM yyyy", { locale: localeId })
                    : "-"}
                </TableCell>
                <TableCell className="font-semibold">
                  Rp {b.total_price.toLocaleString("id-ID")}
                </TableCell>
                <TableCell>
                  <BookingStatusBadge status={b.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleExpand(b.id)}
                    >
                      {expandedId === b.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span className="ml-1">Detail</span>
                    </Button>
                    {b.status === "waiting_payment" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVerifyPayment(b.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Verifikasi
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {expandedId === b.id && (
                <TableRow key={`${b.id}-detail`}>
                  <TableCell colSpan={7} className="bg-muted/30 p-0">
                    <BookingDetailPanel
                      bookingId={b.id}
                      packageId={b.package_id}
                      picType={b.pic_type}
                      picId={b.pic_id}
                      packageTitle={b.package?.title || "-"}
                    />
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BookingTable;
export type { Booking };
