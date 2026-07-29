/**
 * C6: PDF Export — Laporan Keuangan
 * Uses @react-pdf/renderer (already installed + confirmed working in this project).
 *
 * Exports:
 *   generateIncomeStatementPdf(data) → Promise<Buffer>
 *   generateBalanceSheetPdf(data)    → Promise<Buffer>
 *   generateCashFlowPdf(data)        → Promise<Buffer>
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

// ── Shared styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 20,
    borderBottom: "1.5pt solid #2563eb",
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    marginBottom: 2,
  },
  reportTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 8,
    color: "#6b7280",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    padding: 4,
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #e5e7eb",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRowEven: {
    backgroundColor: "#f9fafb",
  },
  tableRowHeader: {
    flexDirection: "row",
    borderBottom: "1pt solid #6b7280",
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: "#f3f4f6",
  },
  tableRowTotal: {
    flexDirection: "row",
    borderTop: "1pt solid #6b7280",
    borderBottom: "1pt solid #6b7280",
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: "#eff6ff",
    marginTop: 2,
  },
  cellLeft: {
    flex: 2,
    fontSize: 8,
  },
  cellRight: {
    flex: 1,
    fontSize: 8,
    textAlign: "right",
  },
  cellCode: {
    flex: 0.8,
    fontSize: 7,
    color: "#6b7280",
  },
  cellBold: {
    fontFamily: "Helvetica-Bold",
  },
  netBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#1d4ed8",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  netValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#9ca3af",
    borderTop: "0.5pt solid #e5e7eb",
    paddingTop: 4,
  },
  generatedAt: {
    fontSize: 7,
    color: "#9ca3af",
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryCard: {
    flex: 1,
    margin: 3,
    padding: 8,
    backgroundColor: "#f8fafc",
    border: "0.5pt solid #e2e8f0",
  },
  summaryLabel: {
    fontSize: 7,
    color: "#64748b",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtIDR(n: number): string {
  const abs = Math.abs(Math.round(n));
  const formatted = abs.toLocaleString("id-ID");
  return `${n < 0 ? "-" : ""}Rp ${formatted}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function Footer({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>UmrohPlus — Vins Tour Travel</Text>
      <Text>Digenerate: {generatedAt}</Text>
    </View>
  );
}

// ── Income Statement PDF ──────────────────────────────────────────────────────

export interface IncomeStatementData {
  period: { from: string | null; to: string | null };
  revenue: { items: Array<{ accountName: string; accountCode: string; total: number }>; total: number };
  expense: { items: Array<{ accountName: string; accountCode: string; total: number }>; total: number };
  grossProfit: number;
  netIncome: number;
}

const IncomeStatementPdf = ({ data, generatedAt }: { data: IncomeStatementData; generatedAt: string }) => (
  <Document title="Laporan Laba/Rugi" author="UmrohPlus">
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>UmrohPlus — Vins Tour Travel</Text>
        <Text style={styles.reportTitle}>LAPORAN LABA / RUGI (Income Statement)</Text>
        <Text style={styles.reportSubtitle}>
          Periode: {data.period.from ?? "Awal"} s/d {data.period.to ?? "Sekarang"}
        </Text>
        <Text style={styles.generatedAt}>Digenerate: {generatedAt}</Text>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Pendapatan</Text>
          <Text style={[styles.summaryValue, { color: "#16a34a" }]}>{fmtIDR(data.revenue.total)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Beban</Text>
          <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{fmtIDR(data.expense.total)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Laba / Rugi Bersih</Text>
          <Text style={[styles.summaryValue, { color: data.netIncome >= 0 ? "#16a34a" : "#dc2626" }]}>
            {data.netIncome >= 0 ? "+" : ""}{fmtIDR(data.netIncome)}
          </Text>
        </View>
      </View>

      {/* Revenue section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>I. PENDAPATAN</Text>
        <View style={styles.tableRowHeader}>
          <Text style={[styles.cellCode, styles.cellBold]}>Kode</Text>
          <Text style={[styles.cellLeft, styles.cellBold]}>Akun</Text>
          <Text style={[styles.cellRight, styles.cellBold]}>Jumlah</Text>
        </View>
        {data.revenue.items.map((item, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowEven : {}]}>
            <Text style={styles.cellCode}>{item.accountCode || "-"}</Text>
            <Text style={styles.cellLeft}>{item.accountName}</Text>
            <Text style={[styles.cellRight, { color: "#16a34a" }]}>{fmtIDR(item.total)}</Text>
          </View>
        ))}
        {data.revenue.items.length === 0 && (
          <View style={styles.tableRow}><Text style={[styles.cellLeft, { color: "#9ca3af" }]}>Tidak ada data</Text></View>
        )}
        <View style={styles.tableRowTotal}>
          <Text style={[styles.cellCode]}></Text>
          <Text style={[styles.cellLeft, styles.cellBold]}>Total Pendapatan</Text>
          <Text style={[styles.cellRight, styles.cellBold, { color: "#16a34a" }]}>{fmtIDR(data.revenue.total)}</Text>
        </View>
      </View>

      {/* Expense section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>II. BEBAN</Text>
        <View style={styles.tableRowHeader}>
          <Text style={[styles.cellCode, styles.cellBold]}>Kode</Text>
          <Text style={[styles.cellLeft, styles.cellBold]}>Akun</Text>
          <Text style={[styles.cellRight, styles.cellBold]}>Jumlah</Text>
        </View>
        {data.expense.items.map((item, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowEven : {}]}>
            <Text style={styles.cellCode}>{item.accountCode || "-"}</Text>
            <Text style={styles.cellLeft}>{item.accountName}</Text>
            <Text style={[styles.cellRight, { color: "#dc2626" }]}>{fmtIDR(item.total)}</Text>
          </View>
        ))}
        {data.expense.items.length === 0 && (
          <View style={styles.tableRow}><Text style={[styles.cellLeft, { color: "#9ca3af" }]}>Tidak ada data</Text></View>
        )}
        <View style={styles.tableRowTotal}>
          <Text style={[styles.cellCode]}></Text>
          <Text style={[styles.cellLeft, styles.cellBold]}>Total Beban</Text>
          <Text style={[styles.cellRight, styles.cellBold, { color: "#dc2626" }]}>{fmtIDR(data.expense.total)}</Text>
        </View>
      </View>

      {/* Net income */}
      <View style={styles.netBox}>
        <Text style={styles.netLabel}>LABA / RUGI BERSIH</Text>
        <Text style={styles.netValue}>{data.netIncome >= 0 ? "+" : ""}{fmtIDR(data.netIncome)}</Text>
      </View>

      <Footer generatedAt={generatedAt} />
    </Page>
  </Document>
);

export async function generateIncomeStatementPdf(data: IncomeStatementData): Promise<Buffer> {
  const generatedAt = fmtDate(new Date());
  return renderToBuffer(<IncomeStatementPdf data={data} generatedAt={generatedAt} />) as Promise<Buffer>;
}

// ── Balance Sheet PDF ─────────────────────────────────────────────────────────

export interface BalanceSheetData {
  asOf: string;
  assets: { items: Array<{ code: string; name: string; category: string; balance: number }>; total: number };
  liabilities: { items: Array<{ code: string; name: string; category: string; balance: number }>; total: number };
  equity: { items: Array<{ code: string; name: string; category: string; balance: number }>; total: number };
  totalLiabilitiesEquity: number;
}

const AccountSection = ({ title, items, total, color }: {
  title: string; items: Array<{ code: string; name: string; balance: number }>; total: number; color: string;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.tableRowHeader}>
      <Text style={[styles.cellCode, styles.cellBold]}>Kode</Text>
      <Text style={[styles.cellLeft, styles.cellBold]}>Akun</Text>
      <Text style={[styles.cellRight, styles.cellBold]}>Saldo</Text>
    </View>
    {items.map((item, i) => (
      <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowEven : {}]}>
        <Text style={styles.cellCode}>{item.code}</Text>
        <Text style={styles.cellLeft}>{item.name}</Text>
        <Text style={[styles.cellRight, { color }]}>{fmtIDR(item.balance)}</Text>
      </View>
    ))}
    {items.length === 0 && (
      <View style={styles.tableRow}><Text style={[styles.cellLeft, { color: "#9ca3af" }]}>Tidak ada data</Text></View>
    )}
    <View style={styles.tableRowTotal}>
      <Text style={[styles.cellCode]}></Text>
      <Text style={[styles.cellLeft, styles.cellBold]}>Total {title}</Text>
      <Text style={[styles.cellRight, styles.cellBold, { color }]}>{fmtIDR(total)}</Text>
    </View>
  </View>
);

const BalanceSheetPdf = ({ data, generatedAt }: { data: BalanceSheetData; generatedAt: string }) => (
  <Document title="Neraca" author="UmrohPlus">
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.companyName}>UmrohPlus — Vins Tour Travel</Text>
        <Text style={styles.reportTitle}>NERACA (Balance Sheet)</Text>
        <Text style={styles.reportSubtitle}>Per Tanggal: {data.asOf}</Text>
        <Text style={styles.generatedAt}>Digenerate: {generatedAt}</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Aset</Text>
          <Text style={[styles.summaryValue, { color: "#1d4ed8" }]}>{fmtIDR(data.assets.total)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Kewajiban</Text>
          <Text style={[styles.summaryValue, { color: "#ea580c" }]}>{fmtIDR(data.liabilities.total)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Ekuitas</Text>
          <Text style={[styles.summaryValue, { color: "#7c3aed" }]}>{fmtIDR(data.equity.total)}</Text>
        </View>
      </View>

      <AccountSection title="ASET" items={data.assets.items} total={data.assets.total} color="#1d4ed8" />
      <AccountSection title="KEWAJIBAN" items={data.liabilities.items} total={data.liabilities.total} color="#ea580c" />
      <AccountSection title="EKUITAS" items={data.equity.items} total={data.equity.total} color="#7c3aed" />

      <View style={styles.netBox}>
        <Text style={styles.netLabel}>TOTAL KEWAJIBAN + EKUITAS</Text>
        <Text style={styles.netValue}>{fmtIDR(data.totalLiabilitiesEquity)}</Text>
      </View>

      <Footer generatedAt={generatedAt} />
    </Page>
  </Document>
);

export async function generateBalanceSheetPdf(data: BalanceSheetData): Promise<Buffer> {
  const generatedAt = fmtDate(new Date());
  return renderToBuffer(<BalanceSheetPdf data={data} generatedAt={generatedAt} />) as Promise<Buffer>;
}

// ── Cash Flow PDF ─────────────────────────────────────────────────────────────

export interface CashFlowData {
  period: { from: string | null; to: string | null };
  monthly: Array<{ month: string; inflow: number; outflow: number; net: number }>;
  summary: { totalInflow: number; totalOutflow: number; netCashFlow: number };
}

const CashFlowPdf = ({ data, generatedAt }: { data: CashFlowData; generatedAt: string }) => (
  <Document title="Laporan Arus Kas" author="UmrohPlus">
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.companyName}>UmrohPlus — Vins Tour Travel</Text>
        <Text style={styles.reportTitle}>LAPORAN ARUS KAS (Cash Flow Statement)</Text>
        <Text style={styles.reportSubtitle}>
          Periode: {data.period.from ?? "Awal"} s/d {data.period.to ?? "Sekarang"}
        </Text>
        <Text style={styles.generatedAt}>Digenerate: {generatedAt}</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Kas Masuk</Text>
          <Text style={[styles.summaryValue, { color: "#16a34a" }]}>{fmtIDR(data.summary.totalInflow)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Kas Keluar</Text>
          <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{fmtIDR(data.summary.totalOutflow)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Net Cash Flow</Text>
          <Text style={[styles.summaryValue, { color: data.summary.netCashFlow >= 0 ? "#16a34a" : "#dc2626" }]}>
            {fmtIDR(data.summary.netCashFlow)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ARUS KAS PER BULAN</Text>
        <View style={styles.tableRowHeader}>
          <Text style={[styles.cellLeft, styles.cellBold]}>Bulan</Text>
          <Text style={[styles.cellRight, styles.cellBold]}>Kas Masuk</Text>
          <Text style={[styles.cellRight, styles.cellBold]}>Kas Keluar</Text>
          <Text style={[styles.cellRight, styles.cellBold]}>Net</Text>
        </View>
        {data.monthly.map((r, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowEven : {}]}>
            <Text style={styles.cellLeft}>{r.month}</Text>
            <Text style={[styles.cellRight, { color: "#16a34a" }]}>{fmtIDR(r.inflow)}</Text>
            <Text style={[styles.cellRight, { color: "#dc2626" }]}>{fmtIDR(r.outflow)}</Text>
            <Text style={[styles.cellRight, { color: r.net >= 0 ? "#16a34a" : "#dc2626" }]}>{fmtIDR(r.net)}</Text>
          </View>
        ))}
        {data.monthly.length === 0 && (
          <View style={styles.tableRow}><Text style={[styles.cellLeft, { color: "#9ca3af" }]}>Tidak ada data</Text></View>
        )}
        <View style={styles.tableRowTotal}>
          <Text style={[styles.cellLeft, styles.cellBold]}>TOTAL</Text>
          <Text style={[styles.cellRight, styles.cellBold, { color: "#16a34a" }]}>{fmtIDR(data.summary.totalInflow)}</Text>
          <Text style={[styles.cellRight, styles.cellBold, { color: "#dc2626" }]}>{fmtIDR(data.summary.totalOutflow)}</Text>
          <Text style={[styles.cellRight, styles.cellBold, { color: data.summary.netCashFlow >= 0 ? "#16a34a" : "#dc2626" }]}>
            {fmtIDR(data.summary.netCashFlow)}
          </Text>
        </View>
      </View>

      <Footer generatedAt={generatedAt} />
    </Page>
  </Document>
);

export async function generateCashFlowPdf(data: CashFlowData): Promise<Buffer> {
  const generatedAt = fmtDate(new Date());
  return renderToBuffer(<CashFlowPdf data={data} generatedAt={generatedAt} />) as Promise<Buffer>;
}
