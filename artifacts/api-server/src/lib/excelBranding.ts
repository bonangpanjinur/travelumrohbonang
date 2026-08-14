import { db, siteSettings, eq } from "@workspace/db";

export interface ExcelBranding {
  companyName: string;
  tagline: string;
  address: string;
  logoUrl: string;
}

export async function getExcelBranding(): Promise<ExcelBranding> {
  const rows = await db
    .select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.category, "general"));

  const values = Object.fromEntries(rows.map((row: { key: string; value: unknown }) => [row.key, row.value]));
  const branding = (values.branding && typeof values.branding === "object" ? values.branding : {}) as Record<string, unknown>;
  const contact = (values.contact && typeof values.contact === "object" ? values.contact : {}) as Record<string, unknown>;

  return {
    companyName: String(branding.company_name || "UmrohPlus"),
    tagline: String(branding.tagline || "Travel & Tours"),
    address: String(contact.address || ""),
    logoUrl: String(branding.logo_url || ""),
  };
}

export async function addBrandingHeader(workbook: any, worksheet: any, branding: ExcelBranding, columnCount: number) {
  worksheet.mergeCells(1, 1, 1, Math.max(columnCount, 6));
  worksheet.getCell(1, 1).value = branding.companyName;
  worksheet.getCell(1, 1).font = { name: "Arial", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getCell(1, 1).alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells(2, 1, 2, Math.max(columnCount, 6));
  worksheet.getCell(2, 1).value = [branding.tagline, branding.address].filter(Boolean).join(" • ");
  worksheet.getCell(2, 1).font = { name: "Arial", size: 10, color: { argb: "FFE2E8F0" } };
  worksheet.getCell(2, 1).alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(2).height = 20;

  for (let row = 1; row <= 2; row++) {
    for (let col = 1; col <= Math.max(columnCount, 6); col++) {
      worksheet.getCell(row, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    }
  }

  if (branding.logoUrl) {
    try {
      const response = await fetch(branding.logoUrl);
      if (response.ok) {
        const contentType = response.headers.get("content-type") || "image/png";
        const extension = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpeg" : contentType.includes("gif") ? "gif" : "png";
        const imageId = workbook.addImage({ buffer: Buffer.from(await response.arrayBuffer()), extension });
        worksheet.addImage(imageId, { tl: { col: 0.15, row: 0.15 }, ext: { width: 48, height: 48 } });
        worksheet.getCell(1, 1).alignment = { vertical: "middle", horizontal: "left", indent: 4 };
        worksheet.getCell(2, 1).alignment = { vertical: "middle", horizontal: "left", indent: 4 };
      }
    } catch (error) {
      console.warn("[excel] logo tidak dapat dimuat:", error instanceof Error ? error.message : error);
    }
  }
}

export function styleTableHeader(worksheet: any, rowNumber: number, columnCount: number) {
  const row = worksheet.getRow(rowNumber);
  row.height = 24;
  row.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  for (let col = 1; col <= columnCount; col++) {
    row.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF115E59" } };
    row.getCell(col).border = { bottom: { style: "thin", color: { argb: "FF99F6E4" } } };
  }
}

export function styleTableBody(worksheet: any, firstRow: number, lastRow: number, columnCount: number) {
  for (let rowNumber = firstRow; rowNumber <= lastRow; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    row.font = { name: "Arial", size: 10, color: { argb: "FF1E293B" } };
    row.alignment = { vertical: "middle", wrapText: true };
    if (rowNumber % 2 === 0) {
      for (let col = 1; col <= columnCount; col++) {
        row.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDFA" } };
      }
    }
  }
}
