import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Eye, EyeOff, UsersRound } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import BookingStatusBadge from "./BookingStatusBadge";
import BookingDetailPanel from "./BookingDetailPanel";
import DepartureDetailDrawer from "./DepartureDetailDrawer";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { MobileCard, MobileCardRow } from "./ResponsiveTable";
import { useState } from "react";

interface Booking {
  id: string;
  bookingCode: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  packageId: string | null;
  departureId?: string | null;
  picType: string | null;
  picId: string | null;
  branchId: string | null;
  isGroupBooking?: boolean;
  groupName?: string | null;
  picName?: string | null;
  picPhone?: string | null;
  package: { title: string } | null;
  departure: { departureDate: string } | null;
  profile: { name: string; email: string } | null;
  branch: { name: string } | null;
}

interface BookingTableProps {
  bookings: Booking[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onRefresh?: () => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

const BookingTable = ({
  bookings,
  expandedId,
  onToggleExpand,
  onRefresh,
  selectedIds = [],
  onSelectionChange,
}: BookingTableProps) => {
  const allSelected =
    bookings.length > 0 && bookings.every((b) => selectedIds.includes(b.id));
  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : bookings.map((b) => b.id));
  };
  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  };

  // Departure detail drawer — shared across the whole table
  const [departureDrw, setDepartureDrw] = useState<{
    id: string;
    packageTitle: string;
  } | null>(null);

  const isMobile = useIsMobile();

  const formatDepartureDate = (d: string | undefined | null) => {
    if (!d) return "-";
    try {
      return format(new Date(d), "d MMM yyyy", { locale: localeId });
    } catch {
      return d;
    }
  };

  if (isMobile) {
    return (
      <>
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id}>
              <MobileCard>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold">{b.bookingCode}</p>
                    <p className="font-semibold mt-1">{b.profile?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground">{b.profile?.email}</p>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </div>
                <MobileCardRow label="Paket">{b.package?.title || "-"}</MobileCardRow>
                <MobileCardRow label="Keberangkatan">
                  {b.departure?.departureDate ? (
                    <button
                      onClick={() =>
                        b.departureId &&
                        setDepartureDrw({
                          id: b.departureId,
                          packageTitle: b.package?.title || "",
                        })
                      }
                      className={`${b.departureId ? "text-primary underline cursor-pointer" : ""}`}
                    >
                      {formatDepartureDate(b.departure.departureDate)}
                    </button>
                  ) : (
                    "-"
                  )}
                </MobileCardRow>
                <MobileCardRow label="Total">
                  <span className="font-semibold">Rp {b.totalPrice.toLocaleString("id-ID")}</span>
                </MobileCardRow>
                <MobileCardRow label="Cabang">{b.branch?.name || "—"}</MobileCardRow>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleExpand(b.id)}
                    className="flex-1"
                  >
                    {expandedId === b.id ? (
                      <EyeOff className="w-4 h-4 mr-1" />
                    ) : (
                      <Eye className="w-4 h-4 mr-1" />
                    )}
                    Detail
                  </Button>
                </div>
              </MobileCard>
              {expandedId === b.id && (
                <div className="mt-1 bg-muted/30 rounded-xl">
                  <BookingDetailPanel
                    bookingId={b.id}
                    packageId={b.packageId}
                    departureId={b.departureId}
                    departureDate={b.departure?.departureDate}
                    picType={b.picType}
                    picId={b.picId}
                    packageTitle={b.package?.title || "-"}
                    branchId={b.branchId}
                    status={b.status}
                    onBranchChange={onRefresh}
                    onBookingChange={onRefresh}
                    isGroupBooking={b.isGroupBooking}
                    groupName={b.groupName}
                    groupPicName={b.picName}
                    groupPicPhone={b.picPhone}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <DepartureDetailDrawer
          departureId={departureDrw?.id ?? null}
          packageTitle={departureDrw?.packageTitle}
          onClose={() => setDepartureDrw(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {onSelectionChange && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Pilih semua"
                    />
                  </TableHead>
                )}
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Pemesan</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Keberangkatan</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <>
                  <TableRow key={b.id} className={expandedId === b.id ? "border-b-0" : ""}>
                    {onSelectionChange && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(b.id)}
                          onCheckedChange={() => toggleOne(b.id)}
                          aria-label={`Pilih ${b.bookingCode}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-sm">
                      <div>{b.bookingCode}</div>
                      {b.isGroupBooking && (
                        <Badge
                          variant="outline"
                          className="mt-1 text-[10px] border-gold/40 text-gold px-1 py-0 gap-1"
                        >
                          <UsersRound className="w-2.5 h-2.5" />
                          {b.groupName
                            ? b.groupName.length > 16
                              ? b.groupName.slice(0, 16) + "…"
                              : b.groupName
                            : "Grup"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{b.profile?.name || "-"}</div>
                      <div className="text-xs text-muted-foreground">{b.profile?.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.picName ? (
                        <span>{b.picName}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{b.package?.title || "-"}</TableCell>

                    {/* Departure date — clickable if departureId is available */}
                    <TableCell>
                      {b.departure?.departureDate ? (
                        b.departureId ? (
                          <button
                            onClick={() =>
                              setDepartureDrw({
                                id: b.departureId!,
                                packageTitle: b.package?.title || "",
                              })
                            }
                            className="text-primary hover:underline font-medium text-sm cursor-pointer"
                            title="Klik untuk lihat detail keberangkatan"
                          >
                            {formatDepartureDate(b.departure.departureDate)}
                          </button>
                        ) : (
                          <span className="text-sm">
                            {formatDepartureDate(b.departure.departureDate)}
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell className="font-semibold">
                      Rp {b.totalPrice.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.branch?.name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleExpand(b.id)}
                      >
                        {expandedId === b.id ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        <span className="ml-1">Detail</span>
                      </Button>
                    </TableCell>
                  </TableRow>

                  {expandedId === b.id && (
                    <TableRow key={`${b.id}-detail`}>
                      <TableCell
                        colSpan={onSelectionChange ? 10 : 9}
                        className="bg-muted/30 p-0"
                      >
                        <BookingDetailPanel
                          bookingId={b.id}
                          packageId={b.packageId}
                          departureId={b.departureId}
                          departureDate={b.departure?.departureDate}
                          picType={b.picType}
                          picId={b.picId}
                          packageTitle={b.package?.title || "-"}
                          branchId={b.branchId}
                          status={b.status}
                          onBranchChange={onRefresh}
                          onBookingChange={onRefresh}
                          pemesanName={b.picName ?? null}
                          pemesanPhone={b.picPhone ?? null}
                          isGroupBooking={b.isGroupBooking}
                          groupName={b.groupName}
                          groupPicName={b.picName}
                          groupPicPhone={b.picPhone}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Departure detail drawer — rendered outside the table to avoid DOM nesting issues */}
      <DepartureDetailDrawer
        departureId={departureDrw?.id ?? null}
        packageTitle={departureDrw?.packageTitle}
        onClose={() => setDepartureDrw(null)}
      />
    </>
  );
};

export default BookingTable;
export type { Booking };
