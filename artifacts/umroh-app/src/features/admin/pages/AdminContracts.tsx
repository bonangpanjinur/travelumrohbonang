/**
 * P2-5: Admin Contracts management page.
 * Lists all signed contracts with booking info; allows previewing the signed
 * contract (HTML + signature) and deleting (super_admin/admin only).
 */
import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Loader2, FileCheck, Eye, Trash2, Search, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useAuth } from "@/shared/hooks/useAuth";
import { sanitizeHtml } from "@/shared/lib/sanitizeHtml";

interface ContractRow {
  id: string;
  bookingId: string;
  userId: string;
  signerName: string | null;
  signedAt: string | null;
  createdAt: string | null;
  bookingCode: string | null;
  bookingStatus: string | null;
}

interface ContractDetail extends ContractRow {
  htmlContent: string | null;
  signatureDataUrl: string | null;
}

interface BookingOption {
  id: string;
  bookingCode: string;
  packageTitle: string;
  userName: string;
}

const AdminContracts = () => {
  const { role } = useAuth();
  const canDelete = role === "super_admin" || role === "admin";

  const [items, setItems] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<ContractDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit an existing contract (correct signer name / signed date)
  const [editRow, setEditRow] = useState<ContractRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ signerName: "", signedAt: "" });

  // Manual contract creation (admin-side, e.g. for paper contracts signed offline)
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [bookingOptions, setBookingOptions] = useState<BookingOption[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [form, setForm] = useState({ bookingId: "", signerName: "", htmlContent: "", signedAt: "" });

  const loadBookingOptions = async () => {
    setBookingsLoading(true);
    try {
      const res = await apiFetch<{ data: any[] }>("/api/admin/bookings?limit=200");
      const list = (res as any)?.data ?? res ?? [];
      setBookingOptions(
        (Array.isArray(list) ? list : []).map((b: any) => ({
          id: b.id,
          bookingCode: b.bookingCode,
          packageTitle: b.packageTitle || "-",
          userName: b.userName || "-",
        }))
      );
    } catch (e: any) {
      toast.error(e.message || "Gagal memuat daftar booking");
    } finally {
      setBookingsLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ bookingId: "", signerName: "", htmlContent: "", signedAt: "" });
    setCreateOpen(true);
    if (bookingOptions.length === 0) loadBookingOptions();
  };

  const handleCreate = async () => {
    if (!form.bookingId) {
      toast.error("Pilih booking terlebih dahulu");
      return;
    }
    if (!form.signerName.trim()) {
      toast.error("Nama penandatangan wajib diisi");
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/api/admin/contracts", {
        method: "POST",
        body: JSON.stringify({
          bookingId: form.bookingId,
          signerName: form.signerName.trim(),
          htmlContent: form.htmlContent.trim() || undefined,
          signedAt: form.signedAt || undefined,
        }),
      });
      toast.success("Kontrak berhasil dibuat");
      setCreateOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat kontrak");
    } finally {
      setCreating(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ContractRow[]>("/api/admin/contracts");
      setItems(data || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openPreview = async (id: string) => {
    setPreviewLoading(true);
    try {
      const detail = await apiFetch<ContractDetail>(`/api/admin/contracts/${id}`);
      setPreview(detail);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const openEdit = (row: ContractRow) => {
    setEditRow(row);
    setEditForm({
      signerName: row.signerName ?? "",
      signedAt: row.signedAt ? row.signedAt.slice(0, 16) : "",
    });
  };

  const handleEdit = async () => {
    if (!editRow) return;
    if (!editForm.signerName.trim()) {
      toast.error("Nama penandatangan wajib diisi");
      return;
    }
    setEditing(true);
    try {
      await apiFetch(`/api/admin/contracts/${editRow.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          signerName: editForm.signerName.trim(),
          ...(editForm.signedAt ? { signedAt: editForm.signedAt } : {}),
        }),
      });
      toast.success("Kontrak berhasil diperbarui");
      setEditRow(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal memperbarui kontrak");
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/contracts/${deleteId}`, { method: "DELETE" });
      toast.success("Kontrak dihapus");
      setDeleteId(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.bookingCode?.toLowerCase().includes(q) ||
      c.signerName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Kontrak Jamaah</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari booking code / nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" />
            Buat Kontrak
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} Kontrak Tersimpan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Penandatangan</TableHead>
                    <TableHead>Tanggal TTD</TableHead>
                    <TableHead>Status Booking</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Belum ada kontrak
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">
                          {c.bookingCode ?? c.bookingId.slice(0, 8)}
                        </TableCell>
                        <TableCell>{c.signerName ?? "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.signedAt
                            ? format(new Date(c.signedAt), "dd MMM yyyy HH:mm", { locale: localeId })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {c.bookingStatus && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {c.bookingStatus}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPreview(c.id)}
                              disabled={previewLoading}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(c.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Preview Kontrak — {preview?.bookingCode ?? preview?.bookingId?.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Penandatangan:</div>
                <div>{preview.signerName ?? "-"}</div>
                <div className="text-muted-foreground">Ditandatangani:</div>
                <div>
                  {preview.signedAt
                    ? format(new Date(preview.signedAt), "dd MMM yyyy HH:mm", { locale: localeId })
                    : "-"}
                </div>
              </div>
              {preview.htmlContent && (
                <div
                  className="border border-border rounded-lg p-4 text-sm bg-card text-card-foreground max-h-64 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(preview.htmlContent) }}
                />
              )}
              {preview.signatureDataUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tanda Tangan Digital:</p>
                  <div className="border border-border rounded-lg p-2 bg-card inline-block">
                    <img
                      src={preview.signatureDataUrl}
                      alt="Tanda tangan"
                      className="max-h-24 max-w-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Contract Creation Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Kontrak Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gunakan ini untuk mencatat kontrak yang ditandatangani secara offline (di kantor / kertas) atas nama jamaah.
            </p>
            <div className="space-y-2">
              <Label>Booking</Label>
              <Select
                value={form.bookingId}
                onValueChange={(v) => setForm((f) => ({ ...f, bookingId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={bookingsLoading ? "Memuat booking..." : "Pilih booking"} />
                </SelectTrigger>
                <SelectContent>
                  {bookingOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bookingCode} — {b.userName} ({b.packageTitle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama Penandatangan</Label>
              <Input
                value={form.signerName}
                onChange={(e) => setForm((f) => ({ ...f, signerName: e.target.value }))}
                placeholder="Nama lengkap sesuai identitas"
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Tanda Tangan (opsional, default sekarang)</Label>
              <Input
                type="datetime-local"
                value={form.signedAt}
                onChange={(e) => setForm((f) => ({ ...f, signedAt: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan / Isi Kontrak (opsional)</Label>
              <Textarea
                value={form.htmlContent}
                onChange={(e) => setForm((f) => ({ ...f, htmlContent: e.target.value }))}
                placeholder="Ringkasan isi kontrak atau catatan tambahan..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Kontrak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contract Dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit Kontrak — {editRow?.bookingCode ?? editRow?.bookingId?.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Penandatangan</Label>
              <Input
                value={editForm.signerName}
                onChange={(e) => setEditForm((f) => ({ ...f, signerName: e.target.value }))}
                placeholder="Nama lengkap sesuai identitas"
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Tanda Tangan</Label>
              <Input
                type="datetime-local"
                value={editForm.signedAt}
                onChange={(e) => setEditForm((f) => ({ ...f, signedAt: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)} disabled={editing}>
              Batal
            </Button>
            <Button onClick={handleEdit} disabled={editing}>
              {editing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kontrak?</AlertDialogTitle>
            <AlertDialogDescription>
              Kontrak yang dihapus tidak dapat dikembalikan. Pastikan Anda sudah mengunduh salinannya jika diperlukan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminContracts;
