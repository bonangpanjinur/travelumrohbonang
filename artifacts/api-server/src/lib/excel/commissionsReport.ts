/**
 * Server-side Excel generator for "Laporan Komisi Agen" (agent commission
 * report): per-agent, per-period rows with subtotals.
 *
 * F-06 · PDF Export (see docs/PRD.md).
 */
import ExcelJS from "exceljs";

export interface CommissionRow {
  agentName: string;
  agentReferralCode: string | null;
  bookingCode: string;
  bookingCreatedAt: string | Date | null;
  amount: number;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  paid: "Dibayar",
  rejected: "Ditolak",
};

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function generateCommissionsExcel(
  rows: CommissionRow[],
  periodLabel: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UmrohPlus";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Laporan Komisi", {
    pageSetup: { orientation: "landscape", fitToPage: true },
  });

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Laporan Komisi Agen — UmrohPlus";
  sheet.getCell("A1").font = { size: 14, bold: true, color: { argb: "FF7A1F2B" } };

  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value = `Periode: ${periodLabel}`;
  sheet.getCell("A2").font = { size: 10, italic: true, color: { argb: "FF666666" } };

  sheet.addRow([]);

  const headerRow = sheet.addRow([
    "Agen",
    "Kode Referral",
    "Kode Booking",
    "Tanggal Booking",
    "Status",
    "Komisi (Rp)",
  ]);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7A1F2B" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Group rows by agent for subtotals, preserving first-seen agent order.
  const byAgent = new Map<string, CommissionRow[]>();
  for (const r of rows) {
    const key = r.agentName;
    const list = byAgent.get(key) ?? [];
    list.push(r);
    byAgent.set(key, list);
  }

  let grandTotal = 0;
  for (const [agentName, agentRows] of byAgent) {
    let subtotal = 0;
    for (const r of agentRows) {
      sheet.addRow([
        agentName,
        r.agentReferralCode ?? "-",
        r.bookingCode,
        formatDate(r.bookingCreatedAt),
        STATUS_LABELS[r.status] ?? r.status,
        r.amount,
      ]);
      subtotal += r.amount;
    }
    const subtotalRow = sheet.addRow(["", "", "", "", `Subtotal ${agentName}`, subtotal]);
    subtotalRow.font = { bold: true };
    subtotalRow.getCell(5).alignment = { horizontal: "right" };
    subtotalRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E6C8" } };
    });
    grandTotal += subtotal;
    sheet.addRow([]);
  }

  const totalRow = sheet.addRow(["", "", "", "", "TOTAL KOMISI", grandTotal]);
  totalRow.font = { bold: true, size: 12, color: { argb: "FF7A1F2B" } };

  sheet.getColumn(1).width = 24;
  sheet.getColumn(2).width = 16;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 16;
  sheet.getColumn(5).width = 22;
  sheet.getColumn(6).width = 18;
  sheet.getColumn(6).numFmt = "#,##0";

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
