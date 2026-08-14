import { Router } from "express";
import {
  db,
  bookingPilgrims,
  bookings,
  packages,
  packageDepartures,
  pilgrimDocuments,
  checkIns,
  eq,
  and,
  or,
  ilike,
  desc,
  inArray,
} from "@workspace/db";
import { requireSuperAdmin } from "../../middlewares/requireAdmin";
import multer from "multer";
import * as XLSX from "xlsx";
import { addBrandingHeader, getExcelBranding, styleTableBody, styleTableHeader } from "../../lib/excelBranding";

const router = Router();

// Only these columns may be written via the admin pilgrim form. Without this
// whitelist, `...req.body` spread straight into insert/update let a caller
// set arbitrary bookingPilgrims columns (e.g. bookingId, id) via the API.
const PILGRIM_WRITABLE_FIELDS = [
  "bookingId",
  "name",
  "nik",
  "phone",
  "email",
  "gender",
  "birthDate",
  "nationality",
  "passportNumber",
  "passportExpiry",
  "roomType",
  "notes",
] as const;

function pickPilgrimFields(body: unknown): Record<string, unknown> {
  const source = (body ?? {}) as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const field of PILGRIM_WRITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field];
    }
  }
  return result;
}

router.get("/", async (req: any, res) => {
  try {
    const { search } = req.query;
    
    let query = db
      .select({
        id: bookingPilgrims.id,
        name: bookingPilgrims.name,
        nik: bookingPilgrims.nik,
        phone: bookingPilgrims.phone,
        email: bookingPilgrims.email,
        gender: bookingPilgrims.gender,
        birthDate: bookingPilgrims.birthDate,
        passportNumber: bookingPilgrims.passportNumber,
        passportExpiry: bookingPilgrims.passportExpiry,
        bookingId: bookingPilgrims.bookingId,
        createdAt: bookingPilgrims.createdAt,
        booking: {
          id: bookings.id,
          bookingCode: bookings.bookingCode,
          status: bookings.status,
          totalPrice: bookings.totalPrice,
          packageTitle: packages.title,
          departureDate: packageDepartures.departureDate,
        }
      })
      .from(bookingPilgrims)
      .leftJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(packageDepartures, eq(bookings.departureId, packageDepartures.id));

    if (search && typeof search === "string") {
      const s = `%${search}%`;
      query = query.where(
        or(
          ilike(bookingPilgrims.name, s),
          ilike(bookingPilgrims.nik, s),
          ilike(bookingPilgrims.passportNumber, s),
          ilike(bookingPilgrims.phone, s),
          ilike(bookingPilgrims.email, s),
          ilike(bookings.bookingCode, s)
        )
      ) as any;
    }

    const data = await query.orderBy(desc(bookingPilgrims.createdAt));
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch pilgrims" });
  }
});

router.post("/", async (req: any, res) => {
    try {
        const values = pickPilgrimFields(req.body);
        if (!values.name) {
          return res.status(400).json({ error: "name is required" });
        }
        const id = crypto.randomUUID();
        const [inserted] = await db.insert(bookingPilgrims).values({
            id,
            ...values,
            createdAt: new Date(),
        } as typeof bookingPilgrims.$inferInsert).returning();
        res.json(inserted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create pilgrim" });
    }
});

router.patch("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const values = pickPilgrimFields(req.body);
    if (Object.keys(values).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    const [updated] = await db
      .update(bookingPilgrims)
      .set(values)
      .where(eq(bookingPilgrims.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Pilgrim not found" });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update pilgrim" });
  }
});

// ── Excel helpers ─────────────────────────────────────────────────────────────
const excelUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/** Convert Excel serial date number → ISO "YYYY-MM-DD" string, or pass through ISO strings */
function excelDateToISO(val: any): string | null {
  if (!val && val !== 0) return null;
  if (typeof val === "string") {
    // Already ISO or localized string
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
    return null;
  }
  const n = Number(val);
  if (isNaN(n) || n < 1) return null;
  // Excel date serial: days since 1899-12-30 (accounts for 1900 leap-year bug)
  const date = new Date(Math.round((n - 25569) * 86400 * 1000));
  return date.toISOString().split("T")[0];
}

function mapGender(val: any): string | null {
  const s = String(val || "").toUpperCase().trim();
  if (s === "M" || s === "MALE" || s === "L" || s === "LAKI-LAKI" || s === "LAKI") return "male";
  if (s === "F" || s === "FEMALE" || s === "P" || s === "PEREMPUAN") return "female";
  return null;
}

const MANIFEST_HEADERS = ["NO","FULL NAME","SEX","BIRTH PLACE","DATE OF BIRTH","AGE","PASSPOR","ISSUED DATE","EXPIRED DATE","ISSUE OFFICE","RELATIONSHIP","TYPE ROOM","KETERANGAN"];

/** Build blank manifest worksheet (for template download) */
function buildManifestSheet(rows: any[][], title = "MANIFEST JAMAAH UMRAH, VINS TOUR TRAVEL"): XLSX.WorkSheet {
  const wsData: any[][] = [
    ["", "", title, "", "", "", "", "", "", "", "", "", ""],
    Array(13).fill(""),
    ["", "", "", "GROUP", rows.length, "", "", "", "", "", "", "", ""],
    ["", "", "", "TANGGAL", new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }), "", "", "", "", "", "", "", ""],
    ["", "", "", "PROGRAM", "UMROH", "", "", "", "", "", "", "", ""],
    Array(13).fill(""),
    MANIFEST_HEADERS,
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [4,30,5,15,15,5,13,15,15,15,15,12,25].map(wch => ({ wch }));
  // Bold header row (index 6)
  return ws;
}

async function buildBrandedManifestWorkbook(rows: any[][], title: string) {
  const ExcelJSMod = await import("exceljs");
  const ExcelJSCtor = (ExcelJSMod as any).default ?? ExcelJSMod;
  const workbook = new ExcelJSCtor.Workbook();
  const worksheet = workbook.addWorksheet("MANIFEST", { views: [{ state: "frozen", ySplit: 7 }] });
  const branding = await getExcelBranding();
  const columns = MANIFEST_HEADERS;
  worksheet.columns = columns.map((_header, index) => ({ key: `c${index}`, width: [8, 30, 10, 18, 18, 8, 18, 18, 18, 18, 18, 14, 32][index] || 16 }));
  await addBrandingHeader(workbook, worksheet, branding, columns.length);
  const metadata = [
    ["DOKUMEN", title],
    ["TANGGAL", new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
    ["PROGRAM", "UMROH"],
  ];
  metadata.forEach(([label, value], index) => {
    const rowNumber = 4 + index;
    worksheet.mergeCells(rowNumber, 1, rowNumber, 3);
    worksheet.mergeCells(rowNumber, 4, rowNumber, Math.min(columns.length, 9));
    worksheet.getCell(rowNumber, 1).value = label;
    worksheet.getCell(rowNumber, 4).value = value;
    worksheet.getCell(rowNumber, 1).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF115E59" } };
    worksheet.getCell(rowNumber, 4).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF334155" } };
    worksheet.getCell(rowNumber, 1).alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getCell(rowNumber, 4).alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(rowNumber).height = 22;
  });
  worksheet.getRow(7).values = columns;
  styleTableHeader(worksheet, 7, columns.length);
  rows.forEach((values) => worksheet.addRow(values));
  if (rows.length > 0) styleTableBody(worksheet, 8, 7 + rows.length, columns.length);
  worksheet.autoFilter = { from: { row: 7, column: 1 }, to: { row: 7 + Math.max(rows.length, 1), column: columns.length } };
  return workbook;
}

// ── GET /template-excel — download blank manifest Excel template ──────────────
router.get("/template-excel", async (_req, res) => {
  try {
    const exampleRow = ["1","NAMA LENGKAP JEMAAH","M","JAKARTA","1980-05-15","44","A1234567","2019-01-01","2029-01-01","JAKARTA","SINGLE","QUAD","KETERANGAN"];
    const wb = await buildBrandedManifestWorkbook([exampleRow], "MANIFEST JAMAAH UMRAH");
    const buf = await wb.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="template-import-jemaah.xlsx"');
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: "Gagal buat template" });
  }
});

// ── POST /import-excel — upload .xls/.xlsx file, parse, bulk insert ───────────
router.post("/import-excel", excelUpload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File wajib diupload" });

    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    // Find header row: look for a row where index 0 = "NO" or index 1 contains "FULL NAME" / "NAMA"
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(20, allRows.length); i++) {
      const r = allRows[i];
      const c0 = String(r[0] || "").toUpperCase().trim();
      const c1 = String(r[1] || "").toUpperCase().trim();
      if (c0 === "NO" && (c1.includes("FULL NAME") || c1.includes("NAMA"))) {
        headerRowIdx = i;
        break;
      }
    }

    let headers: string[];
    let dataRows: any[][];
    if (headerRowIdx >= 0) {
      headers = allRows[headerRowIdx].map((h: any) => String(h).toUpperCase().trim());
      dataRows = allRows.slice(headerRowIdx + 1);
    } else {
      // fallback: treat first row as header
      headers = allRows[0].map((h: any) => String(h).toUpperCase().trim());
      dataRows = allRows.slice(1);
    }

    const ci = (names: string[]) => names.reduce((found, n) => found >= 0 ? found : headers.findIndex(h => h.includes(n)), -1);
    const iName      = ci(["FULL NAME","NAMA"]);
    const iSex       = ci(["SEX","JENIS"]);
    const iBirthDate = ci(["DATE OF BIRTH","TANGGAL LAHIR","TGL LAHIR"]);
    const iBirthPl   = ci(["BIRTH PLACE","TEMPAT LAHIR"]);
    const iPassport  = ci(["PASSPOR","PASSPORT","NO_PASPOR","PASPOR"]);
    const iIssued    = ci(["ISSUED DATE","TGL TERBIT"]);
    const iExpiry    = ci(["EXPIRED DATE","MASA BERLAKU","EXP"]);
    const iOffice    = ci(["ISSUE OFFICE","KANTOR"]);
    const iRel       = ci(["RELATIONSHIP","HUB"]);
    const iRoom      = ci(["TYPE ROOM","ROOM","TIPE"]);
    const iNotes     = ci(["KETERANGAN","NOTES","CATATAN"]);

    const inserts: (typeof bookingPilgrims.$inferInsert)[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.every((c: any) => !c)) continue;

      const name = iName >= 0 ? String(row[iName] || "").trim() : "";
      if (!name) continue;

      // Compose notes from birth place + relationship + keterangan fields
      const parts: string[] = [];
      if (iBirthPl >= 0 && row[iBirthPl]) parts.push(`Tempat Lahir: ${String(row[iBirthPl]).trim()}`);
      if (iOffice  >= 0 && row[iOffice])  parts.push(`Kantor Paspor: ${String(row[iOffice]).trim()}`);
      if (iRel     >= 0 && row[iRel])     parts.push(`Hub: ${String(row[iRel]).trim()}`);
      if (iNotes   >= 0 && row[iNotes])   parts.push(String(row[iNotes]).trim());

      inserts.push({
        id: crypto.randomUUID(),
        name,
        gender:         iSex     >= 0 ? mapGender(row[iSex]) : null,
        birthDate:      iBirthDate >= 0 ? excelDateToISO(row[iBirthDate]) : null,
        passportNumber: iPassport  >= 0 ? String(row[iPassport] || "").trim() || null : null,
        passportExpiry: iExpiry    >= 0 ? excelDateToISO(row[iExpiry]) : null,
        roomType:       iRoom      >= 0 ? String(row[iRoom] || "").trim() || null : null,
        notes:          parts.length > 0 ? parts.join(" | ") : null,
        createdAt: new Date(),
      } as typeof bookingPilgrims.$inferInsert);
    }

    if (inserts.length === 0) {
      return res.status(422).json({ error: "Tidak ada data jemaah valid ditemukan dalam file" });
    }
    if (inserts.length > 500) {
      return res.status(400).json({ error: "Maksimal 500 jemaah per import" });
    }

    const inserted = await db.insert(bookingPilgrims).values(inserts).returning();
    res.status(201).json({ inserted: inserted.length, pilgrims: inserted });
  } catch (err: any) {
    console.error("[pilgrims] POST /import-excel", err.message);
    res.status(500).json({ error: "Gagal import Excel" });
  }
});

// ── GET /export-excel — download manifest Excel (filtered by search/bookingId) ─
router.get("/export-excel", async (req: any, res) => {
  try {
    const { search, bookingId } = req.query as Record<string, string>;

    let query = db
      .select({
        name:           bookingPilgrims.name,
        gender:         bookingPilgrims.gender,
        birthDate:      bookingPilgrims.birthDate,
        passportNumber: bookingPilgrims.passportNumber,
        passportExpiry: bookingPilgrims.passportExpiry,
        roomType:       bookingPilgrims.roomType,
        notes:          bookingPilgrims.notes,
        bookingCode:    bookings.bookingCode,
        packageTitle:   packages.title,
        departureDate:  packageDepartures.departureDate,
      })
      .from(bookingPilgrims)
      .leftJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(packageDepartures, eq(bookings.departureId, packageDepartures.id));

    if (bookingId) {
      query = query.where(eq(bookingPilgrims.bookingId, bookingId)) as any;
    } else if (search) {
      const s = `%${search}%`;
      query = query.where(
        or(ilike(bookingPilgrims.name, s), ilike(bookingPilgrims.passportNumber, s), ilike(bookingPilgrims.nik, s))
      ) as any;
    }

    const data = await (query as any).orderBy(desc(bookingPilgrims.createdAt));

    const rows = (data as any[]).map((p: any, i: number) => {
      const bDate  = p.birthDate  ? new Date(p.birthDate)  : null;
      const expDate = p.passportExpiry ? new Date(p.passportExpiry) : null;
      const age = bDate ? Math.floor((Date.now() - bDate.getTime()) / (365.25 * 24 * 3600 * 1000)) : "";
      return [
        i + 1,
        p.name,
        p.gender === "male" ? "M" : p.gender === "female" ? "F" : "",
        "",   // birthPlace – not stored
        bDate  ? bDate.toLocaleDateString("id-ID")  : "",
        age,
        p.passportNumber || "",
        "",   // issuedDate – not stored
        expDate ? expDate.toLocaleDateString("id-ID") : "",
        "",   // issueOffice – not stored
        "",   // relationship – not stored
        p.roomType || "",
        p.notes || "",
      ];
    });

    const wb = await buildBrandedManifestWorkbook(rows, "MANIFEST JAMAAH UMRAH");
    const buf = await wb.xlsx.writeBuffer();

    const dateTag = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="manifest-jemaah-${dateTag}.xlsx"`);
    res.send(buf);
  } catch (err: any) {
    console.error("[pilgrims] GET /export-excel", err.message);
    res.status(500).json({ error: "Gagal export Excel" });
  }
});

// ── POST /bulk — import banyak jemaah sekaligus (maks 500) ──────────────────
router.post("/bulk", async (req: any, res) => {
  try {
    const { pilgrims: rows } = req.body ?? {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Array 'pilgrims' wajib diisi" });
    }
    if (rows.length > 500) {
      return res.status(400).json({ error: "Maksimal 500 jemaah per import" });
    }

    const errors: string[] = [];
    const inserts: (typeof bookingPilgrims.$inferInsert)[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const values = pickPilgrimFields(row);
      if (!values.name || !(values.name as string).trim()) {
        errors.push(`Baris ${i + 1}: kolom 'nama' wajib diisi`);
        continue;
      }
      inserts.push({
        id: crypto.randomUUID(),
        ...values,
        name: (values.name as string).trim(),
        createdAt: new Date(),
      } as typeof bookingPilgrims.$inferInsert);
    }

    if (errors.length > 0) {
      return res.status(422).json({ error: "Validasi gagal", errors });
    }

    const inserted = await db.insert(bookingPilgrims).values(inserts).returning();
    res.status(201).json({ inserted: inserted.length, pilgrims: inserted });
  } catch (err: any) {
    console.error("[pilgrims] POST /bulk", err.message);
    res.status(500).json({ error: "Gagal import massal" });
  }
});

// ── Departure recap: who has / hasn't checked in ────────────────────────────
router.get("/departure-recap", async (req: any, res) => {
  try {
    const { departureId } = req.query as Record<string, string>;
    if (!departureId) {
      res.status(400).json({ error: "departureId is required" });
      return;
    }

    // All pilgrims for this departure (via bookings.departureId)
    const pilgrims = await db
      .select({
        id:             bookingPilgrims.id,
        name:           bookingPilgrims.name,
        nik:            bookingPilgrims.nik,
        phone:          bookingPilgrims.phone,
        gender:         bookingPilgrims.gender,
        bookingId:      bookingPilgrims.bookingId,
        bookingCode:    bookings.bookingCode,
      })
      .from(bookingPilgrims)
      .innerJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .where(eq(bookings.departureId, departureId));

    if (!pilgrims.length) {
      res.json({ total: 0, checkedIn: 0, notCheckedIn: 0, pilgrims: [] });
      return;
    }

    const pilgrimIds = pilgrims.map((p) => p.id);
    const ciRows = pilgrimIds.length
      ? await db
          .select({
            pilgrimId:   checkIns.pilgrimId,
            checkedInAt: checkIns.checkedInAt,
            location:    checkIns.location,
          })
          .from(checkIns)
          .where(
            and(
              inArray(checkIns.pilgrimId, pilgrimIds),
              eq(checkIns.departureId, departureId),
            ),
          )
          .orderBy(desc(checkIns.checkedInAt))
      : [];

    // Latest check-in per pilgrim
    const ciMap = new Map<string, { checkedInAt: Date; location: string | null }>();
    for (const r of ciRows) {
      if (!ciMap.has(r.pilgrimId)) {
        ciMap.set(r.pilgrimId, { checkedInAt: r.checkedInAt, location: r.location });
      }
    }

    const result = pilgrims.map((p) => {
      const ci = ciMap.get(p.id);
      return { ...p, checkedIn: !!ci, checkedInAt: ci?.checkedInAt ?? null, location: ci?.location ?? null };
    });

    const checkedIn = result.filter((p) => p.checkedIn).length;
    res.json({
      total:        result.length,
      checkedIn,
      notCheckedIn: result.length - checkedIn,
      pilgrims:     result,
    });
  } catch (e) {
    console.error("[pilgrims GET /departure-recap]", e);
    res.status(500).json({ error: "Failed to fetch departure recap" });
  }
});

// ── Manual check-in by search ─────────────────────────────────────────────
router.get("/search", async (req: any, res) => {
  try {
    const { q = "", departureId } = req.query as Record<string, string>;
    if (!q.trim()) { res.json([]); return; }
    const s = `%${q}%`;

    let base = db
      .select({
        id:          bookingPilgrims.id,
        name:        bookingPilgrims.name,
        nik:         bookingPilgrims.nik,
        phone:       bookingPilgrims.phone,
        gender:      bookingPilgrims.gender,
        bookingId:   bookingPilgrims.bookingId,
        bookingCode: bookings.bookingCode,
        departureId: bookings.departureId,
        packageTitle: packages.title,
        departureDate: packageDepartures.departureDate,
      })
      .from(bookingPilgrims)
      .leftJoin(bookings,          eq(bookingPilgrims.bookingId,    bookings.id))
      .leftJoin(packages,          eq(bookings.packageId,           packages.id))
      .leftJoin(packageDepartures, eq(bookings.departureId,         packageDepartures.id))
      .where(
        and(
          or(ilike(bookingPilgrims.name, s), ilike(bookingPilgrims.nik, s)),
          departureId ? eq(bookings.departureId, departureId) : undefined,
        ),
      )
      .$dynamic();

    const rows = await base.limit(20);
    res.json(rows);
  } catch (e) {
    console.error("[pilgrims GET /search]", e);
    res.status(500).json({ error: "Failed to search pilgrims" });
  }
});

// Check-ins
router.get("/check-ins", async (req: any, res) => {
  try {
    const data = await db
      .select({
        id: checkIns.id,
        pilgrimId: checkIns.pilgrimId,
        bookingId: checkIns.bookingId,
        departureId: checkIns.departureId,
        location: checkIns.location,
        notes: checkIns.notes,
        checkedInBy: checkIns.checkedInBy,
        checkedInAt: checkIns.checkedInAt,
        pilgrimName: bookingPilgrims.name,
      })
      .from(checkIns)
      .leftJoin(bookingPilgrims, eq(checkIns.pilgrimId, bookingPilgrims.id))
      .orderBy(desc(checkIns.checkedInAt))
      .limit(100);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch check-ins" });
  }
});

// ── DELETE /bulk — hapus banyak jemaah sekaligus (super admin only) ──────────
router.delete("/bulk", requireSuperAdmin, async (req: any, res) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids harus array non-kosong" });
    }
    const deleted = await db
      .delete(bookingPilgrims)
      .where(inArray(bookingPilgrims.id, ids))
      .returning({ id: bookingPilgrims.id });
    res.json({ deleted: deleted.length });
  } catch (error) {
    console.error("[DELETE /admin/pilgrims/bulk]", error);
    res.status(500).json({ error: "Gagal menghapus jemaah" });
  }
});

// ── DELETE /:id — hapus jamaah dari booking ──────────────────────────────────
router.delete("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db
      .delete(bookingPilgrims)
      .where(eq(bookingPilgrims.id, id))
      .returning({ id: bookingPilgrims.id, bookingId: bookingPilgrims.bookingId });
    if (!deleted) return res.status(404).json({ error: "Jamaah tidak ditemukan" });
    res.json({ deleted: deleted.id });
  } catch (error) {
    console.error("[DELETE /admin/pilgrims/:id]", error);
    res.status(500).json({ error: "Gagal menghapus jamaah" });
  }
});

router.post("/check-in", async (req: any, res) => {
  try {
    const { pilgrimId, departureId, bookingId, location, notes } = req.body;
    if (!pilgrimId) {
      return res.status(400).json({ error: "pilgrimId is required" });
    }

    const [pilgrim] = await db
      .select({ id: bookingPilgrims.id, bookingId: bookingPilgrims.bookingId })
      .from(bookingPilgrims)
      .where(eq(bookingPilgrims.id, pilgrimId))
      .limit(1);

    if (!pilgrim) {
      return res.status(404).json({ error: "Pilgrim not found" });
    }

    const [created] = await db
      .insert(checkIns)
      .values({
        id: crypto.randomUUID(),
        pilgrimId,
        bookingId: bookingId ?? pilgrim.bookingId ?? null,
        departureId: departureId ?? null,
        location: location ?? null,
        notes: notes ?? null,
        checkedInBy: req.user?.id ?? null,
        checkedInAt: new Date(),
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to record check-in" });
  }
});

export default router;
