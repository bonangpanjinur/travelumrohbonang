/**
 * Server-side PDF generator for "Manifest Jamaah per Keberangkatan"
 * (departure manifest): table of pilgrims with photo box + QR code.
 *
 * F-06 · PDF Export (see docs/PRD.md).
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import QRCode from "qrcode";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#7a1f2b",
    paddingBottom: 10,
    marginBottom: 14,
  },
  brand: { fontSize: 16, fontWeight: 700, color: "#7a1f2b" },
  tagline: { fontSize: 8, color: "#666", marginTop: 2 },
  docTitle: { fontSize: 8, color: "#666", textAlign: "right" },
  docCode: { fontSize: 11, fontWeight: 700, textAlign: "right", marginTop: 2 },
  title: { fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 4, textTransform: "uppercase" },
  subtitle: { fontSize: 9, color: "#666", textAlign: "center", marginBottom: 14 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  metaBox: { fontSize: 8, color: "#555" },
  metaValue: { fontWeight: 700, color: "#1a1a1a" },
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3e6c8",
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    minHeight: 40,
  },
  colNo: { width: 20 },
  colPhoto: { width: 34 },
  colName: { flex: 1.6 },
  colGender: { width: 55 },
  colNik: { width: 85 },
  colPassport: { width: 75 },
  colRoom: { width: 45 },
  colQr: { width: 34, alignItems: "center" },
  photoBox: {
    width: 26,
    height: 32,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f5f5f5",
  },
  qrImg: { width: 28, height: 28 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  legend: { fontSize: 7, color: "#999", marginTop: 10 },
});

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export interface ManifestPilgrimRow {
  id: string;
  bookingCode: string;
  name: string;
  gender: string | null;
  nik: string | null;
  passportNumber: string | null;
  roomType: string | null;
  photoUrl: string | null;
}

export interface ManifestData {
  packageTitle: string | null;
  departureDate: string | Date | null;
  returnDate: string | Date | null;
  quota: number;
  remainingQuota: number;
  pilgrims: ManifestPilgrimRow[];
  tenantName?: string;
}

/** Fetches a photo URL and returns a data URI, or null if unreachable. */
async function tryFetchImageDataUri(url: string | null): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function generateManifestPdf(data: ManifestData): Promise<Buffer> {
  // Pre-generate QR codes + resolve photos (best-effort) for every pilgrim in parallel.
  const rowsWithAssets = await Promise.all(
    data.pilgrims.map(async (p) => {
      const qrDataUrl = await QRCode.toDataURL(
        JSON.stringify({ bookingCode: p.bookingCode, pilgrimId: p.id, name: p.name }),
        { margin: 0, width: 96 },
      );
      const photoDataUri = await tryFetchImageDataUri(p.photoUrl);
      return { ...p, qrDataUrl, photoDataUri };
    }),
  );

  const doc = React.createElement(
    Document,
    { title: `Manifest ${data.packageTitle ?? ""}` },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.brand }, data.tenantName ?? "UmrohPlus"),
          React.createElement(Text, { style: styles.tagline }, "Layanan Umrah & Haji Terpercaya"),
        ),
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.docTitle }, "MANIFEST JEMAAH"),
          React.createElement(Text, { style: styles.docCode }, formatDate(data.departureDate)),
        ),
      ),
      React.createElement(Text, { style: styles.title }, "Manifest Jemaah Keberangkatan"),
      React.createElement(Text, { style: styles.subtitle }, data.packageTitle ?? "-"),
      React.createElement(
        View,
        { style: styles.metaRow },
        React.createElement(
          Text,
          { style: styles.metaBox },
          "Tanggal Berangkat: ",
          React.createElement(Text, { style: styles.metaValue }, formatDate(data.departureDate)),
        ),
        React.createElement(
          Text,
          { style: styles.metaBox },
          "Tanggal Kembali: ",
          React.createElement(Text, { style: styles.metaValue }, formatDate(data.returnDate)),
        ),
        React.createElement(
          Text,
          { style: styles.metaBox },
          "Kuota: ",
          React.createElement(Text, { style: styles.metaValue }, `${data.quota - data.remainingQuota}/${data.quota}`),
        ),
        React.createElement(
          Text,
          { style: styles.metaBox },
          "Total Jemaah: ",
          React.createElement(Text, { style: styles.metaValue }, String(data.pilgrims.length)),
        ),
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: styles.colNo }, "No"),
          React.createElement(Text, { style: styles.colPhoto }, "Foto"),
          React.createElement(Text, { style: styles.colName }, "Nama"),
          React.createElement(Text, { style: styles.colGender }, "Gender"),
          React.createElement(Text, { style: styles.colNik }, "NIK"),
          React.createElement(Text, { style: styles.colPassport }, "Paspor"),
          React.createElement(Text, { style: styles.colRoom }, "Kamar"),
          React.createElement(Text, { style: styles.colQr }, "QR"),
        ),
        ...rowsWithAssets.map((p, i) =>
          React.createElement(
            View,
            { key: p.id, style: styles.tableRow },
            React.createElement(Text, { style: styles.colNo }, String(i + 1)),
            React.createElement(
              View,
              { style: styles.colPhoto },
              p.photoDataUri
                ? React.createElement(Image, { style: styles.photoBox, src: p.photoDataUri })
                : React.createElement(View, { style: styles.photoBox }),
            ),
            React.createElement(Text, { style: styles.colName }, p.name),
            React.createElement(
              Text,
              { style: styles.colGender },
              p.gender === "male" ? "Laki-laki" : p.gender === "female" ? "Perempuan" : "-",
            ),
            React.createElement(Text, { style: styles.colNik }, p.nik ?? "-"),
            React.createElement(Text, { style: styles.colPassport }, p.passportNumber ?? "-"),
            React.createElement(Text, { style: styles.colRoom }, p.roomType ?? "-"),
            React.createElement(
              View,
              { style: styles.colQr },
              React.createElement(Image, { style: styles.qrImg, src: p.qrDataUrl }),
            ),
          ),
        ),
      ),
      React.createElement(
        Text,
        { style: styles.legend },
        "QR code berisi kode booking, ID jemaah, dan nama — dapat dipindai untuk verifikasi check-in.",
      ),
      React.createElement(
        Text,
        { style: styles.footer },
        `Dokumen ini digenerate otomatis oleh sistem pada ${formatDate(new Date())}.`,
      ),
    ),
  );

  return await renderToBuffer(doc as any);
}
