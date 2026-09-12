import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { GState, jsPDF } from "jspdf";
import {
  BadgeCheck,
  Download,
  ExternalLink,
  FileText,
  Printer,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { apiFetch } from "@/shared/lib/apiClient";
import { useToast } from "@/shared/hooks/use-toast";

type AgentIdCardAgent = {
  id: string;
  name: string;
  agentCode: string | null;
  referralCode: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  bannerIdCardUrl?: string | null;
  joinedAt: string | null;
  mouNumber: string | null;
  validUntil: string | null;
  publicSlug: string | null;
  isActive: boolean;
  branch?: { code: string | null; name: string } | null;
};

type Props = {
  agent: AgentIdCardAgent | null;
  onOpenChange: (open: boolean) => void;
};
type Branding = { company_name: string; logo_url: string };

const CARD_WIDTH = 53.98;
const CARD_HEIGHT = 85.6;
const GREEN = "#087443";
const DARK_GREEN = "#075c39";
const LIME = "#83cc4b";
const formatDate = (value: string | null) => {
  if (!value) return "Belum diisi";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
};
const publicUrlFor = (agent: AgentIdCardAgent) =>
  agent.publicSlug
    ? `${window.location.origin}/agen/${agent.publicSlug}?ref=${encodeURIComponent(agent.referralCode || agent.agentCode || "")}`
    : "";
const safeName = (agent: AgentIdCardAgent) =>
  (agent.agentCode || agent.name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
const defaultBranding: Branding = { company_name: "UmrohPlus", logo_url: "" };

export default function AgentIdCardDialog({ agent, onOpenChange }: Props) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [generating, setGenerating] = useState(false);
  const [branding, setBranding] = useState<Branding>(defaultBranding);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  useEffect(() => {
    if (!agent) return;
    apiFetch<{ data?: Array<{ key: string; value: unknown }> }>(
      "/api/cms/site-settings",
    )
      .then((result) => {
        const setting = result?.data?.find((item) => item.key === "branding");
        if (setting?.value && typeof setting.value === "object")
          setBranding({
            ...defaultBranding,
            ...(setting.value as Partial<Branding>),
          });
      })
      .catch(() => undefined);
  }, [agent]);
  const missing = useMemo(
    () =>
      agent
        ? ([
            !agent.photoUrl && "foto",
            !agent.validUntil && "masa berlaku",
            !agent.mouNumber && "nomor MOU",
            !agent.branch && "cabang",
            !agent.publicSlug && "slug halaman publik",
          ].filter(Boolean) as string[])
        : [],
    [agent],
  );

  if (!agent) return null;
  const branchName = agent.branch?.name || "Kantor Pusat";
  const branchCode = agent.branch?.code ? `${agent.branch.code} · ` : "";
  const url = publicUrlFor(agent);
  const cardTitle = "ID CARD AGEN";
  const companyName = branding.company_name || defaultBranding.company_name;

  const generatePdfLegacy = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [CARD_WIDTH, CARD_HEIGHT],
      });
      const fetchImageData = async (source: string) => {
        const response = await fetch(source);
        if (!response.ok)
          throw new Error(`Image request failed: ${response.status}`);
        const blob = await response.blob();
        const format = blob.type.toLowerCase().includes("png") ? "PNG" : "JPEG";
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return { data, format };
      };
      const bannerData = agent.bannerIdCardUrl
        ? await fetchImageData(agent.bannerIdCardUrl).catch(() => null)
        : null;
      const drawFrame = async (doc: jsPDF) => {
        doc.setFillColor(248, 250, 249);
        doc.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, "F");
        if (bannerData) {
          try {
            doc.setGState(new GState({ opacity: 0.12 }));
            doc.addImage(
              bannerData.data,
              bannerData.format,
              0,
              0,
              CARD_WIDTH,
              CARD_HEIGHT,
            );
            doc.setGState(new GState({ opacity: 1 }));
          } catch {
            // Optional banner failures must not prevent PDF generation.
          }
        }
        doc.setFillColor(7, 92, 57);
        doc.triangle(0, 0, 25, 0, 0, 18, "F");
        doc.triangle(
          CARD_WIDTH,
          CARD_HEIGHT,
          CARD_WIDTH - 24,
          CARD_HEIGHT,
          CARD_WIDTH,
          CARD_HEIGHT - 17,
          "F",
        );
        doc.setFillColor(131, 204, 75);
        doc.triangle(0, 0, 36, 0, 0, 7, "F");
        doc.triangle(
          CARD_WIDTH,
          CARD_HEIGHT,
          CARD_WIDTH - 35,
          CARD_HEIGHT,
          CARD_WIDTH,
          CARD_HEIGHT - 7,
          "F",
        );
        doc.setDrawColor(131, 204, 75);
        doc.setLineWidth(1.2);
        doc.line(0, 6, CARD_WIDTH, 10);
        doc.line(0, CARD_HEIGHT - 6, CARD_WIDTH, CARD_HEIGHT - 10);
      };
      let photoLoaded = false;
      const addCircularImage = async () => {
        if (!agent.photoUrl) return;
        try {
          const imageUrl = await fetch(agent.photoUrl)
            .then((response) => {
              if (!response.ok)
                throw new Error(`Photo request failed: ${response.status}`);
              return response.blob();
            })
            .then((blob) => URL.createObjectURL(blob));
          const image = await new Promise<HTMLImageElement>(
            (resolve, reject) => {
              const element = new Image();
              element.onload = () => resolve(element);
              element.onerror = reject;
              element.src = imageUrl;
            },
          );
          const canvas = document.createElement("canvas");
          canvas.width = 900;
          canvas.height = 900;
          const context = canvas.getContext("2d");
          if (!context) return;
          const sourceWidth = image.naturalWidth || image.width;
          const sourceHeight = image.naturalHeight || image.height;
          const size = Math.min(sourceWidth, sourceHeight);
          const sourceX = (sourceWidth - size) / 2;
          const sourceY = (sourceHeight - size) / 2;
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.beginPath();
          context.arc(450, 450, 450, 0, Math.PI * 2);
          context.closePath();
          context.clip();
          context.drawImage(
            image,
            sourceX,
            sourceY,
            size,
            size,
            0,
            0,
            900,
            900,
          );
          URL.revokeObjectURL(imageUrl);
          pdf.addImage(
            canvas.toDataURL("image/png"),
            "PNG",
            13.5,
            26.5,
            27,
            27,
          );
          photoLoaded = true;
        } catch {
          toast({
            title: "Foto agen tidak dapat dimuat",
            description: "PDF dibuat dengan placeholder foto.",
            variant: "destructive",
          });
        }
      };
      const addBrandLogo = async () => {
        if (!branding.logo_url) return false;
        try {
          const image = await fetch(branding.logo_url)
            .then((response) => response.blob())
            .then(
              (blob) =>
                new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                }),
            );
          pdf.addImage(image, "PNG", 23, 9, 8, 5);
          return true;
        } catch {
          toast({
            title: "Logo tidak dapat dimuat",
            description: "PDF dibuat tanpa logo.",
            variant: "destructive",
          });
          return false;
        }
      };
      await drawFrame(pdf);
      pdf.setTextColor(7, 92, 57);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(4.5);
      pdf.text(companyName.toUpperCase().slice(0, 28), CARD_WIDTH / 2, 21, {
        align: "center",
      });
      if (branding.logo_url) {
        try {
          const image = await fetch(branding.logo_url)
            .then((response) => response.blob())
            .then(
              (blob) =>
                new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                }),
            );
          pdf.addImage(image, "PNG", 17, 7, 20, 11);
        } catch {
          await addBrandLogo();
        }
      } else {
        pdf.setFillColor(7, 92, 57);
        pdf.roundedRect(17, 7, 20, 11, 2, 2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.text(companyName.charAt(0).toUpperCase(), CARD_WIDTH / 2, 14.5, {
          align: "center",
        });
      }
      pdf.setTextColor(7, 92, 57);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.8);
      pdf.text(cardTitle, CARD_WIDTH / 2, 25, { align: "center" });
      await addCircularImage();
      pdf.setDrawColor(8, 116, 67);
      pdf.setLineWidth(1.1);
      pdf.circle(CARD_WIDTH / 2, 40, 13.5);
      if (!photoLoaded) {
        pdf.setTextColor(8, 116, 67);
        pdf.setFontSize(22);
        pdf.text(agent.name.charAt(0).toUpperCase(), CARD_WIDTH / 2, 47, {
          align: "center",
        });
      }
      pdf.setTextColor(7, 92, 57);
      pdf.setFontSize(7.5);
      pdf.text(agent.name.toUpperCase().slice(0, 20), CARD_WIDTH / 2, 57, {
        align: "center",
      });
      pdf.setDrawColor(8, 116, 67);
      pdf.setLineWidth(0.45);
      pdf.line(12, 59.5, CARD_WIDTH - 12, 59.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.5);
      pdf.text("AGEN / MITRA RESMI", CARD_WIDTH / 2, 63, { align: "center" });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6);
      pdf.text(`ID ${agent.agentCode || "-"}`, CARD_WIDTH / 2, 68, {
        align: "center",
      });
      pdf.addPage([CARD_WIDTH, CARD_HEIGHT], "portrait");
      await drawFrame(pdf);
      pdf.setTextColor(7, 92, 57);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("DATA AGEN", CARD_WIDTH / 2, 16, {
        align: "center",
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.8);
      pdf.text(`Kode Agen      : ${agent.agentCode || "-"}`, 7, 25);
      pdf.text(
        `Kode Referral  : ${agent.referralCode || agent.agentCode || "-"}`,
        7,
        31,
      );
      pdf.text(`No. MOU        : ${agent.mouNumber || "-"}`, 7, 37);
      pdf.text(`Bergabung      : ${formatDate(agent.joinedAt)}`, 7, 43);
      pdf.text(`Berlaku s.d.   : ${formatDate(agent.validUntil)}`, 7, 49);
      pdf.text(`Kontak         : ${agent.phone || agent.email || "-"}`, 7, 55);
      pdf.text(
        `Cabang         : ${branchCode}${branchName}`.slice(0, 62),
        7,
        61,
      );
      if (url) {
        try {
          const qr = await QRCode.toDataURL(url, {
            width: 420,
            margin: 1,
            errorCorrectionLevel: "H",
          });
          pdf.addImage(qr, "PNG", 20, 65, 16, 16);
        } catch {
          toast({
            title: "QR tidak dapat dibuat",
            description: "PDF dibuat tanpa barcode.",
            variant: "destructive",
          });
        }
      }
      pdf.setFontSize(5);
      pdf.text(
        "Scan barcode untuk membuka profil publik agen",
        CARD_WIDTH / 2,
        83,
        { align: "center" },
      );
      pdf.save(`id-card-agen-${safeName(agent)}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  const generatePdf = async () => {
    if (!previewCardRef.current) return;
    setGenerating(true);
    const originalSide = side;
    try {
      const waitForPreview = async () => {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        const images = Array.from(
          previewCardRef.current?.querySelectorAll("img") || [],
        );
        await Promise.all(
          images.map(async (image) => {
            if (image.complete && image.naturalWidth > 0) return;
            try {
              await image.decode();
            } catch {
              // Optional images may fail without blocking PDF generation.
            }
          }),
        );
      };
      const captureSide = async (target: "front" | "back") => {
        setSide(target);
        await waitForPreview();
        const element = previewCardRef.current;
        if (!element) throw new Error("Preview ID card tidak ditemukan");
        const canvas = await html2canvas(element, {
          backgroundColor: "#f8faf9",
          scale: 3,
          useCORS: true,
          allowTaint: false,
          logging: false,
        });
        return canvas.toDataURL("image/png");
      };
      const frontImage = await captureSide("front");
      const backImage = await captureSide("back");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [CARD_WIDTH, CARD_HEIGHT],
        compress: true,
      });
      pdf.addImage(
        frontImage,
        "PNG",
        0,
        0,
        CARD_WIDTH,
        CARD_HEIGHT,
        undefined,
        "FAST",
      );
      pdf.addPage([CARD_WIDTH, CARD_HEIGHT], "portrait");
      pdf.addImage(
        backImage,
        "PNG",
        0,
        0,
        CARD_WIDTH,
        CARD_HEIGHT,
        undefined,
        "FAST",
      );
      pdf.save(`id-card-agen-${safeName(agent)}.pdf`);
    } catch (error) {
      console.error(error);
      toast({
        title: "PDF tidak dapat dibuat",
        description: "Pastikan gambar/logo dapat dimuat lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setSide(originalSide);
      setGenerating(false);
    }
  };

  const printCards = async () => {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      toast({
        title: "Tidak dapat membuka jendela cetak",
        description: "Izinkan popup untuk situs ini lalu coba lagi.",
        variant: "destructive",
      });
      return;
    }
    let qrData = "";
    if (url) {
      try {
        qrData = await QRCode.toDataURL(url, {
          width: 420,
          margin: 1,
          errorCorrectionLevel: "H",
        });
      } catch {
        toast({
          title: "QR tidak dapat dibuat",
          description: "Kartu tetap dapat dicetak tanpa QR.",
          variant: "destructive",
        });
      }
    }
    const escapeHtml = (value: string) =>
      value.replace(
        /[&<>'"]/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          })[character] || character,
      );
    const photo = agent.photoUrl
      ? `<img class="photo" src="${escapeHtml(agent.photoUrl)}" alt="Foto agen" />`
      : `<div class="photo placeholder">${escapeHtml(agent.name.charAt(0).toUpperCase())}</div>`;
    const logo = branding.logo_url
      ? `<img class="logo" src="${escapeHtml(branding.logo_url)}" alt="${escapeHtml(companyName)}" />`
      : "";
    printWindow.document
      .write(`<!doctype html><html><head><title>ID Card Agen - ${escapeHtml(agent.name)}</title><style>
      @page{size:53.98mm 85.6mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;font-family:Arial,sans-serif;color:#075c39}.card{position:relative;width:53.98mm;height:85.6mm;overflow:hidden;background:#f8faf9;page-break-after:always;padding:7mm 5mm;text-align:center}.card:last-child{page-break-after:auto}.card:first-child{background:#f8faf9;color:#075c39}.card:first-child .name,.card:first-child .id,.card:first-child .branch{color:#075c39}.back{background:#f8faf9}.corner{position:absolute;z-index:0}.banner{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.12;z-index:0}.top-dark{left:0;top:0;width:25mm;height:18mm;background:#075c39;clip-path:polygon(0 0,100% 0,0 100%)}.top-lime{right:0;top:0;width:54mm;height:11mm;background:#83cc4b;clip-path:polygon(34% 0,100% 0,100% 44%,0 100%)}.bottom-dark{right:0;bottom:0;width:25mm;height:17mm;background:#075c39;clip-path:polygon(100% 0,100% 100%,0 100%)}.bottom-lime{left:0;bottom:0;width:54mm;height:10mm;background:#83cc4b;clip-path:polygon(0 56%,100% 0,100% 100%,0 100%)}.content{position:relative;z-index:1}.brand{font-size:5pt;font-weight:600;letter-spacing:.4px}.logo{display:block;width:24mm;height:14mm;object-fit:contain;margin:0 auto 1mm}.sub{font-size:5pt;letter-spacing:1px}.title{margin-top:2mm;font-size:6pt;font-weight:700}.photo{display:block;width:27mm;height:27mm;margin:5mm auto 3mm;border:1.5mm solid #087443;border-radius:50%;object-fit:cover;background:#fff}.placeholder{display:flex;align-items:center;justify-content:center;color:#087443;font-size:28pt;font-weight:700}.name{font-size:11pt;font-weight:800;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.line{width:34mm;height:.5mm;margin:1.5mm auto;background:#087443}.role{font-size:7pt}.id{margin-top:3mm;font-size:7pt;font-weight:700}.branch{font-size:6.5pt;font-weight:700;text-transform:uppercase}.qr{width:15mm;height:15mm;margin:2mm auto 0;padding:1mm;border:1px solid #b7c5bd;border-radius:2mm;background:white}.back{padding:11mm 7mm;text-align:left}.back h1{text-align:center;font-size:11pt;margin:0}.back .accent{width:16mm;height:1mm;margin:3mm auto 8mm;background:#83cc4b}.details{padding:4mm;border:1px solid #b9d9c8;border-radius:3mm;background:rgba(255,255,255,.85);font-size:6.5pt;line-height:1.35}.details div{margin-bottom:2.5mm}.details b{display:block}.notice{margin-top:8mm;text-align:center;font-size:6.5pt;line-height:1.4}@media screen{body{background:#222;padding:20px}.card{margin:0 auto 20px;box-shadow:0 3px 15px #0008;transform:scale(1.35);transform-origin:top center;margin-bottom:130px}}
      </style></head><body><section class="card"><i class="corner top-dark"></i><i class="corner top-lime"></i><i class="corner bottom-dark"></i><i class="corner bottom-lime"></i>${agent.bannerIdCardUrl ? `<img class="banner" src="${escapeHtml(agent.bannerIdCardUrl)}" alt="" />` : ""}<div class="content">${logo}<div class="brand">${escapeHtml(companyName.toUpperCase())}</div><div class="sub">TRAVEL &amp; TOURS</div><div class="title">ID CARD AGEN</div>${photo}<div class="name">${escapeHtml(agent.name)}</div><div class="line"></div><div class="role">AGEN / MITRA RESMI</div><div class="id">ID ${escapeHtml(agent.agentCode || "-")}</div></div></section><section class="card back"><i class="corner top-dark"></i><i class="corner bottom-dark"></i>${agent.bannerIdCardUrl ? `<img class="banner" src="${escapeHtml(agent.bannerIdCardUrl)}" alt="" />` : ""}<div class="content"><h1>DATA AGEN</h1><div class="accent"></div><div class="details"><div><b>Nama Agen</b>${escapeHtml(agent.name)}</div><div><b>Kode Referral</b>${escapeHtml(agent.referralCode || agent.agentCode || "-")}</div><div><b>No. MOU</b>${escapeHtml(agent.mouNumber || "-")}</div><div><b>Bergabung</b>${escapeHtml(formatDate(agent.joinedAt))}</div><div><b>Berlaku s.d.</b>${escapeHtml(formatDate(agent.validUntil))}</div><div><b>Kontak</b>${escapeHtml(agent.phone || "-")}</div><div><b>Cabang</b>${escapeHtml(`${branchCode}${branchName}`)}</div></div>${qrData ? `<img class="qr" src="${qrData}" alt="QR Code" />` : ""}<div class="notice">Scan barcode untuk membuka profil publik agen.<br/>Kartu ini adalah identitas resmi agen dan berlaku sesuai masa kerja sama.</div></div></section></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    await Promise.all(
      Array.from(printWindow.document.images).map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.onload = () => resolve();
              image.onerror = () => resolve();
            }),
      ),
    );
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog open={!!agent} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Preview ID Card Agen
          </DialogTitle>
          <DialogDescription>
            Desain portrait vertikal seperti kartu contoh. Ukuran cetak CR80:
            53,98 × 85,60 mm.
          </DialogDescription>
        </DialogHeader>
        {missing.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Data belum lengkap:</strong> {missing.join(", ")}. Kartu
            tetap dapat dibuat dengan placeholder.
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg bg-muted p-1">
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium ${side === "front" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setSide("front")}
            >
              Depan
            </button>
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium ${side === "back" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setSide("back")}
            >
              Belakang
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={printCards}>
              <Printer className="mr-2 h-4 w-4" /> Cetak
            </Button>
            <Button
              className="bg-[#087443] text-white hover:bg-[#075c39]"
              onClick={generatePdf}
              disabled={generating}
            >
              <Download className="mr-2 h-4 w-4" />{" "}
              {generating ? "Membuat PDF…" : "Download PDF"}
            </Button>
          </div>
        </div>
        <div className="flex justify-center rounded-2xl bg-muted/50 p-5 sm:p-10">
          <div
            ref={previewCardRef}
            className="aspect-[53.98/85.6] w-full max-w-[380px] overflow-hidden rounded-[22px] shadow-2xl"
            style={{ background: "#f8faf9" }}
          >
            {side === "front" ? (
              <div className="relative h-full w-full overflow-hidden bg-[#f8faf9] px-[8%] pt-[8%] text-[#075c39]">
                {agent.bannerIdCardUrl && (
                  <img
                    src={agent.bannerIdCardUrl}
                    alt=""
                    className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-[0.12]"
                  />
                )}
                <div
                  className="absolute left-0 top-0 h-[18%] w-[45%] bg-[#075c39]"
                  style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                />
                <div
                  className="absolute right-0 top-0 h-[12%] w-full bg-[#83cc4b]"
                  style={{
                    clipPath: "polygon(34% 0, 100% 0, 100% 44%, 0 100%)",
                  }}
                />
                <div
                  className="absolute bottom-0 right-0 h-[18%] w-[46%] bg-[#075c39]"
                  style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
                />
                <div
                  className="absolute bottom-0 left-0 h-[12%] w-full bg-[#83cc4b]"
                  style={{
                    clipPath: "polygon(0 56%, 100% 0, 100% 100%, 0 100%)",
                  }}
                />
                <div className="relative text-center">
                  {branding.logo_url ? (
                    <img
                      src={branding.logo_url}
                      alt={companyName}
                      className="mx-auto mb-1 h-[16%] w-[42%] object-contain"
                    />
                  ) : (
                    <div className="mx-auto mb-1 flex h-[16%] w-[42%] items-center justify-center rounded-lg bg-[#075c39]/10 text-[clamp(16px,5vw,30px)] font-black text-[#075c39]">
                      {companyName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-[clamp(7px,2vw,13px)] font-medium tracking-[.08em] text-[#075c39]">
                    {companyName.toUpperCase()}
                  </div>
                  <div className="mt-[3%] text-[clamp(7px,1.8vw,13px)] font-bold tracking-[.08em]">
                    ID CARD AGEN
                  </div>
                  <div className="mx-auto mt-[6%] aspect-square w-[52%] overflow-hidden rounded-full border-[5px] border-[#087443] bg-white shadow-md">
                    {agent.photoUrl ? (
                      <img
                        src={agent.photoUrl}
                        alt={agent.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[clamp(35px,11vw,74px)] font-bold text-[#087443]">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="mt-[5%] truncate text-[clamp(14px,4.1vw,28px)] font-black uppercase tracking-wide">
                    {agent.name}
                  </div>
                  <div className="mx-auto mt-1 h-0.5 w-[68%] bg-[#087443]" />
                  <div className="mt-1 text-[clamp(8px,2.1vw,15px)] tracking-wide">
                    AGEN / MITRA RESMI
                  </div>
                  <div className="mt-[5%] text-[clamp(9px,2.4vw,17px)] font-bold">
                    ID {agent.agentCode || "-"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative h-full w-full overflow-hidden px-[10%] pt-[12%] text-[#075c39]">
                {agent.bannerIdCardUrl && (
                  <img
                    src={agent.bannerIdCardUrl}
                    alt=""
                    className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-[0.12]"
                  />
                )}
                <div
                  className="absolute left-0 top-0 h-[16%] w-[42%] bg-[#075c39]"
                  style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                />
                <div
                  className="absolute bottom-0 right-0 h-[16%] w-[42%] bg-[#075c39]"
                  style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
                />
                <div className="relative">
                  <div className="text-center text-[clamp(17px,5vw,32px)] font-black tracking-widest">
                    DATA AGEN
                  </div>
                  <div className="mx-auto mt-[4%] h-1 w-16 rounded bg-[#83cc4b]" />
                  <div className="mt-[8%] space-y-[3%] rounded-2xl border border-[#b9d9c8] bg-white/90 p-[6%] text-[clamp(8px,2.1vw,14px)] shadow-sm">
                    <div>
                      <span className="font-bold">Nama Agen</span>
                      <br />
                      {agent.name}
                    </div>
                    <div>
                      <span className="font-bold">Kode Referral</span>
                      <br />
                      {agent.referralCode || agent.agentCode || "-"}
                    </div>
                    <div>
                      <span className="font-bold">No. MOU</span>
                      <br />
                      {agent.mouNumber || "-"}
                    </div>
                    <div>
                      <span className="font-bold">Bergabung</span>
                      <br />
                      {formatDate(agent.joinedAt)}
                    </div>
                    <div>
                      <span className="font-bold">Berlaku s.d.</span>
                      <br />
                      {formatDate(agent.validUntil)}
                    </div>
                    <div>
                      <span className="font-bold">Kontak</span>
                      <br />
                      {agent.phone || agent.email || "-"}
                    </div>
                    <div>
                      <span className="font-bold">Cabang</span>
                      <br />
                      {branchCode}
                      {branchName}
                    </div>
                  </div>
                  <div className="mt-[5%] flex flex-col items-center gap-1">
                    {url ? (
                      <QRCodeSVG
                        value={url}
                        size={180}
                        level="H"
                        className="h-[22%] w-[22%] rounded-lg border-4 border-white bg-white p-1 shadow-sm"
                      />
                    ) : (
                      <div className="flex aspect-square w-[22%] items-center justify-center rounded-lg border border-slate-300 bg-white text-[#087443]">
                        <QrCode className="h-1/2 w-1/2" />
                      </div>
                    )}
                    <span className="text-[clamp(7px,1.7vw,11px)] text-muted-foreground">
                      Scan untuk membuka profil publik
                    </span>
                  </div>
                  <div className="mt-[4%] flex items-center justify-center gap-2 text-center text-[clamp(8px,1.9vw,13px)]">
                    <ShieldCheck className="h-5 w-5 text-[#087443]" /> Kartu ini
                    adalah identitas resmi agen dan berlaku sesuai masa kerja
                    sama.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Portrait vertikal · siap cetak bolak-balik</span>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Buka halaman publik
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
