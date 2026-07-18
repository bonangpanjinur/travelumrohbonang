/**
 * PL-F03: Laporan Distribusi Perlengkapan
 * Menampilkan ringkasan distribusi per item perlengkapan + export CSV
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { exportToCsv } from "@/shared/lib/exportCsv";
import { Download, Search, Package } from "lucide-react";

interface ReportRow {
  itemId: string;
  itemName: string;
  category: string | null;
  totalAssigned: number;
  pending: number;
  distributed: number;
  returned: number;
}

interface DetailRow {
  assignmentId: string;
  itemName: string;
  category: string | null;
  pilgrimName: string;
  bookingCode: string;
  status: string;
  size: string | null;
  quantity: number;
  distributedAt: string | null;
  returnedAt: string | null;
  notes: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-800 border-yellow-300",
  distributed: "bg-blue-100 text-blue-800 border-blue-300",
  returned:    "bg-green-100 text-green-800 border-green-300",
};

const AdminEquipmentReport = () => {
  const [search, setSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { data: summary = [], isLoading } = useQuery<ReportRow[]>({
    queryKey: ["equipment-report"],
    queryFn: () => apiFetch("/api/admin/equipment-report"),
  });

  const { data: detail = [], isLoading: isLoadingDetail } = useQuery<DetailRow[]>({
    queryKey: ["equipment-report-detail", selectedItemId],
    queryFn: () =>
      apiFetch(`/api/admin/equipment-report/detail${selectedItemId ? `?itemId=${selectedItemId}` : ""}`),
    enabled: !!selectedItemId,
  });

  const filtered = summary.filter((r) =>
    !search ||
    r.itemName.toLowerCase().includes(search.toLowerCase()) ||
    (r.category ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleExportSummary = () => {
    exportToCsv("laporan-perlengkapan", 
      ["Nama Item", "Kategori", "Total Diberikan", "Pending", "Terdistribusi", "Dikembalikan"],
      filtered.map(r => [
        r.itemName,
        r.category ?? "-",
        String(r.totalAssigned),
        String(r.pending),
        String(r.distributed),
        String(r.returned),
      ])
    );
  };

  const handleExportDetail = () => {
    exportToCsv("detail-distribusi-perlengkapan",
      ["Item", "Kategori", "Jemaah", "Kode Booking", "Status", "Ukuran", "Jumlah", "Tgl Distribusi", "Tgl Kembali"],
      detail.map(d => [
        d.itemName,
        d.category ?? "-",
        d.pilgrimName,
        d.bookingCode,
        d.status,
        d.size ?? "-",
        String(d.quantity),
        d.distributedAt ? new Date(d.distributedAt).toLocaleDateString("id-ID") : "-",
        d.returnedAt ? new Date(d.returnedAt).toLocaleDateString("id-ID") : "-",
      ])
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Laporan Distribusi Perlengkapan</h1>
          <p className="text-sm text-muted-foreground mt-1">Ringkasan distribusi perlengkapan per item</p>
        </div>
        <Button variant="outline" onClick={handleExportSummary}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Filter */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama item atau kategori..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-xs"
        />
      </div>

      {/* Summary Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{search ? "Tidak ada item yang cocok." : "Belum ada data perlengkapan."}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Item</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">Terdistribusi</TableHead>
                  <TableHead className="text-center">Dikembalikan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.itemId}
                    className={selectedItemId === row.itemId ? "bg-primary/5" : ""}
                  >
                    <TableCell className="font-medium">{row.itemName}</TableCell>
                    <TableCell>{row.category ?? "-"}</TableCell>
                    <TableCell className="text-center font-semibold">{row.totalAssigned}</TableCell>
                    <TableCell className="text-center">
                      {Number(row.pending) > 0 ? (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">{row.pending}</Badge>
                      ) : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {Number(row.distributed) > 0 ? (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">{row.distributed}</Badge>
                      ) : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {Number(row.returned) > 0 ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">{row.returned}</Badge>
                      ) : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={selectedItemId === row.itemId ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedItemId(selectedItemId === row.itemId ? null : row.itemId)}
                      >
                        {selectedItemId === row.itemId ? "Tutup" : "Detail"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Detail panel for selected item */}
      {selectedItemId && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Detail Distribusi — {summary.find(r => r.itemId === selectedItemId)?.itemName}</h3>
            <Button variant="outline" size="sm" onClick={handleExportDetail}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
          {isLoadingDetail ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : detail.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Belum ada distribusi untuk item ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jemaah</TableHead>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ukuran</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Tgl Distribusi</TableHead>
                    <TableHead>Tgl Kembali</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.map((d) => (
                    <TableRow key={d.assignmentId}>
                      <TableCell className="font-medium">{d.pilgrimName}</TableCell>
                      <TableCell className="font-mono text-xs">{d.bookingCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLOR[d.status] ?? ""}>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.size ?? "-"}</TableCell>
                      <TableCell>{d.quantity}</TableCell>
                      <TableCell className="text-sm">
                        {d.distributedAt ? new Date(d.distributedAt).toLocaleDateString("id-ID") : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.returnedAt ? new Date(d.returnedAt).toLocaleDateString("id-ID") : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.notes ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminEquipmentReport;
