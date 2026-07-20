/**
 * WhatsApp message templates for UmrohPlus transactional notifications (F-04).
 * Plain functions returning formatted strings — no external dependencies.
 */

function formatIDR(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return String(amount);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function bookingCreatedWA(data: {
  jamaahName: string;
  bookingCode: string;
  packageName: string;
  totalAmount: number | string;
}): string {
  return `Assalamu'alaikum *${data.jamaahName}* 👋

Alhamdulillah, *pemesanan Anda berhasil dibuat!*

📋 *Detail Booking:*
• Kode: *${data.bookingCode}*
• Paket: ${data.packageName}
• Total: *${formatIDR(data.totalAmount)}*

Silakan segera lakukan pembayaran agar booking Anda dapat kami proses.

Terima kasih telah memilih UmrohPlus. Semoga menjadi umroh yang mabrur 🕌`;
}

export function paymentReceivedWA(data: {
  jamaahName: string;
  bookingCode: string;
  packageName: string;
  amountPaid: number | string;
}): string {
  return `Assalamu'alaikum *${data.jamaahName}* 👋

✅ *Pembayaran Anda telah diterima!*

📋 *Detail:*
• Kode Booking: *${data.bookingCode}*
• Paket: ${data.packageName}
• Jumlah Dibayar: *${formatIDR(data.amountPaid)}*

Anda dapat memantau status booking kapan saja melalui dashboard UmrohPlus.

Terima kasih 🙏`;
}

export function documentsCompleteWA(data: {
  jamaahName: string;
  bookingCode: string;
}): string {
  return `Assalamu'alaikum *${data.jamaahName}* 👋

✅ *Seluruh dokumen Anda sudah lengkap!*

Kode Booking: *${data.bookingCode}*

Tidak ada lagi yang perlu dilakukan dari sisi dokumen. Tim kami akan menghubungi Anda untuk informasi keberangkatan.

Terima kasih 🙏`;
}

export function departureReminderWA(data: {
  jamaahName: string;
  bookingCode: string;
  packageName: string;
  departureDate: string;
}): string {
  return `Assalamu'alaikum *${data.jamaahName}* 👋

🕌 *Pengingat Keberangkatan — H-14*

InsyaAllah keberangkatan Anda untuk paket *${data.packageName}* akan berlangsung pada *${data.departureDate}*.

Kode Booking: *${data.bookingCode}*

Pastikan seluruh dokumen dan persiapan sudah lengkap sebelum tanggal keberangkatan.

Semoga menjadi umroh yang mabrur 🤲`;
}

export function paymentDeadlineAlertWA(data: {
  jamaahName: string;
  bookingCode: string;
  packageName: string;
  outstanding: number | string;
  departureDate: string;
  daysLeft: number;
}): string {
  const urgencyIcon =
    data.daysLeft <= 7 ? "🔴" : data.daysLeft <= 14 ? "🟠" : "🟡";
  return `Assalamu'alaikum *${data.jamaahName}* 👋

${urgencyIcon} *Pengingat Pelunasan — H-${data.daysLeft}*

Anda masih memiliki sisa pembayaran untuk paket umroh Anda.

📋 *Detail:*
• Kode Booking: *${data.bookingCode}*
• Paket: ${data.packageName}
• Sisa Pembayaran: *${formatIDR(data.outstanding)}*
• Tanggal Berangkat: *${data.departureDate}*

⏳ Hanya tersisa *${data.daysLeft} hari* lagi. Segera lunasi agar keberangkatan Anda tidak terhambat.

Terima kasih 🙏`;
}

export function paymentDeadlineAdminSummaryWA(data: {
  criticalCount: number;
  totalOutstanding: number | string;
  departures: Array<{ packageTitle: string; departureDate: string; outstanding: number; count: number }>;
}): string {
  const lines = data.departures
    .map(
      (d) =>
        `• ${d.packageTitle} (${d.departureDate}): ${d.count} jemaah, sisa ${formatIDR(d.outstanding)}`
    )
    .join("\n");
  return `🔴 *Alert Admin — Pelunasan Kritis*

Ada *${data.criticalCount}* booking yang belum lunas menjelang keberangkatan (≤ H-7).

Total outstanding: *${formatIDR(data.totalOutstanding)}*

Keberangkatan kritis:
${lines}

Segera follow-up jemaah terkait.`;
}

export function installmentReminderWA(data: {
  jamaahName: string;
  bookingCode: string;
  packageName: string;
  installmentNumber: number;
  amountDue: number | string;
  dueDate: string;
}): string {
  return `Assalamu'alaikum *${data.jamaahName}* 👋

⚠️ *Pengingat Cicilan — H-7*

Cicilan ke-*${data.installmentNumber}* untuk paket *${data.packageName}* akan jatuh tempo dalam 7 hari.

📋 *Detail:*
• Kode Booking: *${data.bookingCode}*
• Cicilan ke: *${data.installmentNumber}*
• Jumlah: *${formatIDR(data.amountDue)}*
• Jatuh Tempo: *${data.dueDate}*

Silakan lakukan pembayaran sebelum tanggal jatuh tempo agar jadwal perjalanan Anda tidak terganggu.

Terima kasih 🙏`;
}
