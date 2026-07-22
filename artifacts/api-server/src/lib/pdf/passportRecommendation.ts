/**
 * Server-side PDF generator for "Surat Rekomendasi Pembuatan Paspor"
 * (Passport Application Recommendation Letter).
 * Built with @react-pdf/renderer using React.createElement (no JSX).
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#7a1f2b",
    paddingBottom: 12,
    marginBottom: 24,
  },
  brand: { fontSize: 18, fontWeight: 700, color: "#7a1f2b" },
  tagline: { fontSize: 9, color: "#666", marginTop: 2 },
  docTitle: { fontSize: 8, color: "#666", textAlign: "right" },
  docDate: { fontSize: 9, textAlign: "right", marginTop: 2, color: "#444" },
  title: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 6,
    textDecoration: "underline",
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 10,
    textAlign: "center",
    marginBottom: 20,
    color: "#555",
  },
  opening: { marginBottom: 14, lineHeight: 1.6 },
  bold: { fontWeight: 700 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#7a1f2b",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5c78a",
    paddingBottom: 4,
  },
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3e6c8",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  colNo:   { width: 24, fontSize: 9 },
  colName: { flex: 2, fontSize: 9 },
  colNik:  { flex: 2, fontSize: 9 },
  colBirth: { flex: 1.5, fontSize: 9 },
  colGender: { width: 65, fontSize: 9 },
  closing: { marginTop: 18, lineHeight: 1.7 },
  sigBlock: { marginTop: 60 },
  sigRow: { flexDirection: "row", justifyContent: "space-between" },
  sigBox: { width: 200 },
  sigLabel: { fontSize: 9, color: "#555" },
  sigCity: { fontSize: 10, marginBottom: 2 },
  sigName: { fontWeight: 700, fontSize: 10, marginTop: 50 },
  sigTitle: { fontSize: 9, color: "#555" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
});

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export interface PassportRecommendationData {
  bookingCode: string;
  packageTitle: string | null;
  departureDate: string | Date | null;
  pilgrims: {
    name: string;
    nik: string | null;
    birthDate: string | null;
    gender: string | null;
  }[];
  tenantName?: string;
  tenantAddress?: string;
  city?: string;
}

export async function generatePassportRecommendationPdf(
  data: PassportRecommendationData,
): Promise<Buffer> {
  const today = formatDate(new Date());
  const tenantName = data.tenantName ?? "UmrohPlus";
  const city = data.city ?? "Jakarta";

  const doc = React.createElement(
    Document,
    { title: `Surat Rekomendasi Paspor - ${data.bookingCode}` },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.brand }, tenantName),
          React.createElement(Text, { style: styles.tagline }, "Biro Perjalanan Umrah & Haji Terpercaya"),
        ),
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.docTitle }, "SURAT REKOMENDASI"),
          React.createElement(Text, { style: styles.docDate }, today),
        ),
      ),

      // Title
      React.createElement(Text, { style: styles.title }, "Surat Rekomendasi Pembuatan Paspor"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Untuk Keperluan Ibadah Umroh — Keberangkatan ${formatDate(data.departureDate)}`,
      ),

      // Opening
      React.createElement(
        View,
        { style: styles.opening },
        React.createElement(
          Text,
          null,
          "Kepada Yth.\n",
          "Kepala Kantor Imigrasi\n",
          "Di Tempat\n\n",
          "Dengan hormat,\n\n",
          "Yang bertanda tangan di bawah ini, pimpinan ",
          React.createElement(Text, { style: styles.bold }, tenantName),
          ", sebuah biro perjalanan umrah yang terdaftar dan berizin resmi, dengan ini ",
          "menerangkan dan merekomendasikan bahwa nama-nama berikut akan melaksanakan Ibadah Umroh ",
          "melalui biro kami:\n\n",
          "Kode Booking: ",
          React.createElement(Text, { style: styles.bold }, data.bookingCode),
          "\n",
          "Paket: ",
          React.createElement(Text, { style: styles.bold }, data.packageTitle ?? "-"),
          "\n",
          "Keberangkatan: ",
          React.createElement(Text, { style: styles.bold }, formatDate(data.departureDate)),
        ),
      ),

      // Pilgrim table
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, `Data Calon Jemaah (${data.pilgrims.length} orang)`),
        React.createElement(
          View,
          { style: styles.table },
          React.createElement(
            View,
            { style: styles.tableHeader },
            React.createElement(Text, { style: styles.colNo }, "No"),
            React.createElement(Text, { style: styles.colName }, "Nama Lengkap"),
            React.createElement(Text, { style: styles.colNik }, "NIK"),
            React.createElement(Text, { style: styles.colBirth }, "Tanggal Lahir"),
            React.createElement(Text, { style: styles.colGender }, "Jenis Kelamin"),
          ),
          ...data.pilgrims.map((p, i) =>
            React.createElement(
              View,
              { key: i, style: styles.tableRow },
              React.createElement(Text, { style: styles.colNo }, String(i + 1)),
              React.createElement(Text, { style: styles.colName }, p.name),
              React.createElement(Text, { style: styles.colNik }, p.nik ?? "-"),
              React.createElement(Text, { style: styles.colBirth }, formatDate(p.birthDate)),
              React.createElement(
                Text,
                { style: styles.colGender },
                p.gender === "male" ? "Laki-laki" : p.gender === "female" ? "Perempuan" : "-",
              ),
            ),
          ),
        ),
      ),

      // Closing
      React.createElement(
        View,
        { style: styles.closing },
        React.createElement(
          Text,
          null,
          "Sehubungan dengan hal tersebut, kami sangat mengharapkan kiranya Bapak/Ibu Kepala Kantor Imigrasi ",
          "berkenan membantu dan mempermudah proses pembuatan paspor bagi nama-nama tersebut di atas, ",
          "demi kelancaran pelaksanaan Ibadah Umroh.\n\n",
          "Demikian surat rekomendasi ini kami buat dengan sebenar-benarnya. Atas perhatian dan kerja sama ",
          "Bapak/Ibu, kami ucapkan terima kasih.",
        ),
      ),

      // Signature block
      React.createElement(
        View,
        { style: styles.sigBlock },
        React.createElement(
          View,
          { style: styles.sigRow },
          React.createElement(
            View,
            { style: styles.sigBox },
            React.createElement(Text, { style: styles.sigLabel }, " "),
          ),
          React.createElement(
            View,
            { style: styles.sigBox },
            React.createElement(
              Text,
              { style: styles.sigCity },
              `${city}, ${today}`,
            ),
            React.createElement(Text, { style: styles.sigLabel }, "Hormat kami,"),
            React.createElement(Text, { style: [styles.sigName, { marginTop: 55 }] }, tenantName),
            React.createElement(Text, { style: styles.sigTitle }, "Pimpinan"),
          ),
        ),
      ),

      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        `Dokumen ini digenerate otomatis oleh sistem pada ${today}. Sah sebagai surat rekomendasi resmi ${tenantName}.`,
      ),
    ),
  );

  return await renderToBuffer(doc as any);
}
