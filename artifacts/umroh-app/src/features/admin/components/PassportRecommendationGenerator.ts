/**
 * Frontend HTML generator for "Surat Rekomendasi Pembuatan Paspor".
 * Matches the invoice visual style: logo, company name, QR code.
 */
import { apiFetch } from "@/shared/lib/apiClient";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import QRCode from "qrcode";

export interface PassportRecommendationData {
  bookingCode: string;
  packageTitle: string | null;
  departureDate: string | null;
  companyName: string;
  companyTagline: string;
  logoUrl: string;
  pilgrims: {
    name: string;
    nik: string | null;
    birthDate: string | null;
    gender: string | null;
  }[];
}

export const fetchPassportRecommendationData = async (
  bookingId: string,
): Promise<PassportRecommendationData | null> => {
  try {
    return await apiFetch<PassportRecommendationData>(
      `/api/admin/bookings/${bookingId}/passport-recommendation-data`,
    );
  } catch (e) {
    console.error("[fetchPassportRecommendationData]", e);
    return null;
  }
};

const fmt = (d: string | null) => {
  if (!d) return "-";
  try {
    return format(new Date(d), "d MMMM yyyy", { locale: localeId });
  } catch {
    return d;
  }
};

const genderLabel = (g: string | null) => {
  const v = (g ?? "").toLowerCase();
  if (v === "male" || v === "l" || v === "laki-laki") return "Laki-laki";
  if (v === "female" || v === "p" || v === "perempuan") return "Perempuan";
  return g || "-";
};

export const generatePassportRecommendationHTML = async (
  data: PassportRecommendationData,
): Promise<string> => {
  const today = fmt(new Date().toISOString());

  const trackingUrl = `${window.location.origin}/track/${data.bookingCode}`;
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(trackingUrl, {
      width: 120,
      margin: 1,
      color: { dark: "#0d6b4e", light: "#ffffff" },
    });
  } catch {
    /* QR code is optional */
  }

  const pilgrimRows = data.pilgrims
    .map(
      (p, i) => `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${p.name}</td>
        <td>${p.nik ?? "-"}</td>
        <td>${fmt(p.birthDate)}</td>
        <td>${genderLabel(p.gender)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Surat Rekomendasi Paspor - ${data.bookingCode}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; font-size: 13px; line-height: 1.6; }

    /* ── Header ── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0d6b4e; padding-bottom: 20px; margin-bottom: 28px; }
    .company { display: flex; flex-direction: column; gap: 4px; }
    .company .logo-img { height: 40px; object-fit: contain; margin-bottom: 4px; }
    .company h1 { font-size: 22px; color: #0d6b4e; font-weight: 700; }
    .company p { font-size: 12px; color: #666; }
    .doc-meta { text-align: right; }
    .doc-meta h2 { font-size: 26px; color: #0d6b4e; font-weight: 700; letter-spacing: 1px; }
    .doc-meta .booking-code { font-size: 13px; color: #444; margin-top: 4px; }
    .doc-meta .doc-date { font-size: 12px; color: #666; margin-top: 2px; }

    /* ── Body ── */
    .recipient { margin-bottom: 20px; }
    .recipient p { margin-bottom: 2px; }

    .intro { margin-bottom: 20px; }

    /* ── Table ── */
    .section-title { font-size: 13px; font-weight: 700; color: #0d6b4e; margin-bottom: 10px; margin-top: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f0fdf4; color: #0d6b4e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; border-bottom: 2px solid #0d6b4e; }
    td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #e5e7eb; }
    .text-center { text-align: center; }

    /* ── Closing & Signature ── */
    .closing { margin-top: 20px; margin-bottom: 40px; }
    .sig-block { display: flex; justify-content: flex-end; margin-top: 8px; }
    .sig-box { width: 220px; text-align: center; }
    .sig-box .city-date { font-size: 12px; margin-bottom: 4px; }
    .sig-box .sig-line { margin-top: 60px; border-top: 1px solid #444; padding-top: 4px; font-weight: 700; font-size: 13px; }
    .sig-box .sig-title { font-size: 11px; color: #555; }

    /* ── Footer ── */
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-text { font-size: 11px; color: #999; }
    .qr-section { text-align: center; }
    .qr-section img { width: 100px; height: 100px; display: block; margin: 0 auto 4px; }
    .qr-section p { font-size: 9px; color: #999; }

    @media print { body { padding: 20px; } @page { margin: 15mm; } }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="company">
      ${data.logoUrl ? `<img src="${data.logoUrl}" class="logo-img" alt="${data.companyName}" crossorigin="anonymous" />` : ""}
      <h1>${data.companyName}</h1>
      <p>${data.companyTagline}</p>
    </div>
    <div class="doc-meta">
      <h2>SURAT REKOMENDASI</h2>
      <p class="booking-code">${data.bookingCode}</p>
      <p class="doc-date">${today}</p>
    </div>
  </div>

  <!-- Recipient -->
  <div class="recipient">
    <p>Kepada Yth.</p>
    <p><strong>Kepala Kantor Imigrasi</strong></p>
    <p>Di Tempat</p>
  </div>

  <!-- Intro -->
  <div class="intro">
    <p>Dengan hormat,</p>
    <br/>
    <p>
      Yang bertanda tangan di bawah ini, pimpinan <strong>${data.companyName}</strong>,
      sebuah biro perjalanan umrah yang terdaftar dan berizin resmi, dengan ini menerangkan
      dan merekomendasikan bahwa nama-nama berikut akan melaksanakan Ibadah Umroh melalui
      biro kami:
    </p>
    <br/>
    <p><strong>Paket:</strong> ${data.packageTitle ?? "-"}</p>
    <p><strong>Keberangkatan:</strong> ${fmt(data.departureDate)}</p>
    <p><strong>Kode Booking:</strong> ${data.bookingCode}</p>
  </div>

  <!-- Pilgrim table -->
  <div class="section-title">Data Calon Jemaah (${data.pilgrims.length} orang)</div>
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width:36px">No</th>
        <th>Nama Lengkap</th>
        <th>NIK</th>
        <th>Tanggal Lahir</th>
        <th>Jenis Kelamin</th>
      </tr>
    </thead>
    <tbody>${pilgrimRows}</tbody>
  </table>

  <!-- Closing -->
  <div class="closing">
    <p>
      Sehubungan dengan hal tersebut, kami sangat mengharapkan kiranya Bapak/Ibu Kepala
      Kantor Imigrasi berkenan membantu dan mempermudah proses pembuatan paspor bagi
      nama-nama tersebut di atas, demi kelancaran pelaksanaan Ibadah Umroh.
    </p>
    <br/>
    <p>
      Demikian surat rekomendasi ini kami buat dengan sebenar-benarnya. Atas perhatian
      dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.
    </p>
  </div>

  <!-- Signature -->
  <div class="sig-block">
    <div class="sig-box">
      <p class="city-date">Hormat kami,</p>
      <div class="sig-line">${data.companyName}</div>
      <div class="sig-title">Pimpinan</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-text">
      <p>Dokumen ini dihasilkan secara otomatis oleh sistem ${data.companyName}.</p>
      <p>Sah sebagai surat rekomendasi resmi.</p>
    </div>
    ${
      qrDataUrl
        ? `<div class="qr-section">
      <img src="${qrDataUrl}" alt="QR Booking" />
      <p>Scan untuk cek status booking</p>
    </div>`
        : ""
    }
  </div>

</body>
</html>`;
};

export const openPassportRecommendationPrintWindow = (html: string): void => {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
};
