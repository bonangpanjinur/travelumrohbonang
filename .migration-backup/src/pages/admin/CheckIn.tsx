import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ScanLine, Camera, Square, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type Recent = {
  id: string;
  pilgrim_id: string;
  checked_in_at: string;
  location: string | null;
  pilgrim_name?: string;
};

const AdminCheckIn = () => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [location, setLocation] = useState("Bandara CGK Terminal 3");
  const [recent, setRecent] = useState<Recent[]>([]);
  const lastScanRef = useRef<string>("");
  const lastTimeRef = useRef<number>(0);

  const loadRecent = async () => {
    const { data } = await supabase
      .from("check_ins")
      .select("id, pilgrim_id, checked_in_at, location, booking_pilgrims(name)")
      .order("checked_in_at", { ascending: false })
      .limit(20);
    setRecent(
      (data || []).map((r: any) => ({
        id: r.id,
        pilgrim_id: r.pilgrim_id,
        checked_in_at: r.checked_in_at,
        location: r.location,
        pilgrim_name: r.booking_pilgrims?.name,
      }))
    );
  };

  useEffect(() => {
    loadRecent();
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const handleScan = async (decoded: string) => {
    // Debounce duplicates within 3 seconds
    const now = Date.now();
    if (decoded === lastScanRef.current && now - lastTimeRef.current < 3000) return;
    lastScanRef.current = decoded;
    lastTimeRef.current = now;

    let payload: any;
    try {
      payload = JSON.parse(decoded);
    } catch {
      // accept raw pilgrim_id too
      payload = { pilgrim_id: decoded };
    }
    if (!payload.pilgrim_id) {
      toast.error("QR tidak valid");
      return;
    }

    const { data: pilgrim } = await supabase
      .from("booking_pilgrims")
      .select("id, name, booking_id")
      .eq("id", payload.pilgrim_id)
      .maybeSingle();

    if (!pilgrim) {
      toast.error("Jemaah tidak ditemukan");
      return;
    }

    const { error } = await supabase.from("check_ins").insert({
      pilgrim_id: pilgrim.id,
      departure_id: payload.departure_id || null,
      booking_id: pilgrim.booking_id,
      location,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`✓ Check-in: ${pilgrim.name}`);
      loadRecent();
    }
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        handleScan,
        () => {}
      );
    } catch (e: any) {
      toast.error(e.message || "Gagal akses kamera");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      await scannerRef.current?.stop();
      await scannerRef.current?.clear();
    } catch {}
    scannerRef.current = null;
    setScanning(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-primary" /> Check-In QR Jemaah
        </h1>
        <p className="text-muted-foreground text-sm">Scan QR pada manifest untuk mencatat kehadiran.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scanner</CardTitle>
          <CardDescription>Arahkan kamera ke QR code jemaah.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5 max-w-md">
            <Label>Lokasi Check-in</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div id="qr-reader" className="max-w-md mx-auto rounded-lg overflow-hidden bg-muted" />
          <div className="flex gap-2">
            {!scanning ? (
              <Button onClick={startScanner}>
                <Camera className="w-4 h-4 mr-2" /> Mulai Scanner
              </Button>
            ) : (
              <Button variant="destructive" onClick={stopScanner}>
                <Square className="w-4 h-4 mr-2" /> Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Check-in Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Belum ada check-in</p>
          ) : (
            <ul className="divide-y">
              {recent.map((r) => (
                <li key={r.id} className="py-2 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.pilgrim_name || r.pilgrim_id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{r.location || "-"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(r.checked_in_at), "HH:mm dd/MM", { locale: localeId })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCheckIn;
