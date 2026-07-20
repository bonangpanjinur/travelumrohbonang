import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { User, CreditCard, Phone, Mail, Calendar, Globe, Bed, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const ROOM_LABELS: Record<string, string> = {
  single: "Single (1 orang)",
  double: "Double (2 orang)",
  triple: "Triple (3 orang)",
  quad: "Quad (4 orang)",
};

const GENDER_LABEL = (g: string | null | undefined): string => {
  if (!g) return "-";
  const low = g.toLowerCase();
  if (low === "l" || low === "male" || low === "laki-laki") return "Laki-laki";
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
  nationality?: string | null;
}

interface PilgrimDetailDrawerProps {
  pilgrim: FullPilgrim | null;
  onClose: () => void;
}

const InfoRow = ({
  icon: Icon,
  label,
  value,
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

const PilgrimDetailDrawer = ({ pilgrim, onClose }: PilgrimDetailDrawerProps) => {
  if (!pilgrim) return null;

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    try {
      return format(new Date(d), "d MMMM yyyy", { locale: localeId });
    } catch {
      return d;
    }
  };

  return (
    <Dialog open={!!pilgrim} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Detail Jemaah
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name + gender banner */}
          <div className="p-4 bg-primary/5 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {pilgrim.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{pilgrim.name}</p>
              <Badge variant="secondary" className="text-xs mt-1">
                {GENDER_LABEL(pilgrim.gender)}
              </Badge>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow icon={CreditCard} label="NIK" value={pilgrim.nik} />
            <InfoRow icon={Globe} label="No. Passport" value={pilgrim.passportNumber} />
            <InfoRow icon={Calendar} label="Berlaku s/d" value={formatDate(pilgrim.passportExpiry)} />
            <InfoRow icon={Calendar} label="Tgl Lahir" value={formatDate(pilgrim.birthDate)} />
            <InfoRow icon={Phone} label="Telepon" value={pilgrim.phone} />
            <InfoRow icon={Mail} label="Email" value={pilgrim.email} />
            <InfoRow
              icon={Bed}
              label="Tipe Kamar"
              value={pilgrim.roomType ? (ROOM_LABELS[pilgrim.roomType] || pilgrim.roomType) : null}
            />
            <InfoRow icon={Globe} label="Kewarganegaraan" value={pilgrim.nationality} />
          </div>

          <a
            href="/admin/pilgrims"
            className="inline-flex items-center gap-1 text-xs text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="w-3 h-3" /> Lihat di Database Jemaah
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PilgrimDetailDrawer;
