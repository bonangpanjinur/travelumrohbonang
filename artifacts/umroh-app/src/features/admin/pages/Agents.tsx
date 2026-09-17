import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { QRCodeSVG } from "qrcode.react";
import Papa from "papaparse";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { useToast } from "@/shared/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Building2,
  Percent,
  Phone,
  Search,
  Download,
  QrCode,
  ExternalLink,
  CalendarDays,
  Copy,
  FileBadge,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { exportToCsv, exportToExcel } from "@/shared/lib/exportCsv";
import {
  isValidIndonesianPhone,
  normalizePhone,
} from "@/shared/lib/phone";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import AgentIdCardDialog from "@/features/admin/components/AgentIdCardDialog";
import { useDeleteConfirm } from "@/features/admin/hooks/useDeleteConfirm";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Branch {
  id: string;
  code: string | null;
  name: string;
}

interface Agent {
  id: string;
  name: string;
  agentCode: string | null;
  gender: string | null;
  address: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  joinedAt: string | null;
  bannerIdCardUrl: string | null;
  mouNumber: string | null;
  validUntil: string | null;
  referralCode: string | null;
  publicSlug: string | null;
  publicDescription: string | null;
  publicPageEnabled: boolean;
  userId: string | null;
  branchId: string | null;
  commissionPercent: number | null;
  monthlyTarget: number | null;
  isActive: boolean;
  branch?: Branch | null;
}

type AgentForm = {
  name: string;
  agentCode: string;
  gender: string;
  address: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  joinedAt: string;
  bannerIdCardUrl: string;
  mouNumber: string;
  validUntil: string;
  publicSlug: string;
  publicDescription: string;
  publicPageEnabled: boolean;
  branchId: string;
  commissionPercent: number;
  monthlyTarget: number | "";
  isActive: boolean;
};

const emptyForm: AgentForm = {
  name: "",
  agentCode: "",
  gender: "",
  address: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  joinedAt: "",
  bannerIdCardUrl: "",
  mouNumber: "",
  validUntil: "",
  publicSlug: "",
  publicDescription: "",
  publicPageEnabled: true,
  branchId: "",
  commissionPercent: 0,
  monthlyTarget: "",
  isActive: true,
};

const AdminAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [qrAgent, setQrAgent] = useState<Agent | null>(null);
  const [idCardAgent, setIdCardAgent] = useState<Agent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const { toast } = useToast();
  const { isDeleteOpen, requestDelete, cancelDelete, confirmDelete } =
    useDeleteConfirm();
  const [form, setForm] = useState<AgentForm>({ ...emptyForm });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [createBranchInline, setCreateBranchInline] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [importingAgents, setImportingAgents] = useState(false);
  const [showBranchStats, setShowBranchStats] = useState(true);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, branchesRes] = await Promise.all([
        apiFetch<any[]>("/api/admin/agents"),
        apiFetch<any[]>("/api/admin/branches"),
      ]);
      const branchRows: Branch[] = (branchesRes || []).map((branch) => ({
        id: branch.id,
        code: branch.code || null,
        name: branch.name,
      }));
      setBranches(branchRows);
      setAgents(
        (agentsRes || []).map((agent) => ({
          ...agent,
          commissionPercent:
            agent.commissionPercent != null
              ? Number(agent.commissionPercent)
              : null,
          monthlyTarget:
            agent.monthlyTarget != null ? Number(agent.monthlyTarget) : null,
          publicPageEnabled: agent.publicPageEnabled !== false,
          branch:
            branchRows.find((branch) => branch.id === agent.branchId) || null,
        })),
      );
    } catch (error) {
      console.error(error);
      toast({ title: "Gagal memuat data agen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedPhone = normalizePhone(form.phone);
    if (form.phone.trim() && !isValidIndonesianPhone(normalizedPhone)) {
      toast({
        title: "Nomor telepon tidak valid",
        description: "Gunakan nomor Indonesia yang valid, contoh: 081234567890.",
        variant: "destructive",
      });
      return;
    }
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      agentCode: form.agentCode.trim().toUpperCase() || null,
      gender: form.gender || null,
      address: form.address.trim() || null,
      dateOfBirth: form.dateOfBirth || null,
      phone: normalizedPhone || null,
      email: form.email.trim() || null,
      joinedAt: form.joinedAt || null,
      bannerIdCardUrl: form.bannerIdCardUrl.trim() || null,
      mouNumber: form.mouNumber.trim() || null,
      validUntil: form.validUntil || null,
      publicSlug: form.publicSlug.trim() || null,
      publicDescription: form.publicDescription.trim() || null,
      publicPageEnabled: form.publicPageEnabled,
      branchId: form.branchId || null,
      commissionPercent: form.commissionPercent || 0,
      monthlyTarget:
        form.monthlyTarget === "" ? null : Number(form.monthlyTarget),
      isActive: form.isActive,
    };

    if (form.email) {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.email.trim())
        .maybeSingle();
      if (userProfile?.id) payload.userId = userProfile.id;
    }

    try {
      if (createBranchInline) {
        if (!newBranchName.trim()) throw new Error("Nama cabang wajib diisi");
        const createdBranch = await apiFetch<any>("/api/admin/branches", {
          method: "POST",
          body: JSON.stringify({
            name: newBranchName.trim(),
            address: newBranchAddress.trim() || null,
          }),
        });
        const branch = {
          id: createdBranch.id,
          code: createdBranch.code || null,
          name: createdBranch.name,
        };
        setBranches((current) => [...current, branch]);
        payload.branchId = branch.id;
      }
      if (photoFile) {
        const path = `${editing?.id || crypto.randomUUID()}/${Date.now()}-${photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await supabase.storage
          .from("agent-photos")
          .upload(path, photoFile, {
            upsert: true,
            contentType: photoFile.type,
          });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage
          .from("agent-photos")
          .getPublicUrl(path);
        payload.photoUrl = publicData.publicUrl;
      }
      if (editing) {
        await apiFetch(`/api/admin/agents/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Agen berhasil diperbarui" });
      } else {
        await apiFetch("/api/admin/agents", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Agen berhasil ditambahkan" });
      }
      setIsOpen(false);
      resetForm();
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Gagal menyimpan agen",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditing(agent);
    setForm({
      name: agent.name || "",
      agentCode: agent.agentCode || "",
      gender: agent.gender || "",
      address: agent.address || "",
      dateOfBirth: agent.dateOfBirth || "",
      phone: agent.phone || "",
      email: agent.email || "",
      joinedAt: agent.joinedAt || "",
      bannerIdCardUrl: agent.bannerIdCardUrl || "",
      mouNumber: agent.mouNumber || "",
      validUntil: agent.validUntil || "",
      publicSlug: agent.publicSlug || "",
      publicDescription: agent.publicDescription || "",
      publicPageEnabled: agent.publicPageEnabled !== false,
      branchId: agent.branchId || "",
      commissionPercent: agent.commissionPercent || 0,
      monthlyTarget: agent.monthlyTarget ?? "",
      isActive: agent.isActive,
    });
    setPhotoFile(null);
    setPhotoPreview(agent.photoUrl || null);
    setIsOpen(true);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setPhotoFile(null);
    setPhotoPreview(null);
    setCreateBranchInline(false);
    setNewBranchName("");
    setNewBranchAddress("");
  };

  const executeDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/agents/${id}`, { method: "DELETE" });
      toast({ title: "Agen berhasil dihapus" });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Gagal menghapus agen",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (agent: Agent) => {
    try {
      await apiFetch(`/api/admin/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !agent.isActive }),
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Gagal mengubah status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const publicUrl = (agent: Agent) =>
    agent.publicSlug
      ? `${window.location.origin}/agen/${agent.publicSlug}?ref=${encodeURIComponent(agent.referralCode || agent.agentCode || "")}`
      : "";

  const copyPublicUrl = async (agent: Agent) => {
    const url = publicUrl(agent);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link halaman agen disalin" });
  };

  const downloadQr = async (agent: Agent) => {
    const url = publicUrl(agent);
    if (!url) return;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 900,
      margin: 2,
      errorCorrectionLevel: "H",
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-agen-${agent.publicSlug}.png`;
    link.click();
  };

  const handleImportAgents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportingAgents(true);
    try {
      const result = await new Promise<{ data: Record<string, string>[] }>((resolve, reject) => {
        Papa.parse<Record<string, string>>(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase(),
          complete: resolve,
          error: reject,
        });
      });
      const rows = result.data
        .map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [key, String(value ?? "").trim()]),
          ),
        )
        .filter((row) => Object.values(row).some(Boolean));
      if (!rows.length) throw new Error("File CSV tidak memiliki data agen");

      const failures: string[] = [];
      let imported = 0;
      for (const [index, row] of rows.entries()) {
        const line = index + 2;
        const name = row.nama || row.name || "";
        const rawPhone = row.telepon || row.phone || row.no_tel || "";
        const phone = normalizePhone(rawPhone);
        if (!name) {
          failures.push(`Baris ${line}: kolom nama wajib diisi`);
          continue;
        }
        if (rawPhone && !isValidIndonesianPhone(phone)) {
          failures.push(`Baris ${line}: nomor telepon tidak valid`);
          continue;
        }
        const branchValue = row.branch_id || row.branchid || row.kode_cabang || row.branch_code || "";
        const branch = branchValue
          ? branches.find(
              (item) => item.id === branchValue || item.code?.toLowerCase() === branchValue.toLowerCase(),
            )
          : null;
        if (branchValue && !branch) {
          failures.push(`Baris ${line}: branch_id/kode cabang tidak ditemukan`);
          continue;
        }
        try {
          await apiFetch("/api/admin/agents", {
            method: "POST",
            body: JSON.stringify({
              name,
              agentCode: row.kode_agen || row.agent_code || row.agentcode || null,
              phone: phone || null,
              gender: row.gender || null,
              address: row.alamat || row.address || null,
              email: row.email || null,
              branchId: branch?.id || null,
              commissionPercent: row.komisi || row.commission_percent || 0,
              isActive: !["false", "0", "nonaktif"].includes((row.status || "").toLowerCase()),
            }),
          });
          imported += 1;
        } catch (error: any) {
          failures.push(`Baris ${line}: ${error?.message || "gagal disimpan"}`);
        }
      }
      await fetchData();
      toast({
        title: `Import selesai: ${imported} berhasil, ${failures.length} gagal`,
        description: failures.slice(0, 3).join(" | ") || "Semua data berhasil diimport.",
        variant: failures.length ? "destructive" : "default",
      });
    } catch (error: any) {
      toast({ title: "Import gagal", description: error?.message || "File CSV tidak dapat dibaca", variant: "destructive" });
    } finally {
      setImportingAgents(false);
    }
  };

  const downloadAgentImportTemplate = () => {
    exportToCsv(
      "template-import-agen",
      [
        "nama",
        "kode_agen",
        "telepon",
        "gender",
        "alamat",
        "email",
        "branch_id",
        "kode_cabang",
        "komisi",
        "status",
      ],
      [
        [
          "Contoh Agen",
          "",
          "081234567890",
          "P",
          "Jl. Contoh No. 1",
          "agen@example.com",
          "branch_pusat",
          "VINS",
          "0",
          "Aktif",
        ],
      ],
    );
  };

  const filteredAgents = useMemo(
    () => {
      const filtered = agents.filter((agent) => {
        const term = searchTerm.trim().toLowerCase();
        const normalizedSearch = normalizePhone(searchTerm).toLowerCase();
        const agentPhone = normalizePhone(agent.phone || "").toLowerCase();
        const matchesSearch =
          !term ||
          agent.name.toLowerCase().includes(term) ||
          (agent.agentCode || "").toLowerCase().includes(term) ||
          (agent.phone || "").toLowerCase().includes(term) ||
          Boolean(normalizedSearch && agentPhone.includes(normalizedSearch));
        return (
          matchesSearch &&
          (filterBranch === "all" || agent.branchId === filterBranch)
        );
      });
      return filtered.sort((a, b) => {
        const codeA = a.agentCode || "";
        const codeB = b.agentCode || "";
        const sequenceA = Number(
          codeA.match(/^A(\d+)/i)?.[1] || Number.MAX_SAFE_INTEGER,
        );
        const sequenceB = Number(
          codeB.match(/^A(\d+)/i)?.[1] || Number.MAX_SAFE_INTEGER,
        );
        return (
          sequenceA - sequenceB ||
          codeA.localeCompare(codeB) ||
          a.name.localeCompare(b.name)
        );
      });
    },
    [agents, searchTerm, filterBranch],
  );

  const {
    page,
    setPage,
    totalPages,
    totalCount,
    paginatedItems,
    pageSize,
    resetPage,
  } = useAdminPagination(filteredAgents);
  const agentBranchStats = useMemo(() => {
    const counts = new Map<string, number>();
    agents.forEach((agent) => {
      const branchId = agent.branchId || "tanpa-branch-id";
      counts.set(branchId, (counts.get(branchId) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([branchId, jumlah]) => {
        const branch = branches.find((item) => item.id === branchId);
        return {
          branchId,
          branch: branch
            ? `${branch.code ? `${branch.code} — ` : ""}${branch.name}`
            : "Tanpa branch_id",
          jumlah,
        };
      })
      .sort((a, b) => b.jumlah - a.jumlah || a.branch.localeCompare(b.branch));
  }, [agents, branches]);
  useEffect(() => {
    resetPage();
  }, [searchTerm, filterBranch]);

  const activeCount = agents.filter((agent) => agent.isActive).length;
  const publishedCount = agents.filter(
    (agent) => agent.isActive && agent.publicPageEnabled,
  ).length;
  const avgCommission = agents.length
    ? (
        agents.reduce(
          (sum, agent) => sum + Number(agent.commissionPercent || 0),
          0,
        ) / agents.length
      ).toFixed(1)
    : "0";

  return (
    <div>
      <DeleteAlertDialog
        open={isDeleteOpen}
        onOpenChange={cancelDelete}
        onConfirm={() => confirmDelete(executeDelete)}
        title="Hapus Agen?"
        description="Data agen dan relasi komisinya akan ikut terdampak. Gunakan status nonaktif bila ingin menyimpan riwayat."
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Agen & Mitra</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Data identitas, kode agen, dan halaman publik dengan QR
            masing-masing.
          </p>
        </div>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah Agen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Data Agen" : "Tambah Agen Baru"}
              </DialogTitle>
              <DialogDescription>
                Field bertanda * wajib diisi. Data tanggal lahir dan gender
                hanya untuk administrasi internal.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <section className="space-y-3">
                <p className="text-sm font-semibold text-primary">
                  Data sesuai daftar mitra
                </p>
                <div className="flex items-center gap-4 rounded-xl border border-dashed border-border p-4">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Foto agen"
                      className="h-20 w-20 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                      {form.name?.charAt(0)?.toUpperCase() || "A"}
                    </div>
                  )}
                  <div>
                    <Label htmlFor="agent-photo">Foto profil agen/mitra</Label>
                    <Input
                      id="agent-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="mt-1 max-w-sm"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setPhotoFile(file);
                        if (file) setPhotoPreview(URL.createObjectURL(file));
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      JPG, PNG, atau WebP. Foto tampil di dashboard dan halaman
                      publik.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label>GABUNG</Label>
                    <Input
                      type="date"
                      value={form.joinedAt}
                      onChange={(e) =>
                        setForm({ ...form, joinedAt: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>MASA BERLAKU</Label>
                    <Input
                      type="date"
                      value={form.validUntil}
                      onChange={(e) =>
                        setForm({ ...form, validUntil: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>NO MOU</Label>
                    <Input
                      value={form.mouNumber}
                      onChange={(e) =>
                        setForm({ ...form, mouNumber: e.target.value })
                      }
                      placeholder="MOU/2026/001"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>BANNER & ID CARD</Label>
                    <Input
                      value={form.bannerIdCardUrl}
                      onChange={(e) =>
                        setForm({ ...form, bannerIdCardUrl: e.target.value })
                      }
                      placeholder="URL file atau link Storage"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Nama Agen *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      required
                      placeholder="Bonang Panji Nur"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={form.gender || "none"}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          gender: value === "none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Belum diisi</SelectItem>
                        <SelectItem value="L">Laki-laki</SelectItem>
                        <SelectItem value="P">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tanggal Lahir</Label>
                    <Input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) =>
                        setForm({ ...form, dateOfBirth: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Nomor Telepon</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="08xxxxxxxxxx"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Alamat Agen</Label>
                  <Textarea
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder="Alamat lengkap agen"
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={createBranchInline}
                      onChange={(e) => setCreateBranchInline(e.target.checked)}
                    />{" "}
                    Buat cabang baru dari form ini
                  </label>
                  {createBranchInline && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <Label>Nama Cabang *</Label>
                        <Input
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          placeholder="Cabang Jakarta"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Alamat Cabang</Label>
                        <Input
                          value={newBranchAddress}
                          onChange={(e) => setNewBranchAddress(e.target.value)}
                          placeholder="Alamat cabang"
                          className="mt-1"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground md:col-span-2">
                        Kode cabang akan dibuat otomatis oleh sistem, lalu
                        langsung dipakai untuk agen ini.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-semibold text-primary">
                  Kode, cabang, dan komisi
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Kode Cabang</Label>
                    <Select
                      value={form.branchId || "none"}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          branchId: value === "none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih cabang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Pusat / tanpa cabang
                        </SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.code ? `${branch.code} — ` : ""}
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Kode Agen (otomatis)</Label>
                    <Input
                      value={form.agentCode}
                      readOnly
                      placeholder="Dibuat otomatis saat disimpan"
                      className="mt-1 bg-muted font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Kode unik dibuat otomatis oleh sistem.
                    </p>
                  </div>
                  <div>
                    <Label>Komisi (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.commissionPercent}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          commissionPercent: Number(e.target.value) || 0,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Target Bulanan (opsional)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.monthlyTarget}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          monthlyTarget:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm">
                    <p className="font-medium">Kode Referral / Legacy</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Otomatis sama dengan Kode Agen. Tidak perlu diisi manual.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-semibold text-primary">
                  Halaman publik & QR
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Slug Halaman Publik</Label>
                    <Input
                      value={form.publicSlug}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          publicSlug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-+|-+$/g, ""),
                        })
                      }
                      placeholder="bonang-panji-nur"
                      className="mt-1 font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      URL: /agen/{form.publicSlug || "nama-agen"}
                    </p>
                  </div>
                  <div>
                    <Label>Email Portal Agen</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="agen@email.com"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Deskripsi singkat publik</Label>
                  <Textarea
                    value={form.publicDescription}
                    onChange={(e) =>
                      setForm({ ...form, publicDescription: e.target.value })
                    }
                    placeholder="Bantu jamaah menemukan paket umroh yang sesuai."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label>Publikasikan halaman agen</Label>
                    <p className="text-xs text-muted-foreground">
                      QR hanya aktif jika agen aktif dan halaman dipublikasikan.
                    </p>
                  </div>
                  <Switch
                    checked={form.publicPageEnabled}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, publicPageEnabled: checked })
                    }
                  />
                </div>
              </section>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div>
                  <Label>Status Agen Aktif</Label>
                  <p className="text-xs text-muted-foreground">
                    Agen nonaktif tidak dapat diakses dari halaman publik.
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isActive: checked })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" className="gradient-gold text-primary">
                  {editing ? "Simpan Perubahan" : "Simpan Agen"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Agen</p>
            <p className="text-2xl font-bold">{agents.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Agen Aktif</p>
            <p className="text-2xl font-bold">{activeCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Halaman Publik</p>
            <p className="text-2xl font-bold">{publishedCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
            <Percent className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rata-rata Komisi</p>
            <p className="text-2xl font-bold">{avgCommission}%</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Jumlah Agen per Branch</h2>
            <p className="text-sm text-muted-foreground">
              Statistik berdasarkan <code>branch_id</code> dari data agen yang
              sudah diaudit dan diurutkan berdasarkan kode agen.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            aria-expanded={showBranchStats}
            aria-controls="agent-branch-statistics"
            onClick={() => setShowBranchStats((current) => !current)}
          >
            {showBranchStats ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" /> Tutup
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" /> Buka
              </>
            )}
          </Button>
        </div>
        {showBranchStats && (
          <div id="agent-branch-statistics" className="mt-4">
            {agentBranchStats.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                Belum ada data agen.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={agentBranchStats}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="branch"
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={55}
                    className="text-xs"
                  />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip
                    formatter={(value) => [value, "Jumlah agen"]}
                    labelFormatter={(label, payload) =>
                      `${label} (${payload?.[0]?.payload?.branchId || "-"})`
                    }
                  />
                  <Bar
                    dataKey="jumlah"
                    name="Jumlah agen"
                    fill="#b98b2f"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleImportAgents}
        />
        <Button
          variant="outline"
          className="shrink-0"
          disabled={importingAgents}
          onClick={() => importInputRef.current?.click()}
        >
          <Download className="w-4 h-4 mr-2" />
          {importingAgents ? "Mengimport..." : "Import CSV"}
        </Button>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={downloadAgentImportTemplate}
        >
          <Download className="w-4 h-4 mr-2" /> Template Import
        </Button>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() =>
            exportToCsv(
              "agents",
              [
                "Kode Cabang",
                "Kode Agen",
                "Nama",
                "Gender",
                "Alamat",
                "Tgl Lahir",
                "No Tel",
                "Cabang",
                "Komisi (%)",
                "Status",
              ],
              filteredAgents.map((agent) => [
                agent.branch?.code || "-",
                agent.agentCode || "-",
                agent.name,
                agent.gender || "-",
                agent.address || "-",
                agent.dateOfBirth || "-",
                agent.phone || "-",
                agent.branch?.name || "-",
                String(agent.commissionPercent || 0),
                agent.isActive ? "Aktif" : "Nonaktif",
              ]),
            )
          }
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() =>
            exportToExcel(
              "agents",
              [
                "Kode Cabang",
                "Kode Agen",
                "Nama",
                "Gender",
                "Alamat",
                "Tgl Lahir",
                "No Tel",
                "Cabang",
                "Komisi (%)",
                "Status",
              ],
              filteredAgents.map((agent) => [
                agent.branch?.code || "-",
                agent.agentCode || "-",
                agent.name,
                agent.gender || "-",
                agent.address || "-",
                agent.dateOfBirth || "-",
                agent.phone || "-",
                agent.branch?.name || "-",
                String(agent.commissionPercent || 0),
                agent.isActive ? "Aktif" : "Nonaktif",
              ]),
            )
          }
        >
          <Download className="w-4 h-4 mr-2" /> Export Excel
        </Button>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() =>
            window.open(
              `${(import.meta.env.VITE_API_URL as string | undefined) ?? ""}/api/admin/reports/commissions.xlsx`,
              "_blank",
            )
          }
        >
          <Download className="w-4 h-4 mr-2" /> Export Komisi
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Cari nama, kode agen, atau telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="w-full lg:w-[220px]">
            <SelectValue placeholder="Filter cabang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Cabang</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.code ? `${branch.code} — ` : ""}
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold" />
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {searchTerm || filterBranch !== "all"
            ? "Tidak ada agen yang sesuai filter"
            : "Belum ada agen terdaftar"}
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama & Kontak</TableHead>
                    <TableHead>Gender / Tgl Lahir</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead>Publik / QR</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="font-mono text-xs font-semibold">
                          {agent.agentCode || "-"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          ref: {agent.referralCode || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {agent.photoUrl ? (
                            <img
                              src={agent.photoUrl}
                              alt={agent.name}
                              className="h-10 w-10 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                              {agent.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">{agent.name}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Phone className="w-3 h-3" />
                              {agent.phone || "-"}
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              Gabung: {agent.joinedAt || "-"} · MOU:{" "}
                              {agent.mouNumber || "-"}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Berlaku: {agent.validUntil || "-"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {agent.gender === "L"
                            ? "Laki-laki"
                            : agent.gender === "P"
                              ? "Perempuan"
                              : "-"}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <CalendarDays className="w-3 h-3" />
                          {agent.dateOfBirth || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div
                          className="truncate text-sm"
                          title={agent.address || ""}
                        >
                          {agent.address || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {agent.branch ? (
                          <Badge variant="outline" className="font-normal">
                            <Building2 className="w-3 h-3 mr-1" />
                            {agent.branch.code ? `${agent.branch.code} — ` : ""}
                            {agent.branch.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Pusat</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {agent.publicPageEnabled &&
                          agent.isActive &&
                          agent.publicSlug ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setQrAgent(agent)}
                                className="rounded-lg bg-primary/10 p-1.5 text-primary hover:bg-primary/20"
                                title="Tampilkan QR"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <a
                                href={`/agen/${agent.publicSlug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline"
                                title="Buka halaman publik"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Tidak terbit
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={agent.isActive}
                          onCheckedChange={() => handleToggleActive(agent)}
                        />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIdCardAgent(agent)}
                          title="Preview ID Card"
                        >
                          <FileBadge className="w-4 h-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(agent)}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => requestDelete(agent.id)}
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}

      <Dialog
        open={!!qrAgent}
        onOpenChange={(open) => {
          if (!open) setQrAgent(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Halaman Agen</DialogTitle>
            <DialogDescription>
              Scan QR ini untuk membuka halaman publik agen di website.
            </DialogDescription>
          </DialogHeader>
          {qrAgent && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-5 rounded-2xl border shadow-sm">
                <QRCodeSVG
                  value={publicUrl(qrAgent)}
                  size={240}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="text-center">
                <p className="font-semibold">{qrAgent.name}</p>
                <p className="text-xs text-muted-foreground break-all mt-1">
                  {publicUrl(qrAgent)}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyPublicUrl(qrAgent)}
                >
                  <Copy className="w-4 h-4 mr-2" /> Salin Link
                </Button>
                <Button
                  className="gradient-gold text-primary"
                  onClick={() => downloadQr(qrAgent)}
                >
                  <Download className="w-4 h-4 mr-2" /> Download QR
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(publicUrl(qrAgent), "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> Buka Halaman
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AgentIdCardDialog
        agent={idCardAgent}
        onOpenChange={(open) => {
          if (!open) setIdCardAgent(null);
        }}
      />
    </div>
  );
};

export default AdminAgents;
