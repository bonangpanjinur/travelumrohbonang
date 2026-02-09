import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, GripVertical, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

const AdminFAQ = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    sort_order: 0,
  });

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as FAQ[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("faqs")
          .update({
            question: data.question,
            answer: data.answer,
            sort_order: data.sort_order,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faqs").insert({
          question: data.question,
          answer: data.answer,
          sort_order: data.sort_order,
        });
        if (error) throw error;
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
      const { error } = await supabase
        .from("faqs")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      toast.success("Status FAQ diperbarui");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      toast.success("FAQ berhasil dihapus");
    },
  });

  const resetForm = () => {
    setFormData({ question: "", answer: "", sort_order: faqs.length });
    setEditingFaq(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      sort_order: faq.sort_order,
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
                          onClick={() => {
                            if (confirm("Hapus FAQ ini?")) {
                              deleteMutation.mutate(faq.id);
                            }
                          }}
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
