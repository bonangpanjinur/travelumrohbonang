import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
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
  const companyName = branding.company_name || defaultBranding.company_name;

  /*
   * Legacy coordinate-based PDF generator kept disabled for reference while
   * existing generated files are compared. Download and print must use the
   * preview capture below so there is only one visual source of truth.
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
  }; */

  /**
   * Capture the exact card that is rendered in the preview.
   *
   * Download and Print intentionally share this function. The old
   * implementation had separate coordinate-based PDF and HTML-print layouts,
   * which inevitably drifted away from the JSX preview.
   */
  const captureCards = async () => {
    if (!previewCardRef.current) {
      throw new Error("Preview ID card tidak ditemukan");
    }

    const originalSide = side;
    const waitForPreview = async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve()),
        ),
      );
      if (document.fonts?.ready) await document.fonts.ready;
      const images = Array.from(
        previewCardRef.current?.querySelectorAll("img") || [],
      );
      await Promise.all(
        images.map(
          (image) =>
            image.complete && image.naturalWidth > 0
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  image.onload = () => resolve();
                  image.onerror = () => resolve();
                }),
        ),
      );
    };

    const captureSide = async (target: "front" | "back") => {
      setSide(target);
      await waitForPreview();
      const element = previewCardRef.current;
      if (!element) throw new Error("Preview ID card tidak ditemukan");

      const rect = element.getBoundingClientRect();
      const exportElement = element.cloneNode(true) as HTMLDivElement;
      const sourceNodes = [
        element,
        ...Array.from(element.querySelectorAll("*")),
      ];
      const exportNodes = [
        exportElement,
        ...Array.from(exportElement.querySelectorAll("*")),
      ];
      const colorFallback = (property: string) =>
        property.includes("color")
          ? property === "background-color"
            ? "#f8faf9"
            : DARK_GREEN
          : property.includes("shadow")
            ? "none"
            : property.includes("image")
              ? "none"
              : "initial";

      // Inline computed styles so the export cannot be affected by the
      // dialog/container CSS after it is moved outside the preview.
      sourceNodes.forEach((sourceNode, index) => {
        const targetNode = exportNodes[index] as HTMLElement | undefined;
        if (!targetNode || !(sourceNode instanceof HTMLElement)) return;
        const computed = window.getComputedStyle(sourceNode);
        for (
          let propertyIndex = 0;
          propertyIndex < computed.length;
          propertyIndex += 1
        ) {
          const property = computed.item(propertyIndex);
          if (property.startsWith("--")) continue;
          let value = computed.getPropertyValue(property);
          if (value.includes("oklab") || value.includes("oklch")) {
            value = colorFallback(property);
          }
          targetNode.style.setProperty(property, value);
        }
        targetNode.removeAttribute("class");
      });

      // html2canvas does not always preserve the layout size of inline SVG
      // elements after a clone is moved outside the dialog. Convert each SVG
      // to a self-contained image while keeping its actual rendered bounds.
      const sourceSvgNodes = Array.from(element.querySelectorAll("svg"));
      const exportSvgNodes = Array.from(exportElement.querySelectorAll("svg"));
      sourceSvgNodes.forEach((sourceSvg, index) => {
        const targetSvg = exportSvgNodes[index];
        if (!targetSvg) return;
        const rect = sourceSvg.getBoundingClientRect();
        const svgClone = sourceSvg.cloneNode(true) as SVGElement;
        svgClone.removeAttribute("class");
        svgClone.removeAttribute("style");
        svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svgClone.setAttribute("width", String(Math.max(1, rect.width)));
        svgClone.setAttribute("height", String(Math.max(1, rect.height)));

        const image = document.createElement("img");
        image.alt = "";
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgClone.outerHTML)}`;
        const computed = window.getComputedStyle(sourceSvg);
        for (
          let propertyIndex = 0;
          propertyIndex < computed.length;
          propertyIndex += 1
        ) {
          const property = computed.item(propertyIndex);
          if (property.startsWith("--")) continue;
          let value = computed.getPropertyValue(property);
          if (value.includes("oklab") || value.includes("oklch")) {
            value = colorFallback(property);
          }
          image.style.setProperty(property, value);
        }
        image.style.width = `${Math.max(1, rect.width)}px`;
        image.style.height = `${Math.max(1, rect.height)}px`;
        targetSvg.replaceWith(image);
      });

      // Preserve the actual visible preview dimensions. In particular, do
      // not let the off-screen clone recalculate the aspect-ratio from a
      // different containing block.
      exportElement.style.position = "fixed";
      exportElement.style.left = "-100000px";
      exportElement.style.top = "0";
      exportElement.style.margin = "0";
      exportElement.style.width = `${rect.width}px`;
      exportElement.style.height = `${rect.height}px`;
      exportElement.style.maxWidth = "none";
      exportElement.style.aspectRatio = "auto";
      document.body.appendChild(exportElement);

      // Same-origin/data URLs are embedded before capture to avoid a
      // cross-origin image turning the canvas into a tainted canvas.
      await Promise.all(
        Array.from(exportElement.querySelectorAll("img")).map(
          async (image) => {
            if (!image.src || image.src.startsWith("data:")) return;
            try {
              const response = await fetch(image.src);
              if (!response.ok) return;
              const blob = await response.blob();
              image.src = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } catch {
              // html2canvas can still use a CORS-enabled source image.
            }
          },
        ),
      );
      await Promise.all(
        Array.from(exportElement.querySelectorAll("img")).map(
          (image) =>
            image.complete && image.naturalWidth > 0
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  image.onload = () => resolve();
                  image.onerror = () => resolve();
                }),
        ),
      );

      try {
        const canvas = await html2canvas(exportElement, {
          backgroundColor: "#f8faf9",
          scale: 3,
          useCORS: true,
          allowTaint: false,
          logging: false,
        });
        return canvas.toDataURL("image/png");
      } finally {
        exportElement.remove();
      }
    };

    try {
      const frontImage = await captureSide("front");
      const backImage = await captureSide("back");
      return { frontImage, backImage };
    } finally {
      setSide(originalSide);
    }
  };

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const { frontImage, backImage } = await captureCards();
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
      setGenerating(false);
    }
  };

  const printCards = async () => {
    // Open synchronously from the click handler so popup blockers do not
    // prevent the print flow while the preview images are being captured.
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      toast({
        title: "Tidak dapat membuka jendela cetak",
        description: "Izinkan popup untuk situs ini lalu coba lagi.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { frontImage, backImage } = await captureCards();
      const title = `ID Card Agen - ${agent.name.replace(/[<>]/g, "")}`;
      printWindow.document.write(`<!doctype html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              @page { size: ${CARD_WIDTH}mm ${CARD_HEIGHT}mm; margin: 0; }
              html, body { margin: 0; padding: 0; background: #fff; }
              .card {
                width: ${CARD_WIDTH}mm;
                height: ${CARD_HEIGHT}mm;
                page-break-after: always;
                overflow: hidden;
              }
              .card:last-child { page-break-after: auto; }
              img { display: block; width: 100%; height: 100%; }
            </style>
          </head>
          <body>
            <div class="card"><img src="${frontImage}" alt="Sisi depan ID card agen" /></div>
            <div class="card"><img src="${backImage}" alt="Sisi belakang ID card agen" /></div>
          </body>
        </html>`);
      printWindow.document.close();
      printWindow.focus();
      await Promise.all(
        Array.from(printWindow.document.images).map(
          (image) =>
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
    } catch (error) {
      console.error(error);
      printWindow.close();
      toast({
        title: "Kartu tidak dapat dicetak",
        description: "Pastikan gambar/logo dapat dimuat lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
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
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polygon points="0,0 45,0 0,18" fill={DARK_GREEN} />
                  <polygon points="34,0 100,0 100,5.28 0,12" fill={LIME} />
                  <polygon points="100,82 100,100 54,100" fill={DARK_GREEN} />
                  <polygon points="0,94.72 100,88 100,100 0,100" fill={LIME} />
                </svg>
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
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polygon points="0,0 42,0 0,16" fill={DARK_GREEN} />
                  <polygon points="100,84 100,100 58,100" fill={DARK_GREEN} />
                </svg>
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
