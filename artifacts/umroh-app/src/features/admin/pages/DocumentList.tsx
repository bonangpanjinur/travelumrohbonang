import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { toast } from "sonner";
import { format, differenceInDays, isPast } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { getSignedPilgrimDocUrl } from "@/features/jamaah/lib/pilgrimDocs";
import {
  Search, Upload, FileCheck, FileX, AlertTriangle, Eye, CheckCircle, XCircle,
  Clock, Users, FileText, Filter, ChevronDown, ChevronRight
} from "lucide-react";

// DOC_TYPES sekarang dimuat dari API (/api/admin/document-types)
const FALLBACK_DOC_TYPES = [
  { value: "paspor", label: "Paspor", hasExpiry: true },
  { value: "ktp",    label: "KTP",    hasExpiry: true },
  { value: "foto",   label: "Foto",   hasExpiry: false },
];

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof FileCheck }> = {
  belum_upload: { label: "Belum Upload", variant: "outline", icon: Clock },
  uploaded: { label: "Diupload", variant: "secondary", icon: Upload },
  verified: { label: "Terverifikasi", variant: "default", icon: CheckCircle },
  rejected: { label: "Ditolak", variant: "destructive", icon: XCircle },
  expired: { label: "Kadaluarsa", variant: "destructive", icon: AlertTriangle },
};

interface PilgrimWithDocs {
  id: string;
  name: string;
  passport_number: string | null;
  passport_expiry: string | null;
  booking_id: string | null;
  booking_code?: string;
  package_title?: string;
  documents: DocRecord[];
}

interface DocRecord {
  id: string;
  pilgrim_id: string;
  doc_type: string;
  file_url: string | null;
  file_name: string | null;
  status: string;
  expiry_date: string | null;
  notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ApiDocType {
  id: string; code: string; label: string;
  hasExpiry: boolean; isRequired: boolean; isActive: boolean;
}

const DocumentList = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: apiDocTypes = [] } = useQuery<ApiDocType[]>({
    queryKey: ["document-types", "active"],
    queryFn: () => apiFetch("/api/admin/document-types?activeOnly=true"),
    staleTime: 5 * 60 * 1000,
  });

  const DOC_TYPES = useMemo(() => {
    if (apiDocTypes.length > 0) {
      return apiDocTypes.map(d => ({ value: d.code, label: d.label, hasExpiry: d.hasExpiry, isRequired: d.isRequired }));
    }
    return FALLBACK_DOC_TYPES.map(d => ({ ...d, isRequired: true }));
  }, [apiDocTypes]);

  const REQUIRED_DOC_CODES = useMemo(() => DOC_TYPES.filter(d => d.isRequired).map(d => d.value), [DOC_TYPES]);
  const [expandedPilgrims, setExpandedPilgrims] = useState<Set<string>>(new Set());
  const [uploadDialog, setUploadDialog] = useState<{ open: boolean; pilgrimId: string; bookingId: string | null; docType: string } | null>(null);
  const [verifyDialog, setVerifyDialog] = useState<{ open: boolean; doc: DocRecord } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExpiry, setUploadExpiry] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: pilgrims = [], isLoading } = useQuery({
    queryKey: ["pilgrim-documents", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const result = await apiFetch<PilgrimWithDocs[]>(
        `/api/admin/pilgrim-documents/pilgrims?${params}`,
      );
      if (statusFilter === "incomplete") {
        return result.filter(p => {
          const uploadedTypes = p.documents.filter(d => d.status !== "pending").map(d => d.doc_type);
          return DOC_TYPES.some(dt => !uploadedTypes.includes(dt.value));
        });
      }
      if (statusFilter === "expired") {
        return result.filter(p =>
          p.documents.some(d => d.expiry_date && isPast(new Date(d.expiry_date))) ||
          (p.passport_expiry && differenceInDays(new Date(p.passport_expiry), new Date()) < 180)
        );
      }
      if (statusFilter === "verified") {
        return result.filter(p =>
          REQUIRED_DOC_CODES.every(dt => p.documents.some(d => d.doc_type === dt && d.status === "verified"))
        );
      }
      return result;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ pilgrimId, bookingId, docType, file }: {
      pilgrimId: string; bookingId: string | null; docType: string; file: File; expiryDate?: string;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      const { url } = await apiFetch<{ url: string }>(
        "/api/admin/pilgrim-documents/upload",
        { method: "POST", body: formData },
      );
      await apiFetch("/api/admin/pilgrim-documents", {
        method: "PUT",
        body: JSON.stringify({
          pilgrimId,
          bookingId: bookingId || undefined,
          documentType: docType,
          fileUrl: url,
          status: "submitted",
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pilgrim-documents"] });
      toast.success("Dokumen berhasil diupload");
      setUploadDialog(null);
      setUploadFile(null);
      setUploadExpiry("");
    },
    onError: (e: any) => toast.error("Gagal upload: " + e.message),
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ docId, status, notes }: { docId: string; status: string; notes?: string }) => {
      await apiFetch(`/api/admin/pilgrim-documents/${docId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, notes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pilgrim-documents"] });
      toast.success("Status dokumen diperbarui");
      setVerifyDialog(null);
      setRejectNotes("");
    },
    onError: (e: any) => toast.error("Gagal update: " + e.message),
  });

  const initDocsMutation = useMutation({
    mutationFn: async ({ pilgrimId, bookingId }: { pilgrimId: string; bookingId: string | null }) => {
      if (!bookingId) return;
      await apiFetch(`/api/admin/pilgrim-documents/init-pilgrim/${pilgrimId}`, {
        method: "POST",
        body: JSON.stringify({ bookingId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pilgrim-documents"] });
    },
  });

  const togglePilgrim = (id: string) => {
    setExpandedPilgrims(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getCompletionPercent = (p: PilgrimWithDocs) => {
    if (REQUIRED_DOC_CODES.length === 0) return 0;
    const verified = REQUIRED_DOC_CODES.filter(dt => p.documents.some(d => d.doc_type === dt && d.status === "verified"));
    return Math.round((verified.length / REQUIRED_DOC_CODES.length) * 100);
  };

  const getExpiryWarning = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return { text: "Kadaluarsa!", color: "text-destructive" };
    if (days < 180) return { text: `${days} hari lagi`, color: "text-amber-600" };
    return null;
  };

  const totalPilgrims = pilgrims.length;
  const completePilgrims = pilgrims.filter(p => getCompletionPercent(p) === 100).length;
  const expiredDocs = pilgrims.filter(p =>
    p.documents.some(d => d.expiry_date && isPast(new Date(d.expiry_date))) ||
    (p.passport_expiry && differenceInDays(new Date(p.passport_expiry), new Date()) < 180)
  ).length;
  const pendingVerify = pilgrims.reduce((acc, p) => acc + p.documents.filter(d => d.status === "uploaded").length, 0);

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{totalPilgrims}</p><p className="text-xs text-muted-foreground">Total Jemaah</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><FileCheck className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold">{completePilgrims}</p><p className="text-xs text-muted-foreground">Dokumen Lengkap</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold">{expiredDocs}</p><p className="text-xs text-muted-foreground">Perlu Perhatian</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{pendingVerify}</p><p className="text-xs text-muted-foreground">Menunggu Verifikasi</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nama/paspor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jemaah</SelectItem>
                <SelectItem value="incomplete">Belum Lengkap</SelectItem>
                <SelectItem value="expired">Expired/Perhatian</SelectItem>
                <SelectItem value="verified">Sudah Lengkap</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pilgrim List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : pilgrims.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada data jemaah</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pilgrims.map(pilgrim => {
            const isExpanded = expandedPilgrims.has(pilgrim.id);
            const completion = getCompletionPercent(pilgrim);
            const passportWarning = getExpiryWarning(pilgrim.passport_expiry);

            return (
              <Card key={pilgrim.id} className="overflow-hidden">
                <button
                  onClick={() => {
                    togglePilgrim(pilgrim.id);
                    if (!isExpanded && pilgrim.documents.length === 0) {
                      initDocsMutation.mutate({ pilgrimId: pilgrim.id, bookingId: pilgrim.booking_id });
                    }
                  }}
                  className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{pilgrim.name}</span>
                      {pilgrim.booking_code && (
                        <Badge variant="outline" className="text-xs">{pilgrim.booking_code}</Badge>
                      )}
                      {pilgrim.package_title && (
                        <span className="text-xs text-muted-foreground truncate">{pilgrim.package_title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {pilgrim.passport_number && <span>Paspor: {pilgrim.passport_number}</span>}
                      {passportWarning && (
                        <span className={`font-medium ${passportWarning.color}`}>
                          ⚠ Paspor {passportWarning.text}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-medium">{completion}%</div>
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${completion === 100 ? "bg-green-500" : completion > 0 ? "bg-amber-500" : "bg-muted-foreground/30"}`}
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jenis Dokumen</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>File</TableHead>
                          <TableHead>Kadaluarsa</TableHead>
                          <TableHead>Catatan</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {DOC_TYPES.map(dt => {
                          const doc = pilgrim.documents.find(d => d.doc_type === dt.value);
                          const status = doc?.status || "belum_upload";
                          const config = STATUS_CONFIG[status];
                          const expiryWarning = doc?.expiry_date ? getExpiryWarning(doc.expiry_date) : null;
                          const StatusIcon = config.icon;

                          return (
                            <TableRow key={dt.value}>
                              <TableCell className="font-medium">{dt.label}</TableCell>
                              <TableCell>
                                <Badge variant={config.variant} className="gap-1">
                                  <StatusIcon className="w-3 h-3" />
                                  {config.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {doc?.file_url ? (
                                  <button type="button"
                                    onClick={async () => {
                                      const signed = await getSignedPilgrimDocUrl({
                                        fileUrlOrPath: doc.file_url!,
                                        pilgrimId: pilgrim.id,
                                        docType: doc.doc_type,
                                        context: "admin_documents_view",
                                      });
                                      if (signed) window.open(signed, "_blank");
                                      else toast.error("Tidak dapat membuka file");
                                    }}
                                    className="text-primary hover:underline text-sm flex items-center gap-1">
                                    <Eye className="w-3 h-3" />{doc.file_name || "Lihat"}
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {doc?.expiry_date ? (
                                  <span className={expiryWarning?.color || ""}>
                                    {format(new Date(doc.expiry_date), "dd MMM yyyy", { locale: localeId })}
                                    {expiryWarning && <span className="block text-xs">{expiryWarning.text}</span>}
                                  </span>
                                ) : dt.hasExpiry ? (
                                  <span className="text-muted-foreground text-sm">Belum diisi</span>
                                ) : "-"}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">{doc?.notes || "-"}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" variant="outline"
                                    onClick={() => setUploadDialog({ open: true, pilgrimId: pilgrim.id, bookingId: pilgrim.booking_id, docType: dt.value })}>
                                    <Upload className="w-3 h-3 mr-1" />Upload
                                  </Button>
                                  {doc && doc.status === "uploaded" && (
                                    <Button size="sm" variant="default"
                                      onClick={() => setVerifyDialog({ open: true, doc })}>
                                      <CheckCircle className="w-3 h-3 mr-1" />Verifikasi
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={!!uploadDialog?.open} onOpenChange={() => setUploadDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload {DOC_TYPES.find(d => d.value === uploadDialog?.docType)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>File Dokumen</Label>
              <Input type="file" accept="image/*,.pdf" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground mt-1">Format: JPG, PNG, PDF. Max 5MB</p>
            </div>
            {DOC_TYPES.find(d => d.value === uploadDialog?.docType)?.hasExpiry && (
              <div>
                <Label>Tanggal Kadaluarsa</Label>
                <Input type="date" value={uploadExpiry} onChange={e => setUploadExpiry(e.target.value)} />
              </div>
            )}
            <Button
              className="w-full"
              disabled={!uploadFile || uploading}
              onClick={() => {
                if (!uploadFile || !uploadDialog) return;
                setUploading(true);
                uploadMutation.mutate({
                  pilgrimId: uploadDialog.pilgrimId,
                  bookingId: uploadDialog.bookingId,
                  docType: uploadDialog.docType,
                  file: uploadFile,
                  expiryDate: uploadExpiry || undefined,
                }, { onSettled: () => setUploading(false) });
              }}
            >
              {uploading ? "Mengupload..." : "Upload Dokumen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={!!verifyDialog?.open} onOpenChange={() => { setVerifyDialog(null); setRejectNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Dokumen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {verifyDialog?.doc.file_url && (
              <button type="button"
                onClick={async () => {
                  const signed = await getSignedPilgrimDocUrl({
                    fileUrlOrPath: verifyDialog!.doc.file_url!,
                    pilgrimId: (verifyDialog!.doc as any).pilgrim_id,
                    docType: verifyDialog!.doc.doc_type,
                    context: "admin_verify_dialog",
                  });
                  if (signed) window.open(signed, "_blank");
                  else toast.error("Tidak dapat membuka file");
                }}
                className="text-primary hover:underline flex items-center gap-1">
                <Eye className="w-4 h-4" /> Lihat Dokumen
              </button>
            )}
            <div>
              <Label>Catatan (opsional, wajib jika ditolak)</Label>
              <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} placeholder="Alasan penolakan..." />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variant="default"
                onClick={() => verifyDialog && verifyMutation.mutate({ docId: verifyDialog.doc.id, status: "verified" })}>
                <CheckCircle className="w-4 h-4 mr-1" /> Setujui
              </Button>
              <Button className="flex-1" variant="destructive"
                disabled={!rejectNotes.trim()}
                onClick={() => verifyDialog && verifyMutation.mutate({ docId: verifyDialog.doc.id, status: "rejected", notes: rejectNotes })}>
                <XCircle className="w-4 h-4 mr-1" /> Tolak
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentList;
