import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, differenceInDays, isPast } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Search, Upload, FileCheck, FileX, AlertTriangle, Eye, CheckCircle, XCircle,
  Clock, Users, FileText, Filter, ChevronDown, ChevronRight
} from "lucide-react";

const DOC_TYPES = [
  { value: "paspor", label: "Paspor", hasExpiry: true },
  { value: "visa", label: "Visa", hasExpiry: true },
  { value: "ktp", label: "KTP", hasExpiry: true },
  { value: "foto", label: "Foto", hasExpiry: false },
  { value: "surat_mahram", label: "Surat Mahram", hasExpiry: false },
  { value: "lainnya", label: "Lainnya", hasExpiry: false },
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

const Documents = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedPilgrims, setExpandedPilgrims] = useState<Set<string>>(new Set());
  const [uploadDialog, setUploadDialog] = useState<{ open: boolean; pilgrimId: string; docType: string } | null>(null);
  const [verifyDialog, setVerifyDialog] = useState<{ open: boolean; doc: DocRecord } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExpiry, setUploadExpiry] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch pilgrims with their documents
  const { data: pilgrims = [], isLoading } = useQuery({
    queryKey: ["pilgrim-documents", search, statusFilter],
    queryFn: async () => {
      // Get pilgrims with booking info
      let pilgrimQuery = supabase
        .from("booking_pilgrims")
        .select("*, bookings(booking_code, packages(title))")
        .order("created_at", { ascending: false });

      if (search) {
        pilgrimQuery = pilgrimQuery.or(`name.ilike.%${search}%,passport_number.ilike.%${search}%`);
      }

      const { data: pilgrimData, error: pilgrimError } = await pilgrimQuery;
      if (pilgrimError) throw pilgrimError;

      // Get all documents
      const pilgrimIds = (pilgrimData || []).map((p: any) => p.id);
      let docsData: any[] = [];
      if (pilgrimIds.length > 0) {
        const { data, error } = await supabase
          .from("pilgrim_documents")
          .select("*")
          .in("pilgrim_id", pilgrimIds);
        if (error) throw error;
        docsData = data || [];
      }

      // Map pilgrims with docs
      const result: PilgrimWithDocs[] = (pilgrimData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        passport_number: p.passport_number,
        passport_expiry: p.passport_expiry,
        booking_id: p.booking_id,
        booking_code: p.bookings?.booking_code,
        package_title: p.bookings?.packages?.title,
        documents: docsData.filter((d: any) => d.pilgrim_id === p.id),
      }));

      // Filter by document status
      if (statusFilter === "incomplete") {
        return result.filter(p => {
          const uploadedTypes = p.documents.filter(d => d.status !== "belum_upload").map(d => d.doc_type);
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
        return result.filter(p => {
          const requiredDocs = ["paspor", "ktp", "foto"];
          return requiredDocs.every(dt => p.documents.some(d => d.doc_type === dt && d.status === "verified"));
        });
      }

      return result;
    },
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ pilgrimId, docType, file, expiryDate }: {
      pilgrimId: string; docType: string; file: File; expiryDate?: string;
    }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${pilgrimId}/${docType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("pilgrim-documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("pilgrim-documents")
        .getPublicUrl(filePath);

      // Check if doc record exists
      const { data: existing } = await supabase
        .from("pilgrim_documents")
        .select("id")
        .eq("pilgrim_id", pilgrimId)
        .eq("doc_type", docType)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("pilgrim_documents")
          .update({
            file_url: publicUrl,
            file_name: file.name,
            status: "uploaded",
            expiry_date: expiryDate || null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pilgrim_documents")
          .insert({
            pilgrim_id: pilgrimId,
            doc_type: docType,
            file_url: publicUrl,
            file_name: file.name,
            status: "uploaded",
            expiry_date: expiryDate || null,
          });
        if (error) throw error;
      }
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

  // Verify/reject mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ docId, status, notes }: { docId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from("pilgrim_documents")
        .update({
          status,
          notes: notes || null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pilgrim-documents"] });
      toast.success("Status dokumen diperbarui");
      setVerifyDialog(null);
      setRejectNotes("");
    },
    onError: (e: any) => toast.error("Gagal update: " + e.message),
  });

  // Initialize documents for a pilgrim
  const initDocsMutation = useMutation({
    mutationFn: async (pilgrimId: string) => {
      const { data: existing } = await supabase
        .from("pilgrim_documents")
        .select("doc_type")
        .eq("pilgrim_id", pilgrimId);

      const existingTypes = (existing || []).map((d: any) => d.doc_type);
      const missing = DOC_TYPES.filter(dt => !existingTypes.includes(dt.value));

      if (missing.length > 0) {
        const { error } = await supabase
          .from("pilgrim_documents")
          .insert(missing.map(dt => ({
            pilgrim_id: pilgrimId,
            doc_type: dt.value,
            status: "belum_upload",
          })));
        if (error) throw error;
      }
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
    const required = ["paspor", "ktp", "foto"];
    const verified = required.filter(dt => p.documents.some(d => d.doc_type === dt && d.status === "verified"));
    return Math.round((verified.length / required.length) * 100);
  };

  const getExpiryWarning = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return { text: "Kadaluarsa!", color: "text-destructive" };
    if (days < 180) return { text: `${days} hari lagi`, color: "text-amber-600" };
    return null;
  };

  // Stats
  const totalPilgrims = pilgrims.length;
  const completePilgrims = pilgrims.filter(p => getCompletionPercent(p) === 100).length;
  const expiredDocs = pilgrims.filter(p =>
    p.documents.some(d => d.expiry_date && isPast(new Date(d.expiry_date))) ||
    (p.passport_expiry && differenceInDays(new Date(p.passport_expiry), new Date()) < 180)
  ).length;
  const pendingVerify = pilgrims.reduce((acc, p) => acc + p.documents.filter(d => d.status === "uploaded").length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dokumen Jemaah</h1>
          <p className="text-muted-foreground">Kelola dan tracking kelengkapan dokumen jemaah</p>
        </div>
      </div>

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
                      initDocsMutation.mutate(pilgrim.id);
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
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                    className="text-primary hover:underline text-sm flex items-center gap-1">
                                    <Eye className="w-3 h-3" />{doc.file_name || "Lihat"}
                                  </a>
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
                                    onClick={() => setUploadDialog({ open: true, pilgrimId: pilgrim.id, docType: dt.value })}>
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
              <a href={verifyDialog.doc.file_url} target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1">
                <Eye className="w-4 h-4" /> Lihat Dokumen
              </a>
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

export default Documents;
