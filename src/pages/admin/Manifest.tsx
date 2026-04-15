import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Printer, Users, Plane, Calendar, Download } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { exportToCsv } from "@/lib/exportCsv";

interface Departure {
  id: string;
  departure_date: string;
  return_date: string | null;
  quota: number;
  remaining_quota: number;
  package: { title: string } | null;
  muthawif: { name: string } | null;
}

interface ManifestRow {
  id: string;
  name: string;
  passport_number: string | null;
  gender: string | null;
  phone: string | null;
  booking_code: string;
  room_type: string;
}

const AdminManifest = () => {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [selectedDep, setSelectedDep] = useState<string>("");
  const [manifest, setManifest] = useState<ManifestRow[]>([]);
  const [flightDetails, setFlightDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDeps, setLoadingDeps] = useState(true);

  useEffect(() => {
    supabase
      .from("package_departures")
      .select("id, departure_date, return_date, quota, remaining_quota, package:packages(title), muthawif:muthawifs(name)")
      .order("departure_date", { ascending: false })
      .then(({ data }) => {
        setDepartures((data as unknown as Departure[]) || []);
        setLoadingDeps(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedDep) return;
    fetchManifest();
  }, [selectedDep]);

  const fetchManifest = async () => {
    setLoading(true);

    // Get bookings for this departure
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, booking_code")
      .eq("departure_id", selectedDep)
      .in("status", ["paid", "confirmed", "processing", "completed"]);

    if (!bookings?.length) {
      setManifest([]);
      setLoading(false);
      return;
    }

    const bookingIds = bookings.map((b) => b.id);
    const bookingMap = Object.fromEntries(bookings.map((b) => [b.id, b.booking_code]));

    // Get pilgrims
    const { data: pilgrims } = await supabase
      .from("booking_pilgrims")
      .select("*")
      .in("booking_id", bookingIds);

    // Get rooms for room type info
    const { data: rooms } = await supabase
      .from("booking_rooms")
      .select("booking_id, room_type")
      .in("booking_id", bookingIds);

    const roomMap = Object.fromEntries((rooms || []).map((r) => [r.booking_id, r.room_type]));

    const rows: ManifestRow[] = (pilgrims || []).map((p) => ({
      id: p.id,
      name: p.name,
      passport_number: p.passport_number,
      gender: p.gender,
      phone: p.phone,
      booking_code: bookingMap[p.booking_id!] || "-",
      room_type: roomMap[p.booking_id!] || "-",
    }));

    setManifest(rows);

    // Get flight details
    const { data: flights } = await supabase
      .from("flight_details")
      .select("*")
      .eq("departure_id", selectedDep)
      .order("departure_time");

    setFlightDetails(flights || []);
    setLoading(false);
  };

  const selectedDepData = departures.find((d) => d.id === selectedDep);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ["No", "Nama", "No. Paspor", "Gender", "Telepon", "Kode Booking", "Tipe Kamar"];
    const rows = manifest.map((m, i) => [
      String(i + 1), m.name, m.passport_number || "-", m.gender || "-",
      m.phone || "-", m.booking_code, m.room_type,
    ]);
    exportToCsv("manifest", headers, rows);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Manifest Keberangkatan</h1>
        <div className="flex gap-2">
          {selectedDep && manifest.length > 0 && (
            <>
              <Button variant="outline" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Cetak
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mb-6">
        <Select value={selectedDep} onValueChange={setSelectedDep}>
          <SelectTrigger className="w-full sm:w-[400px]">
            <SelectValue placeholder="Pilih keberangkatan..." />
          </SelectTrigger>
          <SelectContent>
            {departures.map((dep) => (
              <SelectItem key={dep.id} value={dep.id}>
                {dep.package?.title} — {new Date(dep.departure_date).toLocaleDateString("id-ID")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDep && selectedDepData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" /> Tanggal Berangkat
              </div>
              <p className="font-semibold">{new Date(selectedDepData.departure_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" /> Tanggal Kembali
              </div>
              <p className="font-semibold">{selectedDepData.return_date ? new Date(selectedDepData.return_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" /> Jumlah Jemaah
              </div>
              <p className="font-semibold">{manifest.length} / {selectedDepData.quota}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" /> Muthawif
              </div>
              <p className="font-semibold">{selectedDepData.muthawif?.name || "Belum ditentukan"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {flightDetails.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plane className="h-5 w-5" /> Info Penerbangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flightDetails.map((f) => (
                <div key={f.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={f.flight_type === "departure" ? "default" : "secondary"}>
                      {f.flight_type === "departure" ? "Berangkat" : "Pulang"}
                    </Badge>
                    <span className="font-mono font-bold">{f.flight_number || "-"}</span>
                  </div>
                  <p className="text-sm">{f.airline || "-"}</p>
                  <p className="text-sm text-muted-foreground">
                    {f.departure_airport} → {f.arrival_airport}
                  </p>
                  {f.departure_time && (
                    <p className="text-sm mt-1">
                      {new Date(f.departure_time).toLocaleString("id-ID")}
                      {f.terminal ? ` • Terminal ${f.terminal}` : ""}
                      {f.gate ? ` • Gate ${f.gate}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : !selectedDep ? (
        <div className="text-center py-16 text-muted-foreground">Pilih keberangkatan untuk melihat manifest.</div>
      ) : manifest.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada jemaah terdaftar untuk keberangkatan ini.</div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>No. Paspor</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Kode Booking</TableHead>
                <TableHead>Tipe Kamar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manifest.map((row, i) => (
                <TableRow key={row.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono">{row.passport_number || "-"}</TableCell>
                  <TableCell>{row.gender === "male" ? "Laki-laki" : row.gender === "female" ? "Perempuan" : row.gender || "-"}</TableCell>
                  <TableCell>{row.phone || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{row.booking_code}</TableCell>
                  <TableCell>{row.room_type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminManifest;
