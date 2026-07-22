/**
 * PilgrimDocumentPanel — Feature 6: Upload dokumen jemaah
 * Menampilkan status dokumen (passport, visa, health_certificate, mahram_letter)
 * per jemaah dan memungkinkan admin upload file langsung.
 */
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import {
  ChevronDown, ChevronRight, Upload, CheckCircle2, Clock,
  XCircle, FileText, ExternalLink, Loader2, Trash2,
} from "lucide-react";

// ── constants ─────────────────────────────────────────────────────────────────
const DOCUMENT_TYPES = [
  { key: "passport",            label: "Paspor" },
  { key: "visa",                label: "Visa" },
  { key: "health_certificate",  label: "Surat Kesehatan" },
  { key: "mahram_letter",       label: "Surat Mahram" },
] as const;

type DocType = typeof DOCUMENT_TYPES[number]["key"];

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  verified:  { label: "Terverifikasi", cls: "bg-green-100 text-green-700 border-green-200",  icon: <CheckCircle2 className="w-3 h-3" /> },
  submitted: { label: "Dikirim",       cls: "bg-blue-100  text-blue-700  border-blue-200",   icon: <Clock className="w-3 h-3" /> },
  rejected:  { label: "Ditolak",       cls: "bg-red-100   text-red-700   border-red-200",    icon: <XCircle className="w-3 h-3" /> },
  missing:   { label: "Belum ada",     cls: "bg-gray-100  text-gray-500  border-gray-200",   icon: <FileText className="w-3 h-3" /> },
};

// ── types ─────────────────────────────────────────────────────────────────────
interface Pilgrim { id: string; name: string; }
interface PilgrimDoc { id: string; documentType: string; status: string; fileUrl: string | null; notes: string | null; }

interface Props {
  bookingId: string;
  pilgrims: Pilgrim[];
}

// ── per-pilgrim document row ───────────────────────────────────────────────────
function DocSlot({
  pilgrimId, bookingId, docType, label, doc, onRefresh,
}: {
  pilgrimId: string; bookingId: string; docType: DocType; label: string;
  doc: PilgrimDoc | undefined; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const status = doc?.status ?? "missing";
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.missing;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      // 1. Upload file → dapat URL
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch(
        (import.meta.env.BASE_URL ?? "").replace(/\/$/, "") + "/api/admin/pilgrim-documents/upload",
        { method: "POST", body: fd, credentials: "include" },
      );
      if (!uploadRes.ok) throw new Error((await uploadRes.json())?.error ?? "Upload gagal");
      const { url } = await uploadRes.json();

      // 2. Simpan metadata dokumen
      await apiFetch("/api/admin/pilgrim-documents", {
        method: "PUT",
        body: JSON.stringify({ pilgrimId, bookingId, documentType: docType, fileUrl: url, status: "submitted" }),
      });
      toast({ title: `${label} berhasil diupload` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Gagal upload", description: err?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/pilgrim-documents/${doc.id}`, { method: "DELETE" });
      toast({ title: `${label} dihapus` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Gagal hapus dokumen", description: err?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleVerify = async () => {
    if (!doc) return;
    try {
      await apiFetch("/api/admin/pilgrim-documents", {
        method: "PUT",
        body: JSON.stringify({ pilgrimId, bookingId, documentType: docType, fileUrl: doc.fileUrl, status: "verified" }),
      });
      toast({ title: `${label} diverifikasi` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Gagal verifikasi", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleUpload} />
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className={`text-[10px] py-0 px-1.5 gap-1 shrink-0 ${cfg.cls}`}>
          {cfg.icon}{cfg.label}
        </Badge>
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {doc?.fileUrl && (
          <>
            <a
              href={(import.meta.env.BASE_URL ?? "").replace(/\/$/, "") + doc.fileUrl}
              target="_blank" rel="noreferrer"
              className="text-muted-foreground hover:text-primary"
              title="Lihat file"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
            {status !== "verified" && (
              <button onClick={handleVerify} className="text-xs text-green-600 hover:text-green-700 font-medium px-1" title="Verifikasi">
                ✓
              </button>
            )}
            <button onClick={handleDelete} disabled={deleting} className="text-muted-foreground hover:text-destructive" title="Hapus">
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </button>
          </>
        )}
        <Button
          size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Upload className="w-2.5 h-2.5" />}
          {doc ? "Ganti" : "Upload"}
        </Button>
      </div>
    </div>
  );
}

// ── per-pilgrim accordion ──────────────────────────────────────────────────────
function PilgrimDocAccordion({ pilgrim, bookingId }: { pilgrim: Pilgrim; bookingId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: PilgrimDoc[] }>({
    queryKey: ["pilgrim-docs", pilgrim.id],
    queryFn: () => apiFetch(`/api/admin/pilgrim-documents?pilgrimId=${pilgrim.id}`),
    enabled: open,
  });

  const docs = data?.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["pilgrim-docs", pilgrim.id] });

  // summary badge
  const verifiedCount = docs.filter((d) => d.status === "verified").length;
  const hasAny = docs.length > 0;
  const total = DOCUMENT_TYPES.length;

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
          <span className="font-medium truncate">{pilgrim.name}</span>
        </div>
        <span className={`text-xs shrink-0 ml-2 ${verifiedCount === total ? "text-green-600" : hasAny ? "text-amber-500" : "text-muted-foreground"}`}>
          {verifiedCount}/{total} terverifikasi
        </span>
      </button>

      {open && (
        <div className="px-3 pb-2 pt-1 bg-muted/20">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Memuat…
            </div>
          ) : (
            DOCUMENT_TYPES.map(({ key, label }) => (
              <DocSlot
                key={key}
                pilgrimId={pilgrim.id}
                bookingId={bookingId}
                docType={key}
                label={label}
                doc={docs.find((d) => d.documentType === key)}
                onRefresh={refresh}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────
export default function PilgrimDocumentPanel({ bookingId, pilgrims }: Props) {
  if (pilgrims.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Klik nama jemaah untuk upload/lihat dokumen (paspor, visa, surat kesehatan, surat mahram).
      </p>
      {pilgrims.map((p) => (
        <PilgrimDocAccordion key={p.id} pilgrim={p} bookingId={bookingId} />
      ))}
    </div>
  );
}
