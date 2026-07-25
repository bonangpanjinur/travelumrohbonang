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

async function loadHeroImage(src: string, targetRatio: number): Promise<string> {
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

    // Crop the source like object-cover so portrait hero artwork stays readable.
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = Math.round(canvas.width / targetRatio);
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    let sx = 0;
    let sy = 0;
    let sw = image.naturalWidth;
    let sh = image.naturalHeight;
    if (sourceRatio > targetRatio) {
      sw = image.naturalHeight * targetRatio;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / targetRatio;
      sy = (image.naturalHeight - sh) / 2;
    }
    canvas.getContext("2d")?.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
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
  doc.text(d.packageTitle, 40, 105, { maxWidth: w - 80 });

  // Hero image from the package detail page.
  const heroX = 40;
  const heroY = 122;
  const heroW = w - 80;
  const heroH = 210;
  if (d.packageImage) {
    try {
      const heroDataUrl = await loadHeroImage(d.packageImage, heroW / heroH);
      doc.addImage(heroDataUrl, "JPEG", heroX, heroY, heroW, heroH, undefined, "FAST");
    } catch {
      // Keep the brochure downloadable even when a remote image blocks CORS.
      doc.setFillColor(245, 240, 232);
      doc.roundedRect(heroX, heroY, heroW, heroH, 8, 8, "F");
      doc.setTextColor(120, 20, 20);
      doc.setFontSize(12);
      doc.text("Gambar paket tersedia di halaman detail", w / 2, heroY + heroH / 2, { align: "center" });
    }
  }

  // Price strip
  doc.setFillColor(245, 230, 200);
  doc.rect(40, 345, w - 80, 50, "F");
  doc.setTextColor(80, 50, 0);
  doc.setFontSize(11);
  doc.text("Mulai dari", 56, 365);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(`Rp ${d.startPrice.toLocaleString("id-ID")}`, 56, 385);

  // Details
  let y = 425;
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
