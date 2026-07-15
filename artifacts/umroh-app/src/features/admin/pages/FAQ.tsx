import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Plus, Pencil, Trash2, GripVertical, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  scope: "general" | "paket" | "package";
  package_id: string | null;
}

const SCOPE_OPTIONS: { value: FAQ["scope"]; label: string }[] = [
  { value: "general", label: "Umum (semua halaman)" },
  { value: "paket", label: "Halaman Daftar Paket (/paket)" },
  { value: "package", label: "Halaman Detail Paket" },
];

function PackagePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { data: packages = [] } = useQuery({
    queryKey: ["faq-packages-picker"],
    queryFn: async () => {
      const { data } = await apiFetch<{ data: any[] }>("/api/packages?active=true");
      return data || [];
    },
  });
  return (
    <select
      className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">Semua paket</option>
      {packages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
    </select>
  );
}

const AdminFAQ = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState<{ question: string; answer: string; sort_order: number; scope: FAQ["scope"]; package_id: string | null }>({
    question: "",
    answer: "",
    sort_order: 0,
    scope: "general",
    package_id: null,
  });

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      const { data } = await apiFetch<{ data: FAQ[] }>("/api/admin/content/faqs");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        question: data.question,
        answer: data.answer,
        sort_order: data.sort_order,
        scope: data.scope,
        package_id: data.scope === "package" ? data.package_id : null,
      };
      if (data.id) {
        await apiFetch(`/api/admin/content/faqs/${data.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/content/faqs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      toast.success(editingFaq ? "FAQ berhasil diupdate" : "FAQ berhasil ditambahkan");
      resetForm();
    },
    onError: () => {
      toast.error("Gagal menyimpan FAQ");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await apiFetch(`/api/admin/content/faqs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      toast.success("Status FAQ diperbarui");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/admin/content/faqs/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      toast.success("FAQ berhasil dihapus");
    },
  });

  const resetForm = () => {
    setFormData({ question: "", answer: "", sort_order: faqs.length, scope: "general", package_id: null });
    setEditingFaq(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      sort_order: faq.sort_order,
      scope: faq.scope ?? "general",
      package_id: faq.package_id ?? null,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingFaq?.id,
    });
  };

  return (
    <div className="space-y-6">
      <DeleteAlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)} onConfirm={() => { if (deleteTargetId) deleteMutation.mutate(deleteTargetId); setDeleteTargetId(null); }} title="Hapus FAQ?" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kelola FAQ</h1>
          <p className="text-muted-foreground">Pertanyaan yang sering diajukan</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingFaq ? "Edit FAQ" : "Tambah FAQ Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Pertanyaan</label>
                <Input
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Masukkan pertanyaan..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Jawaban</label>
                <Textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Masukkan jawaban..."
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Urutan</label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tampilkan di</label>
                <select
                  className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm"
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value as FAQ["scope"], package_id: e.target.value === "package" ? formData.package_id : null })}
                >
                  {SCOPE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  "Umum" muncul di mana saja yang memuatnya. "Halaman Daftar Paket" hanya di /paket. "Detail Paket" muncul di semua detail paket, atau hanya paket tertentu jika dipilih di bawah.
                </p>
              </div>
              {formData.scope === "package" && (
                <div>
                  <label className="text-sm font-medium">Paket Spesifik (opsional)</label>
                  <PackagePicker value={formData.package_id} onChange={(v) => setFormData({ ...formData, package_id: v })} />
                  <p className="text-xs text-muted-foreground mt-1">Kosongkan untuk tampil di semua halaman detail paket.</p>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Daftar FAQ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Memuat...</div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada FAQ. Klik tombol "Tambah FAQ" untuk menambahkan.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Pertanyaan</TableHead>
                  <TableHead>Jawaban</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faqs.map((faq) => (
                  <TableRow key={faq.id}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {faq.question}
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-muted-foreground">
                      {faq.answer}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={faq.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: faq.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(faq)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setDeleteTargetId(faq.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFAQ;
