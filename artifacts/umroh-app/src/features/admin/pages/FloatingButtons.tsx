import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
  Youtube,
  Send,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface FloatingButton {
  id: string;
  platform: string;
  label: string;
  url: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
}

const iconMap: Record<string, React.ElementType> = {
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
  Youtube,
  Send,
};

const platformConfig: Record<string, { name: string; bgClass: string; placeholder: string; icon: string }> = {
  whatsapp: { name: "WhatsApp", bgClass: "bg-emerald-500", placeholder: "https://wa.me/6281234567890", icon: "MessageCircle" },
  instagram: { name: "Instagram", bgClass: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", placeholder: "https://instagram.com/username", icon: "Instagram" },
  facebook: { name: "Facebook", bgClass: "bg-blue-600", placeholder: "https://facebook.com/pagename", icon: "Facebook" },
  tiktok: { name: "TikTok", bgClass: "bg-foreground", placeholder: "https://tiktok.com/@username", icon: "Music2" },
  youtube: { name: "YouTube", bgClass: "bg-red-600", placeholder: "https://youtube.com/channel", icon: "Youtube" },
  telegram: { name: "Telegram", bgClass: "bg-sky-500", placeholder: "https://t.me/username", icon: "Send" },
};

const defaultForm = { platform: "whatsapp", label: "", url: "", icon: "MessageCircle" };

const AdminFloatingButtons = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<FloatingButton | null>(null);
  const [deletingButton, setDeletingButton] = useState<FloatingButton | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: buttons = [], isLoading } = useQuery({
    queryKey: ["admin-floating-buttons"],
    queryFn: async () => {
      const res = await apiFetch<{ data: FloatingButton[] }>("/api/admin/content/floating-buttons");
      return (res.data || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = { platform: data.platform, label: data.label, url: data.url, icon: data.icon };
      if (data.id) {
        await apiFetch(`/api/admin/content/floating-buttons/${data.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/admin/content/floating-buttons", { method: "POST", body: JSON.stringify({ ...payload, sort_order: buttons.length }) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-floating-buttons"] });
      toast.success(editingButton ? "Berhasil diperbarui" : "Berhasil ditambahkan");
      closeDialog();
    },
    onError: () => toast.error("Gagal menyimpan"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/admin/content/floating-buttons/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-floating-buttons"] });
      toast.success("Berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeletingButton(null);
    },
    onError: () => toast.error("Gagal menghapus"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiFetch(`/api/admin/content/floating-buttons/${id}`, { method: "PATCH", body: JSON.stringify({ is_active: isActive }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-floating-buttons"] });
      toast.success("Status diperbarui");
    },
    onError: () => toast.error("Gagal mengubah status"),
  });

  const openCreate = () => {
    setEditingButton(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (btn: FloatingButton) => {
    setEditingButton(btn);
    setForm({ platform: btn.platform, label: btn.label, url: btn.url || "", icon: btn.icon || "MessageCircle" });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingButton(null);
    setForm(defaultForm);
  };

  const handlePlatformChange = (platform: string) => {
    const config = platformConfig[platform];
    setForm((prev) => ({
      ...prev,
      platform,
      icon: config?.icon || "MessageCircle",
      label: config?.name || prev.label,
    }));
  };

  const handleSubmit = () => {
    if (!form.label.trim()) {
      toast.error("Label harus diisi");
      return;
    }
    saveMutation.mutate({ ...form, id: editingButton?.id });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Floating Button</h1>
          <p className="text-muted-foreground text-sm">Kelola tombol floating untuk sosial media dan kontak</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Tambah
        </Button>
      </div>

      {buttons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Belum ada floating button. Tambahkan sekarang!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buttons.map((btn) => {
            const Icon = iconMap[btn.icon || "MessageCircle"] || MessageCircle;
            const config = platformConfig[btn.platform];

            return (
              <Card key={btn.id} className={`transition-opacity ${btn.isActive ? "" : "opacity-50"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${config?.bgClass || "bg-muted"} flex items-center justify-center text-primary-foreground shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{btn.label}</CardTitle>
                        <CardDescription className="text-xs">
                          {config?.name || btn.platform} · {btn.isActive ? "Aktif" : "Nonaktif"}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={btn.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: btn.id, isActive: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground truncate mb-3">{btn.url || "Belum diatur"}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(btn)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { setDeletingButton(btn); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {btn.url && (
                      <Button variant="outline" size="icon" className="shrink-0" asChild>
                        <a href={btn.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingButton ? "Edit" : "Tambah"} Floating Button</DialogTitle>
            <DialogDescription>
              {editingButton ? "Perbarui informasi tombol floating." : "Tambahkan tombol floating baru ke website Anda."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={handlePlatformChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih platform" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(platformConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Label</Label>
              <Input
                className="mt-1"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Contoh: Hubungi Kami"
              />
            </div>
            <div>
              <Label>URL</Label>
              <Input
                className="mt-1"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder={platformConfig[form.platform]?.placeholder || "https://..."}
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <DialogTitle className="text-center">Hapus Floating Button?</DialogTitle>
            <DialogDescription className="text-center">
              Apakah Anda yakin ingin menghapus <strong>{deletingButton?.label}</strong>? Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => deletingButton && deleteMutation.mutate(deletingButton.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tips Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Tips</h3>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Aktifkan tombol yang ingin ditampilkan di website</li>
                <li>• Untuk WhatsApp, gunakan format: https://wa.me/628xxxxx</li>
                <li>• Jika hanya 1 tombol aktif, tampil langsung tanpa menu expand</li>
                <li>• Jika lebih dari 1 aktif, muncul tombol + yang bisa di-expand</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFloatingButtons;
