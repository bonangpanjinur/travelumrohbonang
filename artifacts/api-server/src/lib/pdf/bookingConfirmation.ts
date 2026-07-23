/**
 * Server-side PDF generator for "Surat Konfirmasi Booking" (booking
 * confirmation letter). Built with @react-pdf/renderer using
 * React.createElement (no JSX) since this package has no JSX build step.
 *
 * F-06 · PDF Export (see docs/PRD.md).
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
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#7a1f2b",
    paddingBottom: 12,
    marginBottom: 20,
  },
  brand: { fontSize: 18, fontWeight: 700, color: "#7a1f2b" },
  tagline: { fontSize: 9, color: "#666", marginTop: 2 },
  docTitle: { fontSize: 8, color: "#666", textAlign: "right" },
  docCode: { fontSize: 12, fontWeight: 700, textAlign: "right", marginTop: 2 },
  title: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 20,
    textTransform: "uppercase",
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#7a1f2b",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5c78a",
    paddingBottom: 4,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 140, color: "#555" },
  value: { flex: 1, fontWeight: 700 },
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3e6c8",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  colNo: { width: 24 },
  colName: { flex: 1 },
  colGender: { width: 60 },
  colNik: { width: 100 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#7a1f2b",
  },
  totalLabel: { fontSize: 12, fontWeight: 700 },
  totalValue: { fontSize: 14, fontWeight: 700, color: "#7a1f2b" },
  statusBadge: {
    fontSize: 9,
    fontWeight: 700,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
});

function formatIDR(n: number | string | null | undefined): string {
  const num = Number(n) || 0;
  return "Rp " + num.toLocaleString("id-ID");
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#999" },
  confirmed: { label: "Dikonfirmasi", color: "#0f7a3d" },
  processing: { label: "Diproses", color: "#0369a1" },
  paid: { label: "Lunas", color: "#0f7a3d" },
  completed: { label: "Selesai", color: "#0f7a3d" },
  cancelled: { label: "Dibatalkan", color: "#b91c1c" },
};

export interface BookingConfirmationData {
  bookingCode: string;
  status: string | null;
  createdAt: string | Date | null;
  totalPrice: number | string;
  currency: string;
  paymentScheme: string | null;
  packageTitle: string | null;
  departureDate: string | Date | null;
  returnDate: string | Date | null;
  branchName: string | null;
  pilgrims: { name: string; gender: string | null; nik: string | null }[];
  rooms: { roomType: string; quantity: number; subtotal: number | string }[];
  tenantName?: string;
  // FASE 4: hotel & airline dari departure
  hotelMakkah?: string | null;
  hotelMadinah?: string | null;
  airlineName?: string | null;
}

export async function generateBookingConfirmationPdf(
  data: BookingConfirmationData,
): Promise<Buffer> {
  const status = STATUS_LABELS[data.status ?? ""] ?? { label: data.status ?? "-", color: "#999" };

  const doc = React.createElement(
    Document,
    { title: `Konfirmasi Booking ${data.bookingCode}` },
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
          React.createElement(Text, { style: styles.brand }, data.tenantName ?? "UmrohPlus"),
          React.createElement(Text, { style: styles.tagline }, "Layanan Umrah & Haji Terpercaya"),
        ),
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.docTitle }, "SURAT KONFIRMASI BOOKING"),
          React.createElement(Text, { style: styles.docCode }, data.bookingCode),
        ),
      ),
      React.createElement(Text, { style: styles.title }, "Konfirmasi Booking Perjalanan"),
      // Booking info
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Informasi Booking"),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Kode Booking"),
          React.createElement(Text, { style: styles.value }, data.bookingCode),
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Tanggal Pemesanan"),
          React.createElement(Text, { style: styles.value }, formatDate(data.createdAt)),
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Paket"),
          React.createElement(Text, { style: styles.value }, data.packageTitle ?? "-"),
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Tanggal Keberangkatan"),
          React.createElement(Text, { style: styles.value }, formatDate(data.departureDate)),
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Tanggal Kepulangan"),
          React.createElement(Text, { style: styles.value }, formatDate(data.returnDate)),
        ),
        // FASE 4: hotel & airline dari departure
        data.hotelMakkah && React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Hotel Makkah"),
          React.createElement(Text, { style: styles.value }, data.hotelMakkah),
        ),
        data.hotelMadinah && React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Hotel Madinah"),
          React.createElement(Text, { style: styles.value }, data.hotelMadinah),
        ),
        data.airlineName && React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Maskapai"),
          React.createElement(Text, { style: styles.value }, data.airlineName),
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Cabang"),
          React.createElement(Text, { style: styles.value }, data.branchName ?? "Pusat"),
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Status Pembayaran"),
          React.createElement(
            Text,
            { style: [styles.statusBadge, { color: status.color, backgroundColor: status.color + "1a" }] },
            status.label,
          ),
        ),
      ),
      // Rooms
      data.rooms.length > 0 &&
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Rincian Kamar"),
          React.createElement(
            View,
            { style: styles.table },
            React.createElement(
              View,
              { style: styles.tableHeader },
              React.createElement(Text, { style: styles.colName }, "Tipe Kamar"),
              React.createElement(Text, { style: styles.colGender }, "Jumlah"),
              React.createElement(Text, { style: styles.colNik }, "Subtotal"),
            ),
            ...data.rooms.map((r, i) =>
              React.createElement(
                View,
                { key: i, style: styles.tableRow },
                React.createElement(Text, { style: styles.colName }, r.roomType),
                React.createElement(Text, { style: styles.colGender }, String(r.quantity)),
                React.createElement(Text, { style: styles.colNik }, formatIDR(r.subtotal)),
              ),
            ),
          ),
        ),
      // Pilgrims
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, `Data Jemaah (${data.pilgrims.length} orang)`),
        React.createElement(
          View,
          { style: styles.table },
          React.createElement(
            View,
            { style: styles.tableHeader },
            React.createElement(Text, { style: styles.colNo }, "No"),
            React.createElement(Text, { style: styles.colName }, "Nama"),
            React.createElement(Text, { style: styles.colGender }, "Gender"),
            React.createElement(Text, { style: styles.colNik }, "NIK"),
          ),
          ...data.pilgrims.map((p, i) =>
            React.createElement(
              View,
              { key: i, style: styles.tableRow },
              React.createElement(Text, { style: styles.colNo }, String(i + 1)),
              React.createElement(Text, { style: styles.colName }, p.name),
              React.createElement(
                Text,
                { style: styles.colGender },
                p.gender === "male" ? "Laki-laki" : p.gender === "female" ? "Perempuan" : "-",
              ),
              React.createElement(Text, { style: styles.colNik }, p.nik ?? "-"),
            ),
          ),
        ),
      ),
      // Total
      React.createElement(
        View,
        { style: styles.totalRow },
        React.createElement(Text, { style: styles.totalLabel }, "Total Harga"),
        React.createElement(Text, { style: styles.totalValue }, formatIDR(data.totalPrice)),
      ),
      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        `Dokumen ini digenerate otomatis oleh sistem pada ${formatDate(new Date())} dan sah tanpa tanda tangan basah.`,
      ),
    ),
  );

  return await renderToBuffer(doc as any);
}
