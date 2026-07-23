/**
 * F-15: Export ke Software Akuntansi
 *
 * GET /api/admin/accounting-export/jurnal-id     — CSV format Jurnal.id
 * GET /api/admin/accounting-export/accurate       — CSV format Accurate
 * GET /api/admin/accounting-export/zahir          — CSV format Zahir
 * GET /api/admin/accounting-export/espt-pph       — CSV format e-SPT PPh
 * GET /api/admin/accounting-export/general-journal — CSV jurnal umum (format netral)
 * GET /api/admin/accounting-export/summary        — statistik untuk frontend
 */

import { Router, Request, Response } from "express";
import { db, sql } from "@workspace/db";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  return lines.join("\r\n");
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtDateAccurate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function getRows(r: any): any[] {
  return (r as any).rows ?? r;
}

/** Build parameterized date filter fragments safely. */
function buildDateConditions(from: string | undefined, to: string | undefined) {
  const fragments: ReturnType<typeof sql>[] = [];
  if (from) fragments.push(sql`ft.transaction_date >= ${from}::timestamptz`);
  if (to)   fragments.push(sql`ft.transaction_date <= ${to}::timestamptz + INTERVAL '1 day'`);
  return fragments;
}

async function fetchJournalEntries(from: string | undefined, to: string | undefined): Promise<any[]> {
  const conditions = buildDateConditions(from, to);

  // Build WHERE clause
  const where = conditions.length
    ? sql` WHERE ${conditions[0]}${conditions[1] ? sql` AND ${conditions[1]}` : sql``}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      ft.id,
      ft.transaction_date,
      ft.reference_number,
      ft.description,
      ft.entry_type,
      ft.amount::numeric AS amount,
      ft.category,
      ft.type,
      coa.code   AS account_code,
      coa.name   AS account_name,
      coa.type   AS account_type
    FROM financial_transactions ft
    LEFT JOIN chart_of_accounts coa ON coa.id = ft.account_id
    ${where}
    ORDER BY ft.transaction_date ASC, ft.reference_number ASC, ft.id ASC
  `);
  return getRows(result);
}

// ── GET /jurnal-id ────────────────────────────────────────────────────────────
router.get("/jurnal-id", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const rows = await fetchJournalEntries(from, to);

    const csvRows = rows.map((r) => {
      const amount = Number(r.amount ?? 0);
      const isDebit = (r.entry_type === "debit");
      return [
        fmtDate(r.transaction_date),
        r.reference_number ?? "",
        r.account_code ?? "",
        r.account_name ?? r.category ?? "",
        isDebit ? amount : 0,
        isDebit ? 0 : amount,
        r.description ?? "",
      ];
    });

    const csv = toCSV(
      ["Tanggal", "No. Jurnal", "Kode Akun", "Nama Akun", "Debet", "Kredit", "Keterangan"],
      csvRows,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="jurnal-id-export-${Date.now()}.csv"`);
    res.send("\uFEFF" + csv);
  } catch (e) {
    console.error("[GET /accounting-export/jurnal-id]", e);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// ── GET /accurate ─────────────────────────────────────────────────────────────
router.get("/accurate", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const rows = await fetchJournalEntries(from, to);

    const csvRows = rows.map((r) => {
      const amount = Number(r.amount ?? 0);
      const isDebit = (r.entry_type === "debit");
      return [
        fmtDateAccurate(r.transaction_date),
        r.reference_number ?? "",
        r.account_code ?? "",
        r.account_name ?? r.category ?? "",
        isDebit ? amount : 0,
        isDebit ? 0 : amount,
        r.description ?? "",
        r.reference_number ?? "",
      ];
    });

    const csv = toCSV(
      ["TGL", "No. Jurnal", "Kode Akun", "Nama Akun", "Debet", "Kredit", "Keterangan", "Referensi"],
      csvRows,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="accurate-export-${Date.now()}.csv"`);
    res.send("\uFEFF" + csv);
  } catch (e) {
    console.error("[GET /accounting-export/accurate]", e);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// ── GET /zahir ────────────────────────────────────────────────────────────────
router.get("/zahir", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const rows = await fetchJournalEntries(from, to);

    const csvRows = rows.map((r) => {
      const amount = Number(r.amount ?? 0);
      const isDebit = (r.entry_type === "debit");
      return [
        fmtDate(r.transaction_date),
        r.reference_number ?? "",
        r.account_code ?? "",
        r.account_name ?? r.category ?? "",
        r.description ?? "",
        isDebit ? amount : 0,
        isDebit ? 0 : amount,
        "IDR",
        1,
      ];
    });

    const csv = toCSV(
      ["Tanggal", "No Jurnal", "Kode Akun", "Nama Akun", "Keterangan", "Debit", "Kredit", "Mata Uang", "Kurs"],
      csvRows,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="zahir-export-${Date.now()}.csv"`);
    res.send("\uFEFF" + csv);
  } catch (e) {
    console.error("[GET /accounting-export/zahir]", e);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// ── GET /espt-pph ─────────────────────────────────────────────────────────────
router.get("/espt-pph", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    // rate must be a number between 0–100; default 2%
    const rawRate = Number(req.query.rate ?? 2);
    const rate = Number.isFinite(rawRate) && rawRate >= 0 && rawRate <= 100 ? rawRate : 2;
    const tarif = rate / 100;

    const conditions: ReturnType<typeof sql>[] = [
      sql`ft.type IN ('expense', 'cost')`,
    ];
    if (from) conditions.push(sql`ft.transaction_date >= ${from}::timestamptz`);
    if (to)   conditions.push(sql`ft.transaction_date <= ${to}::timestamptz + INTERVAL '1 day'`);

    const where = conditions.reduce((acc, cond, i) =>
      i === 0 ? sql`WHERE ${cond}` : sql`${acc} AND ${cond}`
    );

    const result = await db.execute(sql`
      SELECT
        ft.id,
        ft.transaction_date,
        ft.reference_number,
        ft.description,
        ft.amount::numeric AS amount,
        ft.category,
        coa.code AS account_code,
        coa.name AS account_name
      FROM financial_transactions ft
      LEFT JOIN chart_of_accounts coa ON coa.id = ft.account_id
      ${where}
      ORDER BY ft.transaction_date ASC
    `);
    const rows = getRows(result);

    const rateLabel = `${rate}%`;
    const csvRows = rows.map((r) => {
      const dpp = Number(r.amount ?? 0);
      const pph = Math.round(dpp * tarif);
      return [
        fmtDate(r.transaction_date),
        r.reference_number ?? "",
        r.account_code ?? "",
        r.account_name ?? r.category ?? "",
        "PPh Pasal 23",
        dpp,
        rateLabel,
        pph,
        r.description ?? "",
      ];
    });

    const csv = toCSV(
      ["Tanggal", "No. Bukti", "Kode Akun", "Nama Penerima", "Kode Objek Pajak", "DPP", "Tarif", "PPh Terutang", "Keterangan"],
      csvRows,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="espt-pph23-${Date.now()}.csv"`);
    res.send("\uFEFF" + csv);
  } catch (e) {
    console.error("[GET /accounting-export/espt-pph]", e);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// ── GET /general-journal ──────────────────────────────────────────────────────
router.get("/general-journal", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const rows = await fetchJournalEntries(from, to);

    const csvRows = rows.map((r) => {
      const amount = Number(r.amount ?? 0);
      const isDebit = (r.entry_type === "debit");
      return [
        fmtDate(r.transaction_date),
        r.reference_number ?? "",
        r.account_code ?? "",
        r.account_name ?? "",
        r.account_type ?? "",
        r.entry_type ?? "",
        isDebit ? amount : "",
        isDebit ? "" : amount,
        r.category ?? "",
        r.description ?? "",
      ];
    });

    const csv = toCSV(
      ["Tanggal", "No. Jurnal", "Kode Akun", "Nama Akun", "Tipe Akun", "Tipe Entri", "Debet", "Kredit", "Kategori", "Keterangan"],
      csvRows,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="jurnal-umum-${Date.now()}.csv"`);
    res.send("\uFEFF" + csv);
  } catch (e) {
    console.error("[GET /accounting-export/general-journal]", e);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// ── GET /summary — metadata untuk frontend ────────────────────────────────────
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    const conditions: ReturnType<typeof sql>[] = [];
    if (from) conditions.push(sql`ft.transaction_date >= ${from}::timestamptz`);
    if (to)   conditions.push(sql`ft.transaction_date <= ${to}::timestamptz + INTERVAL '1 day'`);

    const where = conditions.length
      ? conditions.reduce((acc, cond, i) => i === 0 ? sql`WHERE ${cond}` : sql`${acc} AND ${cond}`)
      : sql``;

    const result = await db.execute(sql`
      SELECT
        COUNT(*) AS total_entries,
        SUM(CASE WHEN ft.entry_type = 'debit'  THEN ft.amount::numeric ELSE 0 END) AS total_debit,
        SUM(CASE WHEN ft.entry_type = 'credit' THEN ft.amount::numeric ELSE 0 END) AS total_credit,
        MIN(ft.transaction_date) AS earliest,
        MAX(ft.transaction_date) AS latest
      FROM financial_transactions ft
      ${where}
    `);

    const row = getRows(result)[0] ?? {};
    res.json({
      totalEntries: Number(row.total_entries ?? 0),
      totalDebit: Number(row.total_debit ?? 0),
      totalCredit: Number(row.total_credit ?? 0),
      earliest: row.earliest ?? null,
      latest: row.latest ?? null,
    });
  } catch (e) {
    console.error("[GET /accounting-export/summary]", e);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

export default router;
