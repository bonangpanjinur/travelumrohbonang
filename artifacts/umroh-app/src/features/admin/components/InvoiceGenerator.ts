import { apiFetch } from "@/shared/lib/apiClient";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import QRCode from "qrcode";

export interface InvoiceTemplateSettings {
  templateKey?: string; paper?: string; orientation?: string; primaryColor?: string; accentColor?: string; fontFamily?: string; borderStyle?: string;
  showLogo?: boolean; showQr?: boolean; showCompanyAddress?: boolean; showCustomerPhone?: boolean; showRoomBreakdown?: boolean; showPilgrims?: boolean; showPaymentHistory?: boolean; showPaymentPolicy?: boolean; showPaymentSchedule?: boolean; footerText?: string;
}

export interface InvoiceData {
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  packageTitle: string;
  departureDate: string | null;
  totalPrice: number;
  createdAt: string;
  status: string;
  paymentPolicySnapshot: { rules?: { ruleCode: string; displayText?: string | null; value?: unknown }[] } | null;
  paymentScheduleSnapshot: { sequence: number; code: string; label: string; percentage: number | null; amount: number; dueDate: string | null; status: string }[];
  invoicePreferences?: { digital?: boolean; email?: boolean; whatsapp?: boolean; includePaymentPolicy?: boolean; includePaymentSchedule?: boolean; includePilgrims?: boolean } | null;
  pilgrims: { name: string; gender: string | null }[];
  rooms: { room_type: string; quantity: number; price: number; subtotal: number }[];
  payments: { payment_type: string | null; amount: number; status: string | null; paid_at: string | null }[];
  companyName: string;
  companyTagline: string;
  logoUrl: string;
  invoiceTemplate?: InvoiceTemplateSettings | null;
}

export const fetchInvoiceData = async (bookingId: string): Promise<InvoiceData | null> => {
  try {
    const [invoice, template] = await Promise.all([
      apiFetch<InvoiceData>(`/api/admin/bookings/${bookingId}/invoice-data`),
      apiFetch<{ data?: { value?: InvoiceTemplateSettings } }>("/api/admin/settings/invoice-template").catch(() => null),
    ]);
    return { ...invoice, invoiceTemplate: template?.data?.value ?? null };
  } catch (e) {
    console.error("[fetchInvoiceData]", e);
    return null;
  }
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  waiting_payment: "Menunggu Pembayaran",
  paid: "Lunas",
  confirmed: "Terkonfirmasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  pending: "Pending",
};

const roomLabel: Record<string, string> = {
  quad: "Quad (4 orang)",
  triple: "Triple (3 orang)",
  double: "Double (2 orang)",
  single: "Single (1 orang)",
};

export const generateInvoiceHTML = async (data: InvoiceData): Promise<string> => {
  const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const template = data.invoiceTemplate ?? {};
  const primaryColor = template.primaryColor || "#0d6b4e";
  const accentColor = template.accentColor || "#b88a2a";
  const fontFamily = template.fontFamily || "Segoe UI";
  const showLogo = template.showLogo !== false;
  const showQr = template.showQr !== false;
  const formatDate = (d: string | null) => {
    if (!d) return "-";
    try {
      return format(new Date(d), "d MMMM yyyy", { locale: localeId });
    } catch {
      return d;
    }
  };

  const totalPaid = data.payments
    .filter((p) => p.status === "paid" || p.status === null)
    .reduce((sum, p) => sum + p.amount, 0);
  const remaining = data.totalPrice - totalPaid;
  const policyRules = data.invoicePreferences?.includePaymentPolicy === false || template.showPaymentPolicy === false ? [] : data.paymentPolicySnapshot?.rules ?? [];
  const paymentSchedule = data.invoicePreferences?.includePaymentSchedule === false || template.showPaymentSchedule === false ? [] : data.paymentScheduleSnapshot;
  const pilgrims = data.invoicePreferences?.includePilgrims === false || template.showPilgrims === false ? [] : data.pilgrims;

  // Generate QR code for tracking
  const trackingUrl = `${window.location.origin}/track/${data.bookingCode}`;
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(trackingUrl, { width: 120, margin: 1, color: { dark: "#0d6b4e", light: "#ffffff" } });
  } catch {
    // QR code is optional — invoice still works without it
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.bookingCode}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: '${fontFamily}', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${primaryColor}; padding-bottom: 20px; margin-bottom: 30px; }
    .company h1 { font-size: 24px; color: ${primaryColor}; margin-bottom: 2px; }
    .company p { font-size: 12px; color: #666; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { font-size: 28px; color: ${primaryColor}; font-weight: 700; }
    .invoice-title p { font-size: 13px; color: #666; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 6px; }
    .status-paid,.status-confirmed,.status-completed { background: #dcfce7; color: #166534; }
    .status-waiting { background: #fef9c3; color: #854d0e; }
    .status-draft,.status-pending { background: #f3f4f6; color: #374151; }
    .status-cancelled { background: #fecaca; color: #991b1b; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
    .info-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
    .info-box p { font-size: 14px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: ${primaryColor}12; color: ${primaryColor}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 2px solid ${primaryColor}; }
    td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .summary { margin-left: auto; width: 280px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .summary-row.total { border-top: 2px solid ${accentColor}; padding-top: 10px; margin-top: 6px; font-weight: 700; font-size: 16px; color: ${primaryColor}; }
    .summary-row.remaining { color: #dc2626; font-weight: 600; }
    .section-title { font-size: 14px; font-weight: 700; color: #0d6b4e; margin-bottom: 12px; margin-top: 28px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-text { font-size: 11px; color: #999; }
    .qr-section { text-align: center; }
    .qr-section img { width: 100px; height: 100px; display: block; margin: 0 auto 4px; }
    .qr-section p { font-size: 9px; color: #999; }
    .logo-img { height: 40px; object-fit: contain; }
    @media print { body { padding: 20px; } @page { margin: 15mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      ${showLogo && data.logoUrl ? `<img src="${data.logoUrl}" class="logo-img" alt="${data.companyName}" />` : ""}
      <h1>${data.companyName}</h1>
      <p>${data.companyTagline}</p>
    </div>
    <div class="invoice-title">
      <h2>INVOICE</h2>
      <p>${data.bookingCode}</p>
      <p>${formatDate(data.createdAt)}</p>
      <span class="status-badge status-${data.status === "waiting_payment" ? "waiting" : data.status}">${statusLabel[data.status] || data.status}</span>
    </div>
  </div>

  ${template.showCompanyAddress === false ? "" : ""}
  <div class="info-grid">
    <div class="info-box">
      <h3>Ditagihkan Kepada</h3>
      <p><strong>${data.customerName}</strong><br/>${data.customerEmail}${template.showCustomerPhone !== false && data.customerPhone ? `<br/>${data.customerPhone}` : ""}</p>
    </div>
    <div class="info-box">
      <h3>Detail Perjalanan</h3>
      <p><strong>${data.packageTitle}</strong><br/>Keberangkatan: ${formatDate(data.departureDate)}</p>
    </div>
  </div>

  ${template.showRoomBreakdown !== false && data.rooms.length > 0 ? `
  <div class="section-title">Rincian Kamar</div>
  <table>
    <thead><tr><th>Tipe Kamar</th><th class="text-center">Jumlah</th><th class="text-right">Harga/Pax</th><th class="text-right">Subtotal</th></tr></thead>
    <tbody>
      ${data.rooms.map((r) => `<tr>
        <td>${roomLabel[r.room_type] || r.room_type}</td>
        <td class="text-center">${r.quantity}</td>
        <td class="text-right">${formatRp(r.price)}</td>
        <td class="text-right">${formatRp(r.subtotal)}</td>
      </tr>`).join("")}
    </tbody>
  </table>` : ""}

  ${pilgrims.length > 0 ? `
  <div class="section-title">Daftar Jemaah (${pilgrims.length} orang)</div>
  <table>
    <thead><tr><th>No</th><th>Nama</th><th>Jenis Kelamin</th></tr></thead>
    <tbody>
      ${pilgrims.map((p, i) => {
        const g = p.gender?.toLowerCase() ?? "";
        const gLabel = g === "l" || g === "male" || g === "laki-laki" ? "Laki-laki"
          : g === "p" || g === "female" || g === "perempuan" ? "Perempuan"
          : p.gender || "-";
        return `<tr><td>${i + 1}</td><td>${p.name}</td><td>${gLabel}</td></tr>`;
      }).join("")}
    </tbody>
  </table>` : ""}

  ${paymentSchedule.length > 0 || policyRules.length > 0 ? `
  <div class="section-title">Aturan Pembayaran</div>
  ${paymentSchedule.length > 0 ? `<table>
    <thead><tr><th>No</th><th>Tahap Pembayaran</th><th class="text-right">Nominal</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
    <tbody>
      ${paymentSchedule.map((item) => `<tr><td>${item.sequence}</td><td>${item.label}</td><td class="text-right">${formatRp(item.amount)}${item.percentage !== null ? ` (${item.percentage}%)` : ""}</td><td>${formatDate(item.dueDate)}</td><td>${item.status === "pending" ? "Belum dibayar" : item.status}</td></tr>`).join("")}
    </tbody>
  </table>` : ""}
  ${policyRules.length ? `<div style="font-size:12px;color:#666;margin-top:${paymentSchedule.length > 0 ? "-12px" : "0"};margin-bottom:18px"><strong>Ketentuan:</strong><ul style="margin:6px 0 0 18px">${policyRules.map((rule) => `<li>${rule.displayText || rule.ruleCode}</li>`).join("")}</ul></div>` : ""}
  ` : ""}

  ${template.showPaymentHistory !== false && data.payments.length > 0 ? `
  <div class="section-title">Riwayat Pembayaran</div>
  <table>
    <thead><tr><th>Tipe</th><th class="text-right">Jumlah</th><th>Tanggal Bayar</th></tr></thead>
    <tbody>
      ${data.payments.map((p) => {
        const tl = p.payment_type === "dp" ? "DP (Uang Muka)"
          : p.payment_type === "installment" ? "Cicilan"
          : p.payment_type === "balance" ? "Pelunasan"
          : p.payment_type === "full" ? "Pembayaran Penuh"
          : p.payment_type || "-";
        return `<tr><td>${tl}</td><td class="text-right">${formatRp(p.amount)}</td><td>${p.paid_at ? formatDate(p.paid_at) : "-"}</td></tr>`;
      }).join("")}
    </tbody>
  </table>` : ""}

  <div class="summary">
    <div class="summary-row"><span>Total Harga</span><span>${formatRp(data.totalPrice)}</span></div>
    <div class="summary-row"><span>Total Dibayar</span><span>${formatRp(totalPaid)}</span></div>
    ${remaining > 0 ? `<div class="summary-row remaining"><span>Sisa Pembayaran</span><span>${formatRp(remaining)}</span></div>` : ""}
    <div class="summary-row total"><span>GRAND TOTAL</span><span>${formatRp(data.totalPrice)}</span></div>
  </div>

  <div class="footer">
    <div class="footer-text">
      <p>${template.footerText || `Invoice ini dihasilkan secara otomatis oleh sistem ${data.companyName}.`}</p>
      <p>Terima kasih atas kepercayaan Anda.</p>
    </div>
    ${showQr && qrDataUrl ? `
    <div class="qr-section">
      <img src="${qrDataUrl}" alt="QR Tracking" />
      <p>Scan untuk cek status pembayaran</p>
    </div>` : ""}
  </div>
</body>
</html>`;
};

export const openInvoicePrintWindow = (html: string): void => {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
};
