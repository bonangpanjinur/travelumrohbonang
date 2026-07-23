/**
 * JM-F01 — Admin: Database Jemaah — master view of all booking_pilgrims
 * Supports server-side search + pagination.
 *
 * GET /api/admin/pilgrims-db
 *   ?search=  — name / nik / passport_number / phone
 *   ?limit=   — default 50, max 200
 *   ?offset=  — default 0
 *
 * POST /api/admin/pilgrims-db/import
 *   Body: { rows: ImportRow[] }  — bulk-insert pilgrims into existing bookings
 */
import { Router } from "express";
import { db, sql, bookingPilgrims, bookings, eq, inArray } from "@workspace/db";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeGender(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "l" || v === "laki" || v === "laki-laki" || v === "male" || v === "m") return "male";
  if (v === "p" || v === "perempuan" || v === "wanita" || v === "female" || v === "f") return "female";
  return null;
}

// DD/MM/YYYY → YYYY-MM-DD; YYYY-MM-DD passed through; others null
function normalizeDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

interface ImportRow {
  bookingCode?: string;
  name?: string;
  phone?: string;
  email?: string;
  gender?: string;
  nik?: string;
  birthDate?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  roomType?: string;
  notes?: string;
}

// ── POST /import ──────────────────────────────────────────────────────────────

router.post("/import", async (req, res) => {
  const { rows } = req.body as { rows: ImportRow[] };

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "Tidak ada data untuk diimpor" });
    return;
  }
  if (rows.length > 500) {
    res.status(400).json({ error: "Maksimal 500 baris per impor" });
    return;
  }

  const result = {
    imported: 0,
    skipped: 0,
    errors: [] as { row: number; reason: string }[],
  };

  // Batch look-up all referenced booking codes at once
  const codes = [...new Set(rows.map((r) => r.bookingCode).filter(Boolean))] as string[];
  const bookingRows = codes.length
    ? await db
        .select({ id: bookings.id, bookingCode: bookings.bookingCode })
        .from(bookings)
        .where(inArray(bookings.bookingCode, codes))
    : [];
  const bookingByCode: Record<string, string> = Object.fromEntries(
    bookingRows.map((b) => [b.bookingCode, b.id])
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // row 1 = header, row 2 = first data

    if (!row.bookingCode?.trim()) {
      result.errors.push({ row: rowNum, reason: "Kode booking kosong" });
      result.skipped++;
      continue;
    }
    const bookingId = bookingByCode[row.bookingCode.trim()];
    if (!bookingId) {
      result.errors.push({ row: rowNum, reason: `Booking "${row.bookingCode}" tidak ditemukan` });
      result.skipped++;
      continue;
    }
    if (!row.name?.trim()) {
      result.errors.push({ row: rowNum, reason: "Kolom nama wajib diisi" });
      result.skipped++;
      continue;
    }

    await db.insert(bookingPilgrims).values({
      id: crypto.randomUUID(),
      bookingId,
      name: row.name.trim(),
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      gender: normalizeGender(row.gender),
      nik: row.nik?.trim() || null,
      birthDate: normalizeDate(row.birthDate),
      nationality: row.nationality?.trim() || null,
      passportNumber: row.passportNumber?.trim() || null,
      passportExpiry: normalizeDate(row.passportExpiry),
      roomType: row.roomType?.trim().toLowerCase() || null,
      notes: row.notes?.trim() || null,
      createdAt: new Date(),
    });
    result.imported++;
  }

  res.json(result);
});

// ── GET / ─────────────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const { search = "", limit = "50", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 50, 200);
  const off = parseInt(offset) || 0;
  const q = `%${search}%`;

  const searchCond = search
    ? sql`AND (
        bp.name ILIKE ${q}
        OR bp.nik ILIKE ${q}
        OR bp.passport_number ILIKE ${q}
        OR bp.phone ILIKE ${q}
      )`
    : sql``;

  try {
    const countResult = await db.execute<{ total: string }>(sql`
      SELECT COUNT(*)::int AS total
      FROM booking_pilgrims bp
      JOIN bookings b ON b.id = bp.booking_id
      WHERE 1=1 ${searchCond}
    `);
    const countRow = countResult.rows[0];

    const rowsResult = await db.execute<Record<string, any>>(sql`
      SELECT
        bp.id,
        bp.booking_id       AS "bookingId",
        bp.pilgrim_id       AS "pilgrimId",
        bp.name,
        bp.phone,
        bp.email,
        bp.gender,
        bp.nik,
        bp.birth_date       AS "birthDate",
        bp.nationality,
        bp.passport_number  AS "passportNumber",
        bp.passport_expiry  AS "passportExpiry",
        bp.room_type        AS "roomType",
        bp.created_at       AS "createdAt",
        b.booking_code      AS "bookingCode",
        b.status            AS "bookingStatus",
        pkg.title           AS "packageTitle",
        pd.departure_date   AS "departureDate"
      FROM booking_pilgrims bp
      JOIN bookings b ON b.id = bp.booking_id
      LEFT JOIN packages pkg ON pkg.id = b.package_id
      LEFT JOIN package_departures pd ON pd.id = b.departure_id
      WHERE 1=1 ${searchCond}
      ORDER BY bp.created_at DESC
      LIMIT ${lim} OFFSET ${off}
    `);

    res.json({ data: rowsResult.rows, total: Number(countRow?.total ?? 0) });
  } catch (e) {
    console.error("[pilgrims-db GET /]", e);
    res.status(500).json({ error: "Failed to fetch pilgrims database" });
  }
});

export default router;
