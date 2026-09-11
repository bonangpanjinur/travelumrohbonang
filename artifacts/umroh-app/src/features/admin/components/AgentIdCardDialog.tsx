import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";
import { BadgeCheck, Download, ExternalLink, FileText, Printer, QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";

type AgentIdCardAgent = {
  id: string;
  name: string;
  agentCode: string | null;
  referralCode: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  joinedAt: string | null;
  mouNumber: string | null;
  validUntil: string | null;
  publicSlug: string | null;
  isActive: boolean;
  branch?: { code: string | null; name: string } | null;
};

type Props = { agent: AgentIdCardAgent | null; onOpenChange: (open: boolean) => void };

const formatDate = (value: string | null) => {
  if (!value) return "Belum diisi";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const publicUrlFor = (agent: AgentIdCardAgent) => agent.publicSlug ? `${window.location.origin}/agen/${agent.publicSlug}?ref=${encodeURIComponent(agent.referralCode || agent.agentCode || "")}` : "";

export default function AgentIdCardDialog({ agent, onOpenChange }: Props) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [generating, setGenerating] = useState(false);
  const missing = useMemo(() => agent ? [
    !agent.photoUrl && "foto",
    !agent.validUntil && "masa berlaku",
    !agent.mouNumber && "nomor MOU",
    !agent.branch && "cabang",
    !agent.publicSlug && "slug halaman publik",
  ].filter(Boolean) as string[] : [], [agent]);

  if (!agent) return null;
  const branchName = agent.branch?.name || "Kantor Pusat";
  const branchCode = agent.branch?.code ? `${agent.branch.code} · ` : "";
  const url = publicUrlFor(agent);

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 53.98] });
      const maroon = "#6f1727";
      const gold = "#c89b3c";
      const cream = "#fbf7ef";
      const drawHeader = (doc: jsPDF, title: string) => {
        doc.setFillColor(maroon); doc.rect(0, 0, 85.6, 53.98, "F");
        doc.setFillColor(gold); doc.rect(0, 0, 85.6, 3.2, "F"); doc.rect(0, 50.78, 85.6, 3.2, "F");
        doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("UMROHPLUS", 6, 11);
        doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.text("TRAVEL & TOURS", 6, 15); doc.setFontSize(7); doc.text(title, 79.6, 12, { align: "right" });
      };
      drawHeader(pdf, "ID CARD AGEN");
      pdf.setFillColor(cream); pdf.roundedRect(5.5, 18, 19, 25, 2, 2, "F");
      if (agent.photoUrl) {
        try { const image = await fetch(agent.photoUrl).then((response) => response.blob()).then((blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); })); pdf.addImage(image, "JPEG", 6.7, 19.2, 16.6, 22.6); } catch { /* preview placeholder is retained */ }
      }
      pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.text(agent.name.toUpperCase().slice(0, 25), 29, 25);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6); pdf.text(`KODE AGEN  ${agent.agentCode || "-"}`, 29, 30); pdf.text(`CABANG  ${branchName.slice(0, 28)}`, 29, 35); pdf.text(`STATUS  ${agent.isActive ? "AKTIF" : "NONAKTIF"}`, 29, 40);
      pdf.setTextColor(255, 220, 135); pdf.setFontSize(5.5); pdf.text(`ID CARD · ${agent.agentCode || agent.id.slice(0, 8).toUpperCase()}`, 29, 46);
      pdf.addPage([85.6, 53.98], "landscape"); drawHeader(pdf, "DATA AGEN");
      pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.text(agent.name.toUpperCase().slice(0, 27), 6, 22);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6); pdf.text(`Kode Referral : ${agent.referralCode || agent.agentCode || "-"}`, 6, 27); pdf.text(`No. MOU       : ${agent.mouNumber || "-"}`, 6, 32); pdf.text(`Bergabung     : ${formatDate(agent.joinedAt)}`, 6, 37); pdf.text(`Berlaku s.d.  : ${formatDate(agent.validUntil)}`, 6, 42); pdf.text(`Cabang        : ${branchCode}${branchName}`.slice(0, 62), 6, 47);
      if (url) { try { const qr = await QRCode.toDataURL(url, { width: 300, margin: 1, errorCorrectionLevel: "H" }); pdf.addImage(qr, "PNG", 65, 20, 15, 15); } catch { /* QR is optional when no public page exists */ } }
      pdf.setFontSize(4.5); pdf.text("Kartu ini adalah identitas resmi agen dan berlaku sesuai masa kerja sama.", 6, 51.5);
      pdf.save(`id-card-agen-${(agent.agentCode || agent.name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
    } finally { setGenerating(false); }
  };

  const printCard = () => window.print();
  return <Dialog open={!!agent} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-4xl max-h-[94vh] overflow-y-auto">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Preview ID Card Agen</DialogTitle><DialogDescription>Periksa sisi depan dan belakang sebelum mengunduh PDF ukuran CR80 (85,60 × 53,98 mm).</DialogDescription></DialogHeader>
      {missing.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Data belum lengkap:</strong> {missing.join(", ")}. Kartu tetap dapat dibuat dengan placeholder.</div>}
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-lg bg-muted p-1"><button className={`rounded-md px-4 py-2 text-sm font-medium ${side === "front" ? "bg-background shadow-sm" : "text-muted-foreground"}`} onClick={() => setSide("front")}>Depan</button><button className={`rounded-md px-4 py-2 text-sm font-medium ${side === "back" ? "bg-background shadow-sm" : "text-muted-foreground"}`} onClick={() => setSide("back")}>Belakang</button></div><div className="flex gap-2"><Button variant="outline" onClick={printCard}><Printer className="mr-2 h-4 w-4" /> Print</Button><Button className="gradient-gold text-primary" onClick={generatePdf} disabled={generating}><Download className="mr-2 h-4 w-4" /> {generating ? "Membuat PDF…" : "Download PDF"}</Button></div></div>
      <div className="flex justify-center rounded-2xl bg-muted/50 p-5 sm:p-10"><div className="aspect-[85.6/53.98] w-full max-w-[680px] overflow-hidden rounded-[22px] shadow-2xl" style={{ background: "#6f1727" }}>{side === "front" ? <div className="relative h-full w-full p-[5.5%] text-white"><div className="absolute inset-x-0 top-0 h-[6%] bg-[#c89b3c]" /><div className="absolute inset-x-0 bottom-0 h-[6%] bg-[#c89b3c]" /><div className="flex items-start justify-between"><div><div className="text-[clamp(12px,2.4vw,23px)] font-black tracking-wider">UMROHPLUS</div><div className="text-[clamp(7px,1.2vw,12px)] tracking-[.22em] text-amber-100">TRAVEL & TOURS</div></div><div className="text-[clamp(8px,1.4vw,14px)] font-bold tracking-widest">ID CARD AGEN</div></div><div className="mt-[5%] flex items-center gap-[5%]"><div className="h-[48%] w-[23%] overflow-hidden rounded-xl bg-[#fbf7ef] ring-2 ring-amber-200/70">{agent.photoUrl ? <img src={agent.photoUrl} alt={agent.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[clamp(22px,5vw,52px)] font-bold text-[#6f1727]">{agent.name.charAt(0).toUpperCase()}</div>}</div><div className="min-w-0"><div className="truncate text-[clamp(14px,3vw,31px)] font-black uppercase">{agent.name}</div><div className="mt-2 space-y-1 text-[clamp(8px,1.5vw,15px)] text-amber-50"><div><span className="text-amber-200">Kode:</span> {agent.agentCode || "-"}</div><div><span className="text-amber-200">Cabang:</span> {branchName}</div><div className="flex items-center gap-1"><BadgeCheck className="h-4 w-4 text-amber-200" /> {agent.isActive ? "AKTIF" : "NONAKTIF"}</div></div></div></div><div className="absolute bottom-[10%] text-[clamp(7px,1.2vw,12px)] font-mono text-amber-200">ID CARD · {agent.agentCode || agent.id.slice(0, 8).toUpperCase()}</div></div> : <div className="relative h-full w-full p-[5.5%] text-white"><div className="flex items-center justify-between"><div className="text-[clamp(12px,2.4vw,23px)] font-black tracking-wider">DATA AGEN</div><ShieldCheck className="h-[8%] w-[8%] text-amber-200" /></div><div className="mt-[4%] grid grid-cols-[1fr_auto] gap-4"><div className="space-y-1 text-[clamp(8px,1.45vw,15px)]"><div className="mb-2 truncate text-[clamp(11px,2vw,20px)] font-bold uppercase">{agent.name}</div><div><span className="text-amber-200">Kode Referral :</span> {agent.referralCode || agent.agentCode || "-"}</div><div><span className="text-amber-200">No. MOU :</span> {agent.mouNumber || "-"}</div><div><span className="text-amber-200">Bergabung :</span> {formatDate(agent.joinedAt)}</div><div><span className="text-amber-200">Berlaku s.d. :</span> {formatDate(agent.validUntil)}</div><div className="truncate"><span className="text-amber-200">Cabang :</span> {branchCode}{branchName}</div></div>{url ? <div className="rounded-lg bg-white p-2"><QRCodeSVG value={url} size={120} level="H" /></div> : <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-white/10 text-center text-[10px] text-amber-100"><QrCode className="mb-1 h-5 w-5" /><span>QR belum tersedia</span></div>}</div><div className="absolute bottom-[9%] left-[5.5%] right-[5.5%] text-[clamp(7px,1.2vw,12px)] text-amber-100">Kartu ini adalah identitas resmi agen dan berlaku sesuai masa kerja sama.</div></div>}</div></div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Preview proporsional · siap cetak bolak-balik</span>{url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Buka halaman publik</a>}</div>
    </DialogContent>
  </Dialog>;
}
