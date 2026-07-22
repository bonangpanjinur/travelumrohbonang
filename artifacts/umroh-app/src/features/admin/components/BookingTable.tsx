import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Users, Phone, UsersRound, MessageCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import BookingStatusBadge from "./BookingStatusBadge";
import DepartureDetailDrawer from "./DepartureDetailDrawer";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { MobileCard, MobileCardRow } from "./ResponsiveTable";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
  pilgrimsCount?: number | null;
  paymentStatus?: string | null;
  pemesanPhone?: string | null;
  /** Name of the first jamaah (pilgrim) on this booking */
  firstJamaahName?: string | null;
}

interface BookingTableProps {
  bookings: Booking[];
  onRefresh?: () => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

// Role badge styling
const picTypeBadge: Record<string, { label: string; cls: string }> = {
  agen:     { label: "Agen",   cls: "bg-blue-100 text-blue-700 border-blue-200" },
  karyawan: { label: "Admin",  cls: "bg-purple-100 text-purple-700 border-purple-200" },
  cabang:   { label: "Cabang", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  pusat:    { label: "Pusat",  cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

const BookingTable = ({
  bookings,
  onRefresh,
  selectedIds = [],
  onSelectionChange,
}: BookingTableProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const allSelected = bookings.length > 0 && bookings.every((b) => selectedIds.includes(b.id));
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

  const [departureDrw, setDepartureDrw] = useState<{ id: string; packageTitle: string } | null>(null);

  const formatDepartureDate = (d: string | undefined | null) => {
    if (!d) return "-";
    try { return format(new Date(d), "d MMM yyyy", { locale: localeId }); }
    catch { return d; }
  };

  const goToDetail = (_id: string, code: string) => navigate(`/admin/bookings/${code}`);

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div className="space-y-4">
          {bookings.map((b) => {
            const badge = picTypeBadge[b.picType ?? "pusat"] ?? picTypeBadge.pusat;
            return (
              <MobileCard key={b.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold">{b.bookingCode}</p>
                    <p className="font-semibold mt-1">
                      {b.firstJamaahName || (
                        <span className="text-muted-foreground italic text-sm">Belum ada jemaah</span>
                      )}
                    </p>
                    {b.profile?.name && (
                      <p className="text-xs text-muted-foreground">Pemesan: {b.profile.name}</p>
                    )}
                  </div>
                  <BookingStatusBadge status={b.status} />
                </div>
                <MobileCardRow label="Diinput oleh">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-semibold ${badge.cls}`}>{badge.label}</span>
                    <span className="text-sm">{b.picName || "—"}</span>
                  </div>
                </MobileCardRow>
                <MobileCardRow label="Paket">{b.package?.title || "-"}</MobileCardRow>
                <MobileCardRow label="Keberangkatan">
                  {b.departure?.departureDate
                    ? <button onClick={() => b.departureId && setDepartureDrw({ id: b.departureId, packageTitle: b.package?.title || "" })} className={b.departureId ? "text-primary underline cursor-pointer" : ""}>{formatDepartureDate(b.departure.departureDate)}</button>
                    : "-"}
                </MobileCardRow>
                <MobileCardRow label="Total">
                  <span className="font-semibold">Rp {b.totalPrice.toLocaleString("id-ID")}</span>
                </MobileCardRow>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="default" size="sm" className="flex-1 gap-1" onClick={() => goToDetail(b.id, b.bookingCode)}>
                    Detail <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </MobileCard>
            );
          })}
        </div>
        <DepartureDetailDrawer
          departureId={departureDrw?.id ?? null}
          packageTitle={departureDrw?.packageTitle}
          onClose={() => setDepartureDrw(null)}
        />
      </>
    );
  }

  // ── Desktop ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {onSelectionChange && (
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Pilih semua" />
                  </TableHead>
                )}
                <TableHead>Kode</TableHead>
                <TableHead>Jemaah</TableHead>
                <TableHead>Diinput Oleh</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Keberangkatan</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status Bayar</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const badge = picTypeBadge[b.picType ?? "pusat"] ?? picTypeBadge.pusat;
                return (
                  <TableRow key={b.id} className="cursor-pointer hover:bg-muted/30">
                    {onSelectionChange && (
                      <TableCell onClick={(e) => { e.stopPropagation(); toggleOne(b.id); }}>
                        <Checkbox checked={selectedIds.includes(b.id)} onCheckedChange={() => toggleOne(b.id)} aria-label={`Pilih ${b.bookingCode}`} />
                      </TableCell>
                    )}

                    {/* Kode */}
                    <TableCell className="font-mono text-sm" onClick={() => goToDetail(b.id, b.bookingCode)}>
                      <div>{b.bookingCode}</div>
                      {b.isGroupBooking && (
                        <Badge variant="outline" className="mt-1 text-[10px] border-gold/40 text-gold px-1 py-0 gap-1">
                          <UsersRound className="w-2.5 h-2.5" />
                          {b.groupName ? (b.groupName.length > 16 ? b.groupName.slice(0, 16) + "…" : b.groupName) : "Grup"}
                        </Badge>
                      )}
                      {(b.pilgrimsCount ?? 0) > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                          <Users className="w-2.5 h-2.5" />{b.pilgrimsCount} jemaah
                        </div>
                      )}
                    </TableCell>

                    {/* Jemaah — primary: nama jemaah pertama, secondary: pemesan akun */}
                    <TableCell onClick={() => goToDetail(b.id, b.bookingCode)}>
                      {b.firstJamaahName ? (
                        <div>
                          <div className="font-semibold">{b.firstJamaahName}</div>
                          {b.profile?.name && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Pemesan: {b.profile.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-muted-foreground italic text-sm">Belum ada jemaah</div>
                          {b.profile?.name && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Pemesan: {b.profile.name}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Diinput Oleh — role badge + nama */}
                    <TableCell className="text-sm" onClick={() => goToDetail(b.id, b.bookingCode)}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded border font-semibold whitespace-nowrap ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {b.picName && <span className="text-sm">{b.picName}</span>}
                        {!b.picType || b.picType === "pusat" ? (
                          !b.picName && <span className="text-muted-foreground text-sm">Kantor Pusat</span>
                        ) : null}
                      </div>
                      {b.pemesanPhone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                          <Phone className="w-2.5 h-2.5" />{b.pemesanPhone}
                        </div>
                      )}
                    </TableCell>

                    {/* Paket */}
                    <TableCell onClick={() => goToDetail(b.id, b.bookingCode)}>{b.package?.title || "-"}</TableCell>

                    {/* Keberangkatan */}
                    <TableCell>
                      {b.departure?.departureDate ? (
                        b.departureId ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDepartureDrw({ id: b.departureId!, packageTitle: b.package?.title || "" }); }}
                            className="text-primary hover:underline font-medium text-sm cursor-pointer"
                            title="Klik untuk lihat detail keberangkatan"
                          >
                            {formatDepartureDate(b.departure.departureDate)}
                          </button>
                        ) : (
                          <span className="text-sm">{formatDepartureDate(b.departure.departureDate)}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Total */}
                    <TableCell className="font-semibold tabular-nums" onClick={() => goToDetail(b.id, b.bookingCode)}>
                      Rp {b.totalPrice.toLocaleString("id-ID")}
                    </TableCell>

                    {/* Status Bayar */}
                    <TableCell onClick={() => goToDetail(b.id, b.bookingCode)}>
                      {b.paymentStatus === "paid" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">✓ Lunas</span>
                      )}
                      {b.paymentStatus === "partial" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">DP/Cicil</span>
                      )}
                      {(!b.paymentStatus || b.paymentStatus === "unpaid") && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">Belum</span>
                      )}
                    </TableCell>

                    {/* Cabang */}
                    <TableCell className="text-sm" onClick={() => goToDetail(b.id, b.bookingCode)}>
                      {b.branch?.name || <span className="text-muted-foreground">—</span>}
                    </TableCell>

                    {/* Status */}
                    <TableCell onClick={() => goToDetail(b.id, b.bookingCode)}>
                      <BookingStatusBadge status={b.status} />
                    </TableCell>

                    {/* Aksi */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {b.pemesanPhone && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-green-600"
                            title={`WhatsApp ${b.picName || b.pemesanPhone}`}
                            asChild
                          >
                            <a href={`https://wa.me/${b.pemesanPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => { e.stopPropagation(); goToDetail(b.id, b.bookingCode); }}
                        >
                          Detail <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

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
