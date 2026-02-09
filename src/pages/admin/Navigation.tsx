import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NavItem {
  id: string;
  label: string;
  url: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

const AdminNavigation = () => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [editingNav, setEditingNav] = useState<NavItem | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const { toast } = useToast();

  const [navForm, setNavForm] = useState({
    label: "",
    url: "",
    parent_id: "",
    sort_order: 0,
    is_active: true,
    open_in_new_tab: false,
  });

  const [catForm, setCatForm] = useState({
    name: "",
    description: "",
    parent_id: "",
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [navRes, catRes] = await Promise.all([
      supabase.from("navigation_items").select("*").order("sort_order"),
      supabase.from("package_categories").select("*").order("sort_order"),
    ]);

    setNavItems((navRes.data as NavItem[]) || []);
    setCategories((catRes.data as Category[]) || []);
    setLoading(false);
  };

  // Navigation CRUD
  const handleNavSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...navForm,
      parent_id: navForm.parent_id || null,
    };

    if (editingNav) {
      const { error } = await supabase.from("navigation_items").update(data).eq("id", editingNav.id);
      if (error) {
        toast({ title: "Gagal mengupdate", variant: "destructive" });
      } else {
        toast({ title: "Navigasi diupdate!" });
        fetchData();
        setIsNavOpen(false);
        resetNavForm();
      }
    } else {
      const { error } = await supabase.from("navigation_items").insert(data);
      if (error) {
        toast({ title: "Gagal menambahkan", variant: "destructive" });
      } else {
        toast({ title: "Navigasi ditambahkan!" });
        fetchData();
        setIsNavOpen(false);
        resetNavForm();
      }
    }
  };

  const handleNavEdit = (item: NavItem) => {
    setEditingNav(item);
    setNavForm({
      label: item.label,
      url: item.url,
      parent_id: item.parent_id || "",
      sort_order: item.sort_order,
      is_active: item.is_active,
      open_in_new_tab: item.open_in_new_tab,
    });
    setIsNavOpen(true);
  };

  const handleNavDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus?")) return;
    const { error } = await supabase.from("navigation_items").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    } else {
      toast({ title: "Navigasi dihapus" });
      fetchData();
    }
  };

  const resetNavForm = () => {
    setEditingNav(null);
    setNavForm({ label: "", url: "", parent_id: "", sort_order: 0, is_active: true, open_in_new_tab: false });
  };

  // Category CRUD
  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...catForm,
      parent_id: catForm.parent_id || null,
    };

    if (editingCat) {
      const { error } = await supabase.from("package_categories").update(data).eq("id", editingCat.id);
      if (error) {
        toast({ title: "Gagal mengupdate", variant: "destructive" });
      } else {
        toast({ title: "Kategori diupdate!" });
        fetchData();
        setIsCatOpen(false);
        resetCatForm();
      }
    } else {
      const { error } = await supabase.from("package_categories").insert(data);
      if (error) {
        toast({ title: "Gagal menambahkan", variant: "destructive" });
      } else {
        toast({ title: "Kategori ditambahkan!" });
        fetchData();
        setIsCatOpen(false);
        resetCatForm();
      }
    }
  };

  const handleCatEdit = (item: Category) => {
    setEditingCat(item);
    setCatForm({
      name: item.name,
      description: item.description || "",
      parent_id: item.parent_id || "",
      sort_order: item.sort_order || 0,
      is_active: item.is_active ?? true,
    });
    setIsCatOpen(true);
  };

  const handleCatDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus? Sub-kategori juga akan terhapus.")) return;
    const { error } = await supabase.from("package_categories").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    } else {
      toast({ title: "Kategori dihapus" });
      fetchData();
    }
  };

  const resetCatForm = () => {
    setEditingCat(null);
    setCatForm({ name: "", description: "", parent_id: "", sort_order: 0, is_active: true });
  };

  const parentNavItems = navItems.filter((n) => !n.parent_id);
  const parentCategories = categories.filter((c) => !c.parent_id);

  const getCategoryParentName = (parentId: string | null) => {
    if (!parentId) return "-";
    const parent = categories.find((c) => c.id === parentId);
    return parent?.name || "-";
  };

  const getNavParentName = (parentId: string | null) => {
    if (!parentId) return "-";
    const parent = navItems.find((n) => n.id === parentId);
    return parent?.label || "-";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-6">Navigasi & Kategori</h1>

      <Tabs defaultValue="navigation" className="space-y-6">
        <TabsList>
          <TabsTrigger value="navigation">Menu Navigasi</TabsTrigger>
          <TabsTrigger value="categories">Kategori Paket</TabsTrigger>
        </TabsList>

        {/* Navigation Tab */}
        <TabsContent value="navigation">
          <div className="flex justify-between items-center mb-4">
            <p className="text-muted-foreground">Kelola menu navigasi website</p>
            <Dialog open={isNavOpen} onOpenChange={(open) => { setIsNavOpen(open); if (!open) resetNavForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-gold text-primary">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Menu
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingNav ? "Edit Menu" : "Tambah Menu Baru"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleNavSubmit} className="space-y-4">
                  <div>
                    <Label>Label *</Label>
                    <Input
                      value={navForm.label}
                      onChange={(e) => setNavForm({ ...navForm, label: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>URL *</Label>
                    <Input
                      value={navForm.url}
                      onChange={(e) => setNavForm({ ...navForm, url: e.target.value })}
                      required
                      placeholder="/halaman atau https://..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Parent Menu (opsional)</Label>
                    <Select value={navForm.parent_id} onValueChange={(val) => setNavForm({ ...navForm, parent_id: val })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih parent (kosong = menu utama)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tidak ada (Menu Utama)</SelectItem>
                        {parentNavItems.filter((n) => n.id !== editingNav?.id).map((n) => (
                          <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Urutan</Label>
                    <Input
                      type="number"
                      value={navForm.sort_order}
                      onChange={(e) => setNavForm({ ...navForm, sort_order: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={navForm.is_active}
                        onCheckedChange={(checked) => setNavForm({ ...navForm, is_active: checked })}
                      />
                      <Label>Aktif</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={navForm.open_in_new_tab}
                        onCheckedChange={(checked) => setNavForm({ ...navForm, open_in_new_tab: checked })}
                      />
                      <Label>Buka di Tab Baru</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsNavOpen(false)}>Batal</Button>
                    <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {navItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className={item.parent_id ? "pl-8" : "font-semibold"}>
                      {item.parent_id && "└ "}{item.label}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.url}</TableCell>
                    <TableCell>{getNavParentName(item.parent_id)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${item.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleNavEdit(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleNavDelete(item.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="flex justify-between items-center mb-4">
            <p className="text-muted-foreground">Kelola kategori dan sub-kategori paket (Umroh, Haji, dll)</p>
            <Dialog open={isCatOpen} onOpenChange={(open) => { setIsCatOpen(open); if (!open) resetCatForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-gold text-primary">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Kategori
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCat ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCatSubmit} className="space-y-4">
                  <div>
                    <Label>Nama Kategori *</Label>
                    <Input
                      value={catForm.name}
                      onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Deskripsi</Label>
                    <Input
                      value={catForm.description}
                      onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Kategori Utama (kosong = kategori utama)</Label>
                    <Select value={catForm.parent_id} onValueChange={(val) => setCatForm({ ...catForm, parent_id: val })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih kategori utama" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tidak ada (Kategori Utama)</SelectItem>
                        {parentCategories.filter((c) => c.id !== editingCat?.id).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Urutan</Label>
                    <Input
                      type="number"
                      value={catForm.sort_order}
                      onChange={(e) => setCatForm({ ...catForm, sort_order: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={catForm.is_active}
                      onCheckedChange={(checked) => setCatForm({ ...catForm, is_active: checked })}
                    />
                    <Label>Aktif</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCatOpen(false)}>Batal</Button>
                    <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Kategori Utama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className={cat.parent_id ? "pl-8" : "font-semibold"}>
                      {cat.parent_id && "└ "}{cat.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{cat.description || "-"}</TableCell>
                    <TableCell>{getCategoryParentName(cat.parent_id)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${cat.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {cat.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleCatEdit(cat)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleCatDelete(cat.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminNavigation;
