import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { toast } from "sonner";
import { BedDouble, Users, Search, Save, Calendar, CheckCircle2, Filter } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Departure {
  id: string;
  departureDate: string;
  returnDate: string;
  quota: number;
  packageTitle: string;
}

interface PilgrimRow {
  pilgrimId: string;
  pilgrimName: string;
  gender: string | null;
  phone: string | null;
  roomType: string | null;
  roomNumber: string | null;
  bookingId: string;
  bookingCode: string;
}

const ROOM_TYPES = ["quad", "triple", "double", "single"];
const ROOM_TYPE_LABELS: Record<string, string> = {
  quad: "Quad (4 org)",
  triple: "Triple (3 org)",
  double: "Double (2 org)",
  single: "Single (1 org)",
};

const AdminRoomAssignment = () => {
  const qc = useQueryClient();
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [searchName, setSearchName] = useState("");
  const [filterRoom, setFilterRoom] = useState<string>("all");
  const [localRooms, setLocalRooms] = useState<Record<string, { roomType: string; roomNumber: string }>>({});
  const [dirty, setDirty] = useState(false);

  const { data: departures = [], isLoading: loadingDepartures } = useQuery({
    queryKey: ["room-assignment-departures"],
    queryFn: () => apiFetch<Departure[]>("/api/admin/room-assignment/departures"),
  });

  const { data: pilgrims = [], isLoading: loadingPilgrims } = useQuery({
    queryKey: ["room-assignment-pilgrims", selectedDeparture],
    queryFn: () => apiFetch<PilgrimRow[]>(`/api/admin/room-assignment/${selectedDeparture}/pilgrims`),
    enabled: !!selectedDeparture,
    // Prevent auto-refetch from overwriting in-progress edits
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  // Sync local room state whenever server data changes,
  // but skip sync if the user has unsaved edits (avoids race-condition overwrite)
  useEffect(() => {
    if (!pilgrims.length) return;
    if (dirty) return; // don't overwrite ongoing edits
    const init: Record<string, { roomType: string; roomNumber: string }> = {};
    pilgrims.forEach((p) => {
      init[p.pilgrimId] = { roomType: p.roomType ?? "", roomNumber: p.roomNumber ?? "" };
    });
    setLocalRooms(init);
    setDirty(false);
  }, [pilgrims]); // eslint-disable-line react-hooks/exhaustive-deps

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const assignments = Object.entries(localRooms).map(([pilgrimId, val]) => ({
        pilgrimId,
        roomNumber: val.roomNumber,
        roomType: val.roomType,
      }));
      return apiFetch(`/api/admin/room-assignment/${selectedDeparture}/bulk`, {
        method: "POST",
        body: JSON.stringify(assignments),
      });
    },
    onSuccess: () => {
      toast.success("Penugasan kamar berhasil disimpan");
      qc.invalidateQueries({ queryKey: ["room-assignment-pilgrims", selectedDeparture] });
      setDirty(false);
    },
    onError: () => toast.error("Gagal menyimpan penugasan kamar"),
  });

  const handleRoomChange = (pilgrimId: string, field: "roomType" | "roomNumber", value: string) => {
    setLocalRooms((prev) => ({
      ...prev,
      [pilgrimId]: { ...prev[pilgrimId], [field]: value },
    }));
    setDirty(true);
  };

  const filtered = useMemo(() => {
    return pilgrims.filter((p) => {
      const matchName = !searchName || p.pilgrimName.toLowerCase().includes(searchName.toLowerCase());
      const localRoom = localRooms[p.pilgrimId]?.roomType ?? p.roomType ?? "";
      const matchRoom = filterRoom === "all" || localRoom === filterRoom;
      return matchName && matchRoom;
    });
  }, [pilgrims, searchName, filterRoom, localRooms]);

  const stats = useMemo(() => {
    const assigned = pilgrims.filter((p) => localRooms[p.pilgrimId]?.roomNumber).length;
    const byType = ROOM_TYPES.reduce<Record<string, number>>((acc, rt) => {
      acc[rt] = pilgrims.filter((p) => (localRooms[p.pilgrimId]?.roomType ?? p.roomType) === rt).length;
      return acc;
    }, {});
    return { total: pilgrims.length, assigned, byType };
  }, [pilgrims, localRooms]);

  const selectedDep = departures.find((d) => d.id === selectedDeparture);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BedDouble className="w-6 h-6 text-primary" />
            Room Assignment
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tugaskan jemaah ke tipe dan nomor kamar hotel per keberangkatan
          </p>
        </div>
        {dirty && (
          <Button onClick={() => bulkMutation.mutate()} disabled={bulkMutation.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            {bulkMutation.isPending ? "Menyimpan..." : "Simpan Semua Perubahan"}
          </Button>
        )}
      </div>

      {/* Departure Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label className="mb-1.5 block">Pilih Keberangkatan</Label>
              <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih keberangkatan..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingDepartures ? (
                    <SelectItem value="loading" disabled>Memuat...</SelectItem>
                  ) : (
                    departures.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.packageTitle} —{" "}
                        {d.departureDate
                          ? format(new Date(d.departureDate), "dd MMM yyyy", { locale: localeId })
                          : "-"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedDep && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(selectedDep.departureDate), "dd MMM yyyy", { locale: localeId })}
                  {selectedDep.returnDate &&
                    ` – ${format(new Date(selectedDep.returnDate), "dd MMM yyyy", { locale: localeId })}`}
                </span>
                <Badge variant="outline">Kuota: {selectedDep.quota}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedDeparture && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Jemaah</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">Sudah Assign</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.assigned}</p>
              </CardContent>
            </Card>
            {ROOM_TYPES.map((rt) => (
              <Card key={rt}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground capitalize">{rt}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.byType[rt] ?? 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama jemaah..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRoom} onValueChange={setFilterRoom}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe Kamar</SelectItem>
                {ROOM_TYPES.map((rt) => (
                  <SelectItem key={rt} value={rt}>{ROOM_TYPE_LABELS[rt]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Daftar Jemaah ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPilgrims ? (
                <div className="text-center py-8 text-muted-foreground">Memuat data jemaah...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {pilgrims.length === 0
                    ? "Belum ada jemaah untuk keberangkatan ini"
                    : "Tidak ada jemaah sesuai filter"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Booking</TableHead>
                        <TableHead>Nama Jemaah</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Tipe Kamar</TableHead>
                        <TableHead>No. Kamar</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p, i) => {
                        const local = localRooms[p.pilgrimId] ?? {
                          roomType: p.roomType ?? "",
                          roomNumber: p.roomNumber ?? "",
                        };
                        const isAssigned = !!local.roomNumber;
                        return (
                          <TableRow key={p.pilgrimId}>
                            <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                            <TableCell>
                              <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                {p.bookingCode}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{p.pilgrimName}</div>
                              {p.phone && <div className="text-xs text-muted-foreground">{p.phone}</div>}
                            </TableCell>
                            <TableCell>
                              {p.gender ? (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {p.gender === "male" ? "Pria" : p.gender === "female" ? "Wanita" : p.gender}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={local.roomType || ""}
                                onValueChange={(v) => handleRoomChange(p.pilgrimId, "roomType", v)}
                              >
                                <SelectTrigger className="w-36 h-8 text-sm">
                                  <SelectValue placeholder="Pilih tipe" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROOM_TYPES.map((rt) => (
                                    <SelectItem key={rt} value={rt}>{ROOM_TYPE_LABELS[rt]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                className="w-28 h-8 text-sm"
                                placeholder="cth: 101A"
                                value={local.roomNumber}
                                onChange={(e) => handleRoomChange(p.pilgrimId, "roomNumber", e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              {isAssigned ? (
                                <Badge className="bg-success/10 text-success border-success/20 text-xs gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Assigned
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Belum
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedDeparture && (
        <div className="text-center py-16 text-muted-foreground">
          <BedDouble className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Pilih keberangkatan terlebih dahulu</p>
          <p className="text-sm">untuk melihat dan mengatur penugasan kamar jemaah</p>
        </div>
      )}
    </div>
  );
};

export default AdminRoomAssignment;
