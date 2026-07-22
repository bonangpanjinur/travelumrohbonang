/**
 * PilgrimDetailDrawer — tampilkan & edit detail jamaah dari booking.
 * Mendukung mode view (default) dan mode edit (inline).
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  User, CreditCard, Phone, Mail, Calendar, Globe, Bed,
  ExternalLink, Pencil, Save, X, Loader2, PlaneTakeoff, Hash, StickyNote,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { apiFetch } from "@/shared/lib/apiClient";
import { useToast } from "@/shared/hooks/use-toast";

const ROOM_LABELS: Record<string, string> = {
  single: "Single (1 orang)",
  double: "Double (2 orang)",
  triple: "Triple (3 orang)",
  quad:   "Quad (4 orang)",
};

const GENDER_LABEL = (g: string | null | undefined): string => {
  if (!g) return "-";
  const low = g.toLowerCase();
  if (low === "l" || low === "male"   || low === "laki-laki") return "Laki-laki";
  if (low === "p" || low === "female" || low === "perempuan") return "Perempuan";
  return g;
};

export interface FullPilgrim {
  id: string;
  name: string;
  gender: string | null;
  phone?: string | null;
  email?: string | null;
  nik?: string | null;
  birthDate?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  roomType?: string | null;
  roomNumber?: string | null;
  nationality?: string | null;
  seatNumber?: string | null;
  flightSegment?: string | null;
  notes?: string | null;
}

interface PilgrimDetailDrawerProps {
  pilgrim: FullPilgrim | null;
  onClose: () => void;
  onUpdated?: (updated: FullPilgrim) => void;
}

// ── View row ──────────────────────────────────────────────────────────────────

const InfoRow = ({
  icon: Icon, label, value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) => {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </p>
      <p className="font-medium text-sm break-all">{value}</p>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

const PilgrimDetailDrawer = ({ pilgrim, onClose, onUpdated }: PilgrimDetailDrawerProps) => {
  const { toast } = useToast();
  const [editing, setEditing]   = useState(false);
  const [saving,  setSaving]    = useState(false);

  // Edit form state
  const [editName,           setEditName]           = useState("");
  const [editPhone,          setEditPhone]          = useState("");
  const [editEmail,          setEditEmail]          = useState("");
  const [editGender,         setEditGender]         = useState("");
  const [editNik,            setEditNik]            = useState("");
  const [editBirthDate,      setEditBirthDate]      = useState("");
  const [editPassportNumber, setEditPassportNumber] = useState("");
  const [editPassportExpiry, setEditPassportExpiry] = useState("");
  const [editNationality,    setEditNationality]    = useState("");
  const [editNotes,          setEditNotes]          = useState("");

  if (!pilgrim) return null;

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    try { return format(new Date(d), "d MMMM yyyy", { locale: localeId }); }
    catch { return d; }
  };

  const startEdit = () => {
    setEditName(pilgrim.name || "");
    setEditPhone(pilgrim.phone || "");
    setEditEmail(pilgrim.email || "");
    setEditGender(pilgrim.gender?.toLowerCase().includes("male") ? "male"
      : pilgrim.gender?.toLowerCase().includes("female") ? "female"
      : pilgrim.gender === "L" ? "male" : pilgrim.gender === "P" ? "female"
      : "");
    setEditNik(pilgrim.nik || "");
    setEditBirthDate(pilgrim.birthDate ? pilgrim.birthDate.slice(0, 10) : "");
    setEditPassportNumber(pilgrim.passportNumber || "");
    setEditPassportExpiry(pilgrim.passportExpiry ? pilgrim.passportExpiry.slice(0, 10) : "");
    setEditNationality(pilgrim.nationality || "");
    setEditNotes(pilgrim.notes || "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast({ title: "Nama jamaah tidak boleh kosong", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name:           editName.trim(),
        phone:          editPhone.trim() || null,
        email:          editEmail.trim() || null,
        gender:         editGender || null,
        nik:            editNik.trim() || null,
        birthDate:      editBirthDate || null,
        passportNumber: editPassportNumber.trim() || null,
        passportExpiry: editPassportExpiry || null,
        nationality:    editNationality.trim() || null,
        notes:          editNotes.trim() || null,
      };
      await apiFetch(`/api/admin/pilgrims/${pilgrim.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast({ title: "Data jamaah berhasil diupdate" });
      setEditing(false);
      onUpdated?.({
        ...pilgrim,
        ...payload,
        gender: editGender,
        birthDate: editBirthDate || null,
        passportExpiry: editPassportExpiry || null,
        notes: editNotes.trim() || null,
      });
    } catch (e: any) {
      toast({ title: "Gagal menyimpan", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!pilgrim} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Detail Jemaah
            </span>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={startEdit} className="h-7 gap-1.5 text-xs">
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="h-7 gap-1.5 text-xs"
                >
                  <X className="w-3 h-3" /> Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-7 gap-1.5 text-xs gradient-gold text-primary"
                >
                  {saving
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Save className="w-3 h-3" />}
                  Simpan
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name & gender banner */}
          <div className="p-4 bg-primary/5 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {(editing ? editName : pilgrim.name).charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{editing ? editName || "—" : pilgrim.name}</p>
              <Badge variant="secondary" className="text-xs mt-1">
                {GENDER_LABEL(editing ? editGender : pilgrim.gender)}
              </Badge>
            </div>
          </div>

          {/* View mode */}
          {!editing && (
            <div className="grid grid-cols-2 gap-3">
              <InfoRow icon={CreditCard}     label="NIK"             value={pilgrim.nik} />
              <InfoRow icon={Globe}          label="No. Passport"    value={pilgrim.passportNumber} />
              <InfoRow icon={Calendar}       label="Berlaku s/d"     value={formatDate(pilgrim.passportExpiry)} />
              <InfoRow icon={Calendar}       label="Tgl Lahir"       value={formatDate(pilgrim.birthDate)} />
              <InfoRow icon={Phone}          label="Telepon"         value={pilgrim.phone} />
              <InfoRow icon={Mail}           label="Email"           value={pilgrim.email} />
              <InfoRow icon={Bed}            label="Tipe Kamar"      value={pilgrim.roomType ? (ROOM_LABELS[pilgrim.roomType] || pilgrim.roomType) : null} />
              <InfoRow icon={Hash}           label="No. Kamar"       value={pilgrim.roomNumber} />
              <InfoRow icon={Globe}          label="Kewarganegaraan" value={pilgrim.nationality} />
              <InfoRow icon={PlaneTakeoff}   label="No. Kursi"       value={pilgrim.seatNumber} />
              <InfoRow icon={PlaneTakeoff}   label="Segmen Penerbangan" value={pilgrim.flightSegment} />
            </div>
          )}
          {/* Notes — full width, shown separately */}
          {!editing && pilgrim.notes && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                <StickyNote className="w-3 h-3" /> Catatan Internal
              </p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{pilgrim.notes}</p>
            </div>
          )}

          {/* Edit mode */}
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Lengkap *</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nama sesuai paspor"
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Jenis Kelamin</Label>
                  <Select value={editGender} onValueChange={setEditGender}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">No. HP</Label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="08xx..."
                    className="h-8 text-sm"
                    type="tel"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Email</Label>
                  <Input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="email@..."
                    className="h-8 text-sm"
                    type="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><CreditCard className="w-3 h-3" /> NIK</Label>
                  <Input
                    value={editNik}
                    onChange={(e) => setEditNik(e.target.value)}
                    placeholder="16 digit NIK"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Tgl Lahir</Label>
                  <Input
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="h-8 text-sm"
                    type="date"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> No. Paspor</Label>
                  <Input
                    value={editPassportNumber}
                    onChange={(e) => setEditPassportNumber(e.target.value)}
                    placeholder="A1234567"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Berlaku s/d</Label>
                  <Input
                    value={editPassportExpiry}
                    onChange={(e) => setEditPassportExpiry(e.target.value)}
                    className="h-8 text-sm"
                    type="date"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Kewarganegaraan</Label>
                  <Input
                    value={editNationality}
                    onChange={(e) => setEditNationality(e.target.value)}
                    placeholder="Indonesia"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <StickyNote className="w-3 h-3" /> Catatan Internal
                </Label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Contoh: butuh kursi roda, alergi seafood, mahram dengan Bapak Ahmad…"
                  className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {!editing && (
            <a
              href="/admin/pilgrims"
              className="inline-flex items-center gap-1 text-xs text-primary underline"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="w-3 h-3" /> Lihat di Database Jemaah
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PilgrimDetailDrawer;
