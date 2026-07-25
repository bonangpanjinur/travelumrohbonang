import jsPDF from "jspdf";
import QRCode from "qrcode";

interface PromoData {
  packageTitle: string;
  packageImage?: string;
  description?: string;
  startPrice: number;
  durationDays?: number;
  hotelMakkah?: string;
  hotelMadinah?: string;
  airline?: string;
  pageUrl: string;
  brandName: string;
  brandPhone?: string;
}

interface LoadedHeroImage {
  dataUrl: string;
  width: number;
  height: number;
}

async function loadHeroImage(src: string): Promise<LoadedHeroImage> {
  const response = await fetch(src, { mode: "cors" });
  if (!response.ok) throw new Error(`Hero image request failed (${response.status})`);

  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Hero image could not be decoded"));
      element.src = objectUrl;
    });

    // Re-encode the source for jsPDF while preserving its original dimensions.
    // Do not crop or stretch the package artwork: the database image is the
    // source of truth for the brochure's visual.
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Hero image canvas is unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function generatePromoPdf(d: PromoData): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Header bar
  doc.setFillColor(120, 20, 20);
  doc.rect(0, 0, w, 70, "F");
  doc.setTextColor(255, 215, 130);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(d.brandName, 40, 45);
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Brosur Paket Umroh", w - 40, 45, { align: "right" });

  // Package title
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(d.packageTitle, w - 80);
  doc.text(titleLines, 40, 105);

  // Hero image from the package detail page.
  const heroY = 122 + Math.max(0, titleLines.length - 1) * 26;
  const maxHeroW = w - 80;
  // Leave enough room for wide brochure artwork to fill the page width while
  // still preventing unusually tall database images from pushing every detail
  // section off the A4 page.
  const maxHeroH = 340;
  let heroX = 40;
  let heroW = maxHeroW;
  let heroH = maxHeroH;
  if (d.packageImage) {
    try {
      const hero = await loadHeroImage(d.packageImage);
      const scale = Math.min(maxHeroW / hero.width, maxHeroH / hero.height);
      heroW = hero.width * scale;
      heroH = hero.height * scale;
      heroX = (w - heroW) / 2;
      doc.addImage(hero.dataUrl, "JPEG", heroX, heroY, heroW, heroH, undefined, "FAST");
    } catch {
      // Keep the brochure downloadable even when a remote image blocks CORS.
      doc.setFillColor(245, 240, 232);
      doc.roundedRect(40, heroY, maxHeroW, maxHeroH, 8, 8, "F");
      doc.setTextColor(120, 20, 20);
      doc.setFontSize(12);
      doc.text("Gambar paket tersedia di halaman detail", w / 2, heroY + maxHeroH / 2, { align: "center" });
      heroX = 40;
      heroW = maxHeroW;
      heroH = maxHeroH;
    }
  } else {
    heroH = 0;
  }

  // Price strip
  const priceY = heroY + heroH + 18;
  doc.setFillColor(245, 230, 200);
  doc.rect(40, priceY, w - 80, 50, "F");
  doc.setTextColor(80, 50, 0);
  doc.setFontSize(11);
  doc.text("Mulai dari", 56, priceY + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(`Rp ${d.startPrice.toLocaleString("id-ID")}`, 56, priceY + 40);

  // Details
  let y = priceY + 80;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text("Detail Paket", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines: string[] = [];
  if (d.durationDays) lines.push(`• Durasi: ${d.durationDays} hari`);
  if (d.hotelMakkah) lines.push(`• Hotel Makkah: ${d.hotelMakkah}`);
  if (d.hotelMadinah) lines.push(`• Hotel Madinah: ${d.hotelMadinah}`);
  if (d.airline) lines.push(`• Maskapai: ${d.airline}`);
  lines.forEach((line) => { doc.text(line, 40, y); y += 16; });

  if (d.description) {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Deskripsi", 40, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    const split = doc.splitTextToSize(d.description, w - 80);
    doc.text(split, 40, y);
    y += split.length * 14;
  }

  // Footer block with QR linking back to this package.
  const qrDataUrl = await QRCode.toDataURL(d.pageUrl, { width: 200, margin: 0 });
  const qrSize = 110;
  const qrX = w - qrSize - 40;
  const qrY = h - qrSize - 100;
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(120, 20, 20);
  doc.text("Lihat detail paket:", 40, qrY + 20);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Scan QR untuk melihat jadwal", 40, qrY + 40);
  doc.text("dan melakukan booking.", 40, qrY + 55);
  doc.setFont("helvetica", "normal");
  if (d.brandPhone) doc.text(`Hubungi: ${d.brandPhone}`, 40, qrY + 75);

  doc.setFillColor(120, 20, 20);
  doc.rect(0, h - 28, w, 28, "F");
  doc.setTextColor(255, 215, 130);
  doc.setFontSize(9);
  doc.text(`${d.brandName} · ${d.pageUrl}`, w / 2, h - 10, { align: "center" });

  return doc.output("blob");
}
