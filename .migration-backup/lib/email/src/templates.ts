/**
 * The 5 required transactional templates (see docs/PRD.md — F-03).
 *
 * Each template is a plain function returning { subject, html } so the
 * package has no dependency on a JSX/React runtime — resend accepts raw
 * HTML directly, which keeps this package tiny and easy to unit test.
 */

const BRAND_COLOR = "#0f6e4f";

function layout(bodyHtml: string): string {
  return `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:${BRAND_COLOR};padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">UmrohPlus</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f0f2f1;font-size:12px;color:#6b7280;">
                Email ini terkait transaksi Anda di UmrohPlus dan dikirim otomatis.
                Jika Anda tidak melakukan transaksi ini, hubungi
                <a href="mailto:${process.env["EMAIL_FROM"] || "support@umrohplus.com"}">tim dukungan kami</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function formatIDR(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return String(amount);
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export interface BookingCreatedData {
  jamaahName: string;
  bookingCode: string;
  packageName: string;
  totalAmount: number | string;
}
export function bookingCreatedTemplate(data: BookingCreatedData): { subject: string; html: string } {
  return {
    subject: `Konfirmasi Pemesanan #${data.bookingCode}`,
    html: layout(`
      <p>Assalamu'alaikum, ${escapeHtml(data.jamaahName)},</p>
      <p>Terima kasih, pemesanan Anda untuk paket <strong>${escapeHtml(data.packageName)}</strong> telah berhasil dibuat.</p>
      <table role="presentation" width="100%" style="margin:16px 0;font-size:14px;">
        <tr><td style="padding:4px 0;color:#6b7280;">Kode Booking</td><td style="padding:4px 0;text-align:right;font-weight:bold;">${escapeHtml(data.bookingCode)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Total Harga</td><td style="padding:4px 0;text-align:right;font-weight:bold;">${formatIDR(data.totalAmount)}</td></tr>
      </table>
      <p>Silakan lanjutkan pembayaran agar booking Anda dapat kami proses lebih lanjut.</p>
    `),
  };
}

export interface PaymentReceivedData {
  jamaahName: string;
  bookingCode: string;
  packageName: string;
  amountPaid: number | string;
}
export function paymentReceivedTemplate(data: PaymentReceivedData): { subject: string; html: string } {
  return {
    subject: `Pembayaran Diterima — ${data.packageName}`,
    html: layout(`
      <p>Assalamu'alaikum, ${escapeHtml(data.jamaahName)},</p>
      <p>Alhamdulillah, pembayaran Anda untuk booking <strong>${escapeHtml(data.bookingCode)}</strong> (paket ${escapeHtml(data.packageName)}) telah kami terima dan verifikasi.</p>
      <table role="presentation" width="100%" style="margin:16px 0;font-size:14px;">
        <tr><td style="padding:4px 0;color:#6b7280;">Jumlah Dibayarkan</td><td style="padding:4px 0;text-align:right;font-weight:bold;">${formatIDR(data.amountPaid)}</td></tr>
      </table>
      <p>Anda dapat memantau status booking Anda kapan saja melalui dashboard.</p>
    `),
  };
}

export interface InstallmentReminderData {
  jamaahName: string;
  bookingCode: string;
  installmentNumber: number;
  amountDue: number | string;
  dueDate: string;
}
export function installmentReminderTemplate(data: InstallmentReminderData): { subject: string; html: string } {
  return {
    subject: `Pengingat Cicilan ke-${data.installmentNumber} Jatuh Tempo`,
    html: layout(`
      <p>Assalamu'alaikum, ${escapeHtml(data.jamaahName)},</p>
      <p>Ini pengingat bahwa cicilan ke-<strong>${data.installmentNumber}</strong> untuk booking <strong>${escapeHtml(data.bookingCode)}</strong> akan jatuh tempo pada <strong>${escapeHtml(data.dueDate)}</strong>.</p>
      <table role="presentation" width="100%" style="margin:16px 0;font-size:14px;">
        <tr><td style="padding:4px 0;color:#6b7280;">Jumlah Cicilan</td><td style="padding:4px 0;text-align:right;font-weight:bold;">${formatIDR(data.amountDue)}</td></tr>
      </table>
      <p>Harap segera melakukan pembayaran untuk menjaga status booking Anda.</p>
    `),
  };
}

export interface DepartureReminderData {
  jamaahName: string;
  bookingCode: string;
  packageName: string;
  departureDate: string;
}
export function departureReminderTemplate(data: DepartureReminderData): { subject: string; html: string } {
  return {
    subject: `Persiapan Keberangkatan ${data.departureDate}`,
    html: layout(`
      <p>Assalamu'alaikum, ${escapeHtml(data.jamaahName)},</p>
      <p>InsyaAllah keberangkatan Anda untuk paket <strong>${escapeHtml(data.packageName)}</strong> (booking ${escapeHtml(data.bookingCode)}) akan berlangsung pada <strong>${escapeHtml(data.departureDate)}</strong>.</p>
      <p>Pastikan seluruh dokumen dan persiapan Anda sudah lengkap sebelum tanggal keberangkatan.</p>
    `),
  };
}

export interface DocumentsCompleteData {
  jamaahName: string;
  bookingCode: string;
}
export function documentsCompleteTemplate(data: DocumentsCompleteData): { subject: string; html: string } {
  return {
    subject: "Dokumen Anda Lengkap ✓",
    html: layout(`
      <p>Assalamu'alaikum, ${escapeHtml(data.jamaahName)},</p>
      <p>Seluruh dokumen Anda untuk booking <strong>${escapeHtml(data.bookingCode)}</strong> telah diverifikasi lengkap oleh tim kami.</p>
      <p>Tidak ada tindakan lebih lanjut yang diperlukan dari sisi dokumen. Sampai jumpa di keberangkatan!</p>
    `),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
