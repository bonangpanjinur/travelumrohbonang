import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { apiFetch } from "@/shared/lib/apiClient";
import { toast } from "sonner";
import { Loader2, Bed } from "lucide-react";

const ROOM_LABELS: Record<string, string> = {
  single: "Single (1 orang)",
  double: "Double (2 orang)",
  triple: "Triple (3 orang)",
  quad: "Quad (4 orang)",
};

interface RoomPrice {
  roomType: string;
  price: number;
}

interface CurrentRoom {
  roomType: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface ChangeRoomModalProps {
  bookingId: string;
  departureId: string | null;
  currentRooms: CurrentRoom[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ChangeRoomModal = ({
  bookingId,
  departureId,
  currentRooms,
  open,
  onOpenChange,
  onSuccess,
}: ChangeRoomModalProps) => {
  const [roomPrices, setRoomPrices] = useState<RoomPrice[]>([]);
  const [roomType, setRoomType] = useState(currentRooms[0]?.roomType || "double");
  const [quantity, setQuantity] = useState(String(currentRooms[0]?.quantity || 1));
  const [price, setPrice] = useState(String(currentRooms[0]?.price || 0));
  const [saving, setSaving] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Fetch departure prices when modal opens
  useEffect(() => {
    if (!open || !departureId) return;
    setLoadingPrices(true);
    apiFetch<any[]>(
      `/rest/v1/departure_prices?departure_id=eq.${departureId}&select=room_type,price&order=price.asc`
    )
      .then((rows) => {
        if (rows?.length) {
          setRoomPrices(
            rows.map((r: any) => ({ roomType: r.room_type, price: Number(r.price) }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrices(false));
  }, [open, departureId]);

  // Auto-fill price when room type changes (if departure prices available)
  useEffect(() => {
    const found = roomPrices.find((r) => r.roomType === roomType);
    if (found) setPrice(String(found.price));
  }, [roomType, roomPrices]);

  const subtotal = Number(price || 0) * Number(quantity || 1);

  const handleSave = async () => {
    if (!roomType) { toast.error("Pilih tipe kamar"); return; }
    if (Number(quantity) < 1) { toast.error("Jumlah harus minimal 1"); return; }
    if (Number(price) <= 0) { toast.error("Harga harus lebih dari 0"); return; }

    setSaving(true);
    try {
      await apiFetch(`/api/admin/bookings/${bookingId}/room`, {
        method: "PATCH",
        body: JSON.stringify({
          roomType,
          quantity: Number(quantity),
          price: Number(price),
          subtotal,
        }),
      });
      toast.success("Kamar berhasil diubah");
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengubah kamar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bed className="w-5 h-5 text-primary" />
            Ubah Tipe Kamar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Current rooms */}
          {currentRooms.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-xs text-muted-foreground mb-1">Kamar saat ini</p>
              {currentRooms.map((r, i) => (
                <p key={i} className="font-medium">
                  {ROOM_LABELS[r.roomType] || r.roomType} × {r.quantity} —{" "}
                  Rp {Number(r.price).toLocaleString("id-ID")}/pax
                </p>
              ))}
            </div>
          )}

          {/* Room type select */}
          <div className="space-y-2">
            <Label>Tipe Kamar Baru</Label>
            <Select value={roomType} onValueChange={setRoomType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {loadingPrices ? (
                  <div className="flex justify-center p-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : roomPrices.length > 0 ? (
                  roomPrices.map((r) => (
                    <SelectItem key={r.roomType} value={r.roomType}>
                      {ROOM_LABELS[r.roomType] || r.roomType} — Rp{" "}
                      {r.price.toLocaleString("id-ID")}
                    </SelectItem>
                  ))
                ) : (
                  Object.entries(ROOM_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jumlah Orang</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Harga / Pax (Rp)</Label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Subtotal preview */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex justify-between text-sm font-semibold">
            <span>Subtotal Baru</span>
            <span className="text-primary">Rp {subtotal.toLocaleString("id-ID")}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeRoomModal;
