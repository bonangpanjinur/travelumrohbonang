/**
 * PilgrimImportDialog
 * Import jemaah massal dari file CSV dengan field mapping yang bisa dikonfigurasi.
 *
 * Steps:
 *  1. Upload — pilih file CSV
 *  2. Mapping — atur kolom CSV mana → field jemaah mana
 *  3. Preview — lihat 5 baris pertama sebelum import
 *  4. Result — ringkasan hasil import
 */
import { useState, useRef, useCallback } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { useToast } from "@/shared/hooks/use-toast";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { exportToCsv } from "@/shared/lib/exportCsv";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
} from "lucide-react";

// ─── Field definitions ────────────────────────────────────────────────────────

export const PILGRIM_FIELDS = [
  { key: "bookingCode",    label: "Kode Booking",        required: true,  hint: "Wajib — untuk menautkan ke booking yang ada" },
  { key: "name",           label: "Nama Lengkap",        required: true,  hint: "Wajib" },
  { key: "gender",         label: "Jenis Kelamin",       required: false, hint: "L / P / male / female" },
  { key: "nik",            label: "NIK",                 required: false, hint: "" },
  { key: "phone",          label: "No. HP",              required: false, hint: "" },
  { key: "email",          label: "Email",               required: false, hint: "" },
  { key: "birthDate",      label: "Tgl Lahir",           required: false, hint: "YYYY-MM-DD atau DD/MM/YYYY" },
  { key: "nationality",    label: "Kewarganegaraan",     required: false, hint: "" },
  { key: "passportNumber", label: "No. Paspor",          required: false, hint: "" },
  { key: "passportExpiry", label: "Exp. Paspor",         required: false, hint: "YYYY-MM-DD atau DD/MM/YYYY" },
  { key: "roomType",       label: "Tipe Kamar",          required: false, hint: "quad / triple / double / single" },
  { key: "notes",          label: "Catatan",             required: false, hint: "" },
] as const;

type FieldKey = typeof PILGRIM_FIELDS[number]["key"];

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  // Strip BOM
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

// ─── Auto-map headers to field keys ──────────────────────────────────────────

const AUTO_PATTERNS: Record<FieldKey, RegExp> = {
  bookingCode:    /kode.?booking|booking.?code|kode/i,
  name:           /^nama|^name/i,
  gender:         /gender|jenis.?kelamin|l\/p/i,
  nik:            /^nik$/i,
  phone:          /hp|phone|telp|no\.?\s*hp|handphone/i,
  email:          /email/i,
  birthDate:      /lahir|birth|tgl\.?\s*lahir/i,
  nationality:    /kewarganeg|nationality/i,
  passportNumber: /paspor|passport|no\.?\s*paspor/i,
  passportExpiry: /exp|expired|masa.?berlaku/i,
  roomType:       /kamar|room.?type|tipe/i,
  notes:          /catatan|notes|keterangan/i,
};

function autoMap(headers: string[]): Record<FieldKey, string> {
  const map = {} as Record<FieldKey, string>;
  for (const field of PILGRIM_FIELDS) {
    const matched = headers.find((h) => AUTO_PATTERNS[field.key]?.test(h));
    if (matched) map[field.key] = matched;
  }
  return map;
}

// ─── Template download ────────────────────────────────────────────────────────

function downloadTemplate() {
  const headers = PILGRIM_FIELDS.map((f) => f.label);
  exportToCsv("template-import-jemaah", headers, [
    ["BNG-XXXXXX", "Nama Lengkap Jemaah", "L", "3201XXXXXXXX", "08XXXXXXXXX",
     "email@example.com", "1990-01-01", "Indonesia", "A12345678", "2030-01-01", "quad", ""],
  ]);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "upload" | "map" | "preview" | "result";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export default function PilgrimImportDialog({ open, onOpenChange, onImported }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [fieldMap, setFieldMap] = useState<Partial<Record<FieldKey, string>>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");

  const reset = useCallback(() => {
    setStep("upload");
    setHeaders([]);
    setCsvRows([]);
    setFieldMap({});
    setImporting(false);
    setResult(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows: r } = parseCsv(text);
      if (h.length === 0) {
        toast({ title: "File tidak valid", description: "Pastikan file CSV memiliki header di baris pertama.", variant: "destructive" });
        return;
      }
      if (r.length > 500) {
        toast({ title: "File terlalu besar", description: "Maksimal 500 baris per impor. Pecah file menjadi beberapa bagian.", variant: "destructive" });
        return;
      }
      setHeaders(h);
      setCsvRows(r);
      setFieldMap(autoMap(h));
      setStep("map");
    };
    reader.readAsText(file, "UTF-8");
  };

  // Build rows using the current field mapping
  const buildRows = () =>
    csvRows.map((row) => {
      const obj: Record<string, string> = {};
      for (const field of PILGRIM_FIELDS) {
        const col = fieldMap[field.key];
        if (col) {
          const idx = headers.indexOf(col);
          obj[field.key] = idx >= 0 ? (row[idx] ?? "") : "";
        }
      }
      return obj;
    });

  const handleImport = async () => {
    setImporting(true);
    try {
      const rows = buildRows();
      const data = await apiFetch<ImportResult>("/api/admin/pilgrims-db/import", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      setResult(data);
      setStep("result");
      if (data.imported > 0) onImported();
    } catch (err: any) {
      toast({ title: "Gagal mengimpor", description: err?.message ?? "Coba lagi.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const mappedCount = PILGRIM_FIELDS.filter((f) => fieldMap[f.key]).length;
  const requiredMapped = PILGRIM_FIELDS.filter((f) => f.required).every((f) => fieldMap[f.key]);
  const previewRows = csvRows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Jemaah dari CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
          {(["upload", "map", "preview", "result"] as Step[]).map((s, i) => {
            const labels = ["Upload", "Mapping", "Preview", "Hasil"];
            const active = step === s;
            const done = ["upload", "map", "preview", "result"].indexOf(step) > i;
            return (
              <span key={s} className="flex items-center gap-1">
                <span className={`px-2 py-0.5 rounded-full font-medium ${active ? "bg-primary text-primary-foreground" : done ? "bg-green-100 text-green-700" : "bg-muted"}`}>
                  {i + 1}. {labels[i]}
                </span>
                {i < 3 && <ArrowRight className="w-3 h-3" />}
              </span>
            );
          })}
        </div>

        {/* ── STEP 1: Upload ───────────────────────────────────────────────── */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Klik untuk memilih file CSV</p>
              <p className="text-sm text-muted-foreground mt-1">Format: .csv, maksimal 500 baris</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Belum punya template?</p>
                <p className="text-xs text-muted-foreground">Download template CSV dengan semua kolom yang tersedia</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" /> Download Template
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1 border rounded-lg p-3">
              <p className="font-medium text-foreground">Petunjuk:</p>
              <p>• Baris pertama CSV harus berisi nama kolom (header)</p>
              <p>• Kolom <strong>Kode Booking</strong> dan <strong>Nama Lengkap</strong> wajib diisi</p>
              <p>• Kode booking harus sudah ada di sistem (misal: BNG-XXXXXX)</p>
              <p>• Tanggal bisa dalam format YYYY-MM-DD atau DD/MM/YYYY</p>
              <p>• Jenis kelamin: L atau P (atau male / female)</p>
            </div>
          </div>
        )}

        {/* ── STEP 2: Mapping ──────────────────────────────────────────────── */}
        {step === "map" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                File: <strong>{fileName}</strong> — {csvRows.length} baris data, {headers.length} kolom
              </span>
              <Badge variant="outline">{mappedCount} / {PILGRIM_FIELDS.length} field dipetakan</Badge>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Field Jemaah</TableHead>
                    <TableHead>Kolom CSV</TableHead>
                    <TableHead className="text-xs text-muted-foreground w-[200px]">Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PILGRIM_FIELDS.map((field) => (
                    <TableRow key={field.key} className={field.required && !fieldMap[field.key] ? "bg-red-50" : ""}>
                      <TableCell className="font-medium text-sm">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={fieldMap[field.key] ?? "__none__"}
                          onValueChange={(v) =>
                            setFieldMap((prev) => {
                              const next = { ...prev };
                              if (v === "__none__") delete next[field.key];
                              else next[field.key] = v;
                              return next;
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="— Abaikan —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Abaikan —</SelectItem>
                            {headers.map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{field.hint}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {!requiredMapped && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Kolom <strong>Kode Booking</strong> dan <strong>Nama Lengkap</strong> wajib dipetakan.
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={reset}>← Ganti File</Button>
              <Button onClick={() => setStep("preview")} disabled={!requiredMapped}>
                Preview Data →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview ──────────────────────────────────────────────── */}
        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview {Math.min(5, csvRows.length)} dari {csvRows.length} baris. Klik "Import Sekarang" untuk memulai.
            </p>

            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {PILGRIM_FIELDS.filter((f) => fieldMap[f.key]).map((f) => (
                      <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buildRows().slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {PILGRIM_FIELDS.filter((f) => fieldMap[f.key]).map((f) => (
                        <TableCell key={f.key} className="text-xs truncate max-w-[120px]">
                          {row[f.key] || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {csvRows.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                … dan {csvRows.length - 5} baris lainnya
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("map")}>← Ubah Mapping</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Mengimpor…</>
                ) : (
                  <>Import {csvRows.length} Jemaah</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Result ───────────────────────────────────────────────── */}
        {step === "result" && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-600" />
                <div className="text-2xl font-bold text-green-700">{result.imported}</div>
                <div className="text-xs text-green-600">Berhasil diimpor</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <AlertCircle className="w-6 h-6 mx-auto mb-1 text-yellow-600" />
                <div className="text-2xl font-bold text-yellow-700">{result.skipped}</div>
                <div className="text-xs text-yellow-600">Dilewati</div>
              </div>
              <div className="bg-muted border rounded-lg p-4 text-center">
                <FileSpreadsheet className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                <div className="text-2xl font-bold">{csvRows.length}</div>
                <div className="text-xs text-muted-foreground">Total baris</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> {result.errors.length} baris gagal:
                </p>
                <div className="border border-red-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Baris</TableHead>
                        <TableHead>Alasan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">Baris {e.row}</TableCell>
                          <TableCell className="text-sm text-red-600">{e.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={reset}>Import File Lain</Button>
              <Button onClick={() => { onOpenChange(false); reset(); }}>
                Selesai
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
