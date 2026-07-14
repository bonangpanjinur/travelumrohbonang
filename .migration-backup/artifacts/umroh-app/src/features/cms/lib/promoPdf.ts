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
  agentName: string;
  referralCode: string;
  referralUrl: string;
  brandName: string;
  brandPhone?: string;
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
  doc.text("Materi Promosi Agen", w - 40, 45, { align: "right" });

  // Title
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(d.packageTitle, 40, 110, { maxWidth: w - 80 });

  // Price strip
  doc.setFillColor(245, 230, 200);
  doc.rect(40, 130, w - 80, 50, "F");
  doc.setTextColor(80, 50, 0);
  doc.setFontSize(11);
  doc.text("Mulai dari", 56, 150);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(`Rp ${d.startPrice.toLocaleString("id-ID")}`, 56, 170);

  // Details
  let y = 210;
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

  // Footer block with QR
  const qrDataUrl = await QRCode.toDataURL(d.referralUrl, { width: 200, margin: 0 });
  const qrSize = 110;
  const qrX = w - qrSize - 40;
  const qrY = h - qrSize - 100;
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(120, 20, 20);
  doc.text("Agen:", 40, qrY + 20);
  doc.setTextColor(40, 40, 40);
  doc.text(d.agentName, 40, qrY + 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Kode Referral: ${d.referralCode}`, 40, qrY + 56);
  doc.text("Scan QR di kanan untuk", 40, qrY + 80);
  doc.text("booking langsung →", 40, qrY + 95);
  if (d.brandPhone) doc.text(`Hubungi: ${d.brandPhone}`, 40, qrY + 115);

  doc.setFillColor(120, 20, 20);
  doc.rect(0, h - 28, w, 28, "F");
  doc.setTextColor(255, 215, 130);
  doc.setFontSize(9);
  doc.text(`${d.brandName} · ${d.referralUrl}`, w / 2, h - 10, { align: "center" });

  return doc.output("blob");
}
