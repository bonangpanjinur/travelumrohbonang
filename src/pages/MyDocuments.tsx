import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, Eye } from "lucide-react";

const DOC_TYPES = [
  { type: "paspor", label: "Paspor", required: true },
  { type: "ktp", label: "KTP", required: true },
  { type: "foto", label: "Foto 4x6", required: true },
  { type: "kartu_keluarga", label: "Kartu Keluarga", required: false },
  { type: "buku_nikah", label: "Buku Nikah", required: false },
  { type: "surat_mahram", label: "Surat Mahram", required: false },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  belum_upload: { label: "Belum Upload", variant: "outline", icon: AlertCircle },
  uploaded: { label: "Menunggu Verifikasi", variant: "secondary", icon: Clock },
  verified: { label: "Terverifikasi", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Ditolak", variant: "destructive", icon: AlertCircle },
};

const MyDocuments = () => {
  const { user, loading } = useAuth();
  const [pilgrims, setPilgrims] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    // Get user's bookings -> pilgrims
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("user_id", user.id);

    if (!bookings?.length) {
      setLoadingData(false);
      return;
    }

    const bookingIds = bookings.map((b) => b.id);
    const { data: pilgrimData } = await supabase
      .from("booking_pilgrims")
      .select("*")
      .in("booking_id", bookingIds);

    setPilgrims(pilgrimData || []);

    if (pilgrimData?.length) {
      const pilgrimIds = pilgrimData.map((p) => p.id);
      const { data: docData } = await supabase
        .from("pilgrim_documents")
        .select("*")
        .in("pilgrim_id", pilgrimIds);
      setDocuments(docData || []);
    }
    setLoadingData(false);
  };

  const getDoc = (pilgrimId: string, docType: string) => {
    return documents.find((d) => d.pilgrim_id === pilgrimId && d.doc_type === docType);
  };

  const handleUpload = async (pilgrimId: string, docType: string, file: File) => {
    const key = `${pilgrimId}-${docType}`;
    setUploading(key);

    try {
      const ext = file.name.split(".").pop();
      const path = `${pilgrimId}/${docType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("pilgrim-documents")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("pilgrim-documents")
        .getPublicUrl(path);

      const existingDoc = getDoc(pilgrimId, docType);

      if (existingDoc) {
        await supabase
          .from("pilgrim_documents")
          .update({
            file_url: urlData.publicUrl,
            file_name: file.name,
            status: "uploaded",
          })
          .eq("id", existingDoc.id);
      } else {
        await supabase.from("pilgrim_documents").insert({
          pilgrim_id: pilgrimId,
          doc_type: docType,
          file_url: urlData.publicUrl,
          file_name: file.name,
          status: "uploaded",
        });
      }

      toast.success("Dokumen berhasil diupload");
      fetchData();
    } catch (err: any) {
      toast.error("Gagal upload: " + err.message);
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 pt-24">
        <h1 className="text-2xl font-bold mb-2">Dokumen Saya</h1>
        <p className="text-muted-foreground mb-8">
          Upload dan pantau status dokumen perjalanan Anda.
        </p>

        {loadingData ? (
          <LoadingSpinner />
        ) : pilgrims.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Belum ada data jemaah</h3>
              <p className="text-muted-foreground">Buat booking terlebih dahulu untuk mengelola dokumen.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {pilgrims.map((pilgrim) => (
              <Card key={pilgrim.id}>
                <CardHeader>
                  <CardTitle>{pilgrim.name}</CardTitle>
                  <CardDescription>
                    {pilgrim.passport_number ? `Paspor: ${pilgrim.passport_number}` : "Nomor paspor belum diisi"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {DOC_TYPES.map((dt) => {
                      const doc = getDoc(pilgrim.id, dt.type);
                      const status = doc?.status || "belum_upload";
                      const config = statusConfig[status] || statusConfig.belum_upload;
                      const Icon = config.icon;
                      const isUploading = uploading === `${pilgrim.id}-${dt.type}`;

                      return (
                        <div
                          key={dt.type}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                {dt.label}
                                {dt.required && <span className="text-destructive ml-1">*</span>}
                              </p>
                              {doc?.file_name && (
                                <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                              )}
                              {doc?.notes && status === "rejected" && (
                                <p className="text-xs text-destructive mt-1">{doc.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={config.variant} className="gap-1">
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                            {doc?.file_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(doc.file_url, "_blank")}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {(status === "belum_upload" || status === "rejected") && (
                              <div className="relative">
                                <Input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                  disabled={isUploading}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUpload(pilgrim.id, dt.type, file);
                                  }}
                                />
                                <Button variant="outline" size="sm" disabled={isUploading}>
                                  <Upload className="h-4 w-4 mr-1" />
                                  {isUploading ? "Uploading..." : "Upload"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDocuments;
