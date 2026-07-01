import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Building2, User, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface CommissionRow {
  bookingCode: string;
  packageTitle: string;
  picName: string;
  picType: string;
  pilgrimCount: number;
  commissionPerPilgrim: number;
  totalCommission: number;
}

interface CommissionSummary {
  picType: string;
  picName: string;
  picId: string;
  totalPilgrims: number;
  totalCommission: number;
}

interface CommissionReportProps {
  startDate: Date;
  endDate: Date;
}

const picTypeLabels: Record<string, string> = {
  cabang: "Cabang",
  agen: "Agen",
  karyawan: "Karyawan",
};

const picTypeIcons: Record<string, typeof Building2> = {
  cabang: Building2,
  agen: User,
  karyawan: Users,
};

const formatCurrency = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

const CommissionReport = ({ startDate, endDate }: CommissionReportProps) => {
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [summaries, setSummaries] = useState<CommissionSummary[]>([]);
  const [totals, setTotals] = useState({ cabang: 0, agen: 0, karyawan: 0, grand: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissionData();
  }, [startDate, endDate]);

  const fetchCommissionData = async () => {
    setLoading(true);

    // 1. Get bookings with PIC in the period (exclude cancelled)
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, booking_code, package_id, pic_id, pic_type")
      .not("pic_id", "is", null)
      .not("pic_type", "is", null)
      .neq("status", "cancelled")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (!bookings || bookings.length === 0) {
      setRows([]);
      setSummaries([]);
      setTotals({ cabang: 0, agen: 0, karyawan: 0, grand: 0 });
      setLoading(false);
      return;
    }

    const bookingIds = bookings.map((b) => b.id);
    const packageIds = [...new Set(bookings.map((b) => b.package_id).filter(Boolean))];
    const picIds = [...new Set(bookings.map((b) => b.pic_id).filter(Boolean))];

    // 2. Get pilgrim counts per booking
    const { data: pilgrims } = await supabase
      .from("booking_pilgrims")
      .select("booking_id")
      .in("booking_id", bookingIds);

    const pilgrimCounts: Record<string, number> = {};
    pilgrims?.forEach((p) => {
      if (p.booking_id) pilgrimCounts[p.booking_id] = (pilgrimCounts[p.booking_id] || 0) + 1;
    });

    // 3. Get commission rates
    const { data: commissions } = await supabase
      .from("package_commissions")
      .select("package_id, pic_type, commission_amount")
      .in("package_id", packageIds as string[]);

    const commissionMap: Record<string, number> = {};
    commissions?.forEach((c) => {
      commissionMap[`${c.package_id}_${c.pic_type}`] = c.commission_amount;
    });

    // 4. Get package titles
    const { data: packages } = await supabase
      .from("packages")
      .select("id, title")
      .in("id", packageIds as string[]);

    const packageMap: Record<string, string> = {};
    packages?.forEach((p) => { packageMap[p.id] = p.title; });

    // 5. Get PIC names (agents, branches — we check both tables)
    const picNameMap: Record<string, string> = {};

    if (picIds.length > 0) {
      const { data: agents } = await supabase.from("agents").select("id, name").in("id", picIds as string[]);
      agents?.forEach((a) => { picNameMap[a.id] = a.name; });

      const { data: branches } = await supabase.from("branches").select("id, name").in("id", picIds as string[]);
      branches?.forEach((b) => { picNameMap[b.id] = b.name; });

      // For karyawan, check profiles
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", picIds as string[]);
      profiles?.forEach((p) => { picNameMap[p.id] = p.name; });
    }

    // 6. Build rows
    const resultRows: CommissionRow[] = [];
    const summaryMap: Record<string, CommissionSummary> = {};
    const typeTotals = { cabang: 0, agen: 0, karyawan: 0, grand: 0 };

    bookings.forEach((b) => {
      const picType = b.pic_type || "";
      const commKey = `${b.package_id}_${picType}`;
      const commissionPerPilgrim = commissionMap[commKey] || 0;
      const pCount = pilgrimCounts[b.id] || 0;
      const total = commissionPerPilgrim * pCount;

      resultRows.push({
        bookingCode: b.booking_code,
        packageTitle: packageMap[b.package_id || ""] || "-",
        picName: picNameMap[b.pic_id || ""] || "-",
        picType,
        pilgrimCount: pCount,
        commissionPerPilgrim,
        totalCommission: total,
      });

      // Aggregate summary
      const sumKey = `${picType}_${b.pic_id}`;
      if (!summaryMap[sumKey]) {
        summaryMap[sumKey] = {
          picType,
          picName: picNameMap[b.pic_id || ""] || "-",
          picId: b.pic_id || "",
          totalPilgrims: 0,
          totalCommission: 0,
        };
      }
      summaryMap[sumKey].totalPilgrims += pCount;
      summaryMap[sumKey].totalCommission += total;

      if (picType in typeTotals) {
        typeTotals[picType as keyof typeof typeTotals] += total;
      }
      typeTotals.grand += total;
    });

    setRows(resultRows);
    setSummaries(Object.values(summaryMap).sort((a, b) => b.totalCommission - a.totalCommission));
    setTotals(typeTotals);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  const chartData = [
    { name: "Cabang", komisi: totals.cabang },
    { name: "Agen", komisi: totals.agen },
    { name: "Karyawan", komisi: totals.karyawan },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(["cabang", "agen", "karyawan"] as const).map((type) => {
          const Icon = picTypeIcons[type];
          return (
            <Card key={type}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gold/10">
                    <Icon className="w-6 h-6 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Komisi {picTypeLabels[type]}</p>
                    <p className="text-xl font-bold">{formatCurrency(totals[type])}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Komisi</p>
                <p className="text-xl font-bold">{formatCurrency(totals.grand)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {totals.grand > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gold" />
              Komisi per Tipe PIC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="komisi" fill="hsl(45, 93%, 47%)" name="Komisi" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Summary per PIC */}
      {summaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ringkasan per PIC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Nama PIC</TableHead>
                    <TableHead className="text-center">Total Jemaah</TableHead>
                    <TableHead className="text-right">Total Komisi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((s) => (
                    <TableRow key={`${s.picType}_${s.picId}`}>
                      <TableCell>
                        <Badge variant="outline">{picTypeLabels[s.picType] || s.picType}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{s.picName}</TableCell>
                      <TableCell className="text-center">{s.totalPilgrims}</TableCell>
                      <TableCell className="text-right font-bold text-gold">
                        {formatCurrency(s.totalCommission)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail per Booking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detail Komisi per Booking</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>PIC</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-center">Jemaah</TableHead>
                    <TableHead className="text-right">Komisi/Jemaah</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{r.bookingCode}</TableCell>
                      <TableCell>{r.packageTitle}</TableCell>
                      <TableCell className="font-semibold">{r.picName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{picTypeLabels[r.picType] || r.picType}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{r.pilgrimCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.commissionPerPilgrim)}</TableCell>
                      <TableCell className="text-right font-bold text-gold">
                        {formatCurrency(r.totalCommission)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada data komisi untuk periode ini
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionReport;
