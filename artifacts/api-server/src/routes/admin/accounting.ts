/**
 * Admin Accounting Routes — F1-05: Double-Entry Validation + Period Locking
 *
 * GET    /api/admin/accounting               — list transactions (filter)
 * POST   /api/admin/accounting               — single-entry (backward compat)
 * POST   /api/admin/accounting/journal       — double-entry journal (validated)
 * PATCH  /api/admin/accounting/:id           — update transaction
 * DELETE /api/admin/accounting/:id           — delete transaction
 * GET    /api/admin/accounting/periods       — daftar accounting periods
 * POST   /api/admin/accounting/periods       — buat / buka periode baru
 * PATCH  /api/admin/accounting/periods/:id   — tutup / buka kembali periode
 */

import { Router } from "express";
import {
  db,
  financialTransactions,
  accountingPeriods,
  eq,
  and,
  desc,
  gte,
  lte,
  sql,
} from "@workspace/db";
import { sendAdminError } from "../../lib/adminApiError";

const router = Router();

// ── Helper: cek apakah tanggal jatuh di periode yang sudah ditutup ────────────

async function isInClosedPeriod(date: Date): Promise<boolean> {
  try {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const [period] = await db
      .select({ status: accountingPeriods.status })
      .from(accountingPeriods)
      .where(and(eq(accountingPeriods.year, year), eq(accountingPeriods.month, month)))
      .limit(1);
    return period?.status === "closed";
  } catch {
    return false; // Jika tabel belum ada, anggap semua periode open
  }
}

// ── GET / — list transactions ─────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const { type, from, to } = req.query as {
      type?: string;
      from?: string;
      to?: string;
    };

    const conditions: Parameters<typeof and>[0][] = [];
    if (type && type !== "all") conditions.push(eq(financialTransactions.type, type));
    if (from) conditions.push(gte(financialTransactions.transactionDate, new Date(from)));
    if (to)   conditions.push(lte(financialTransactions.transactionDate, new Date(to)));

    const rows = await db
      .select()
      .from(financialTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(financialTransactions.transactionDate));

    res.json(rows.map(mapRow));
  } catch (err) {
    sendAdminError(res, "GET /api/admin/accounting", err);
  }
});

// ── POST /journal — jurnal double-entry (validated) ───────────────────────────
// Body: { entries: Array<{ accountId?, entryType: "debit"|"credit", amount, type, category, description?, referenceNumber?, transactionDate? }> }
// Validasi: SUM(debit amounts) === SUM(credit amounts)

router.post("/journal", async (req, res) => {
  try {
    const adminId = (req as any).user?.id as string | undefined;
    const { entries } = req.body as {
      entries?: Array<{
        accountId?: string;
        entryType: "debit" | "credit";
        amount: number | string;
        type: string;
        category: string;
        description?: string;
        referenceNumber?: string;
        transactionDate?: string;
      }>;
    };

    if (!Array.isArray(entries) || entries.length < 2) {
      return res.status(400).json({ error: "entries harus berisi minimal 2 baris (debit + kredit)" });
    }

    // Validasi setiap entry
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      const amount = parseFloat(String(entry.amount));
      if (!isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: `amount harus positif pada setiap entri: ${entry.amount}` });
      }
      if (!["debit", "credit"].includes(entry.entryType)) {
        return res.status(400).json({ error: `entryType harus 'debit' atau 'credit', diterima: ${entry.entryType}` });
      }
      if (!entry.type || !entry.category) {
        return res.status(400).json({ error: "type dan category wajib diisi pada setiap entri" });
      }
      if (entry.entryType === "debit") totalDebit += amount;
      else totalCredit += amount;
    }

    // F1-05: Validasi prinsip double-entry — total debit harus = total kredit
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(422).json({
        error: `Prinsip double-entry dilanggar: total debit (${totalDebit}) ≠ total kredit (${totalCredit}). Selisih: ${(totalDebit - totalCredit).toFixed(2)}`,
        totalDebit,
        totalCredit,
      });
    }

    // F1-05: Cek period lock untuk semua entri
    const txDate = entries[0].transactionDate ? new Date(entries[0].transactionDate) : new Date();
    if (await isInClosedPeriod(txDate)) {
      return res.status(409).json({
        error: `Periode akuntansi ${txDate.getUTCMonth() + 1}/${txDate.getUTCFullYear()} sudah ditutup. Hubungi admin untuk membuka kembali.`,
      });
    }

    const now = new Date();
    const rows = entries.map((entry) => ({
      id: crypto.randomUUID(),
      type: entry.type,
      category: entry.category,
      description: entry.description ?? null,
      amount: String(parseFloat(String(entry.amount))),
      transactionDate: entry.transactionDate ? new Date(entry.transactionDate) : now,
      referenceNumber: entry.referenceNumber ?? null,
      recordedBy: adminId ?? null,
      accountId: entry.accountId ?? null,
      entryType: entry.entryType,
      createdAt: now,
    }));

    const created = await db.insert(financialTransactions).values(rows).returning();
    res.status(201).json(created.map(mapRow));
  } catch (err) {
    sendAdminError(res, "POST /api/admin/accounting/journal", err);
  }
});

// ── POST / — single-entry (backward compat) ───────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const adminId = (req as any).user?.id as string | undefined;
    const body = req.body as {
      type: string;
      category: string;
      description?: string;
      amount: number | string;
      transactionDate: string;
      referenceNumber?: string;
      entryType?: string;
    };

    if (!body.type || !body.category || !body.amount) {
      return res.status(400).json({ error: "type, category, and amount are required" });
    }

    const amount = parseFloat(String(body.amount));
    if (!isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    // Validasi entryType jika disertakan
    if (body.entryType && !["debit", "credit"].includes(body.entryType)) {
      return res.status(400).json({ error: "entryType harus 'debit' atau 'credit'" });
    }

    // Cek period lock
    const txDate = body.transactionDate ? new Date(body.transactionDate) : new Date();
    if (await isInClosedPeriod(txDate)) {
      return res.status(409).json({
        error: `Periode akuntansi ${txDate.getUTCMonth() + 1}/${txDate.getUTCFullYear()} sudah ditutup.`,
      });
    }

    const [created] = await db
      .insert(financialTransactions)
      .values({
        id: crypto.randomUUID(),
        type: body.type,
        category: body.category,
        description: body.description ?? null,
        amount: String(amount),
        transactionDate: txDate,
        referenceNumber: body.referenceNumber ?? null,
        recordedBy: adminId ?? null,
        entryType: body.entryType ?? null,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json(mapRow(created));
  } catch (err) {
    sendAdminError(res, "POST /api/admin/accounting", err);
  }
});

// ── PATCH /:id — update transaction ──────────────────────────────────────────

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as {
      type?: string;
      category?: string;
      description?: string;
      amount?: number | string;
      transactionDate?: string;
      referenceNumber?: string;
      entryType?: string;
    };

    if (body.entryType && !["debit", "credit"].includes(body.entryType)) {
      return res.status(400).json({ error: "entryType harus 'debit' atau 'credit'" });
    }

    const setValues: Record<string, unknown> = {};
    if (body.type !== undefined)            setValues.type = body.type;
    if (body.category !== undefined)        setValues.category = body.category;
    if (body.description !== undefined)     setValues.description = body.description ?? null;
    if (body.amount !== undefined) {
      const amount = parseFloat(String(body.amount));
      if (!isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }
      setValues.amount = String(amount);
    }
    if (body.transactionDate !== undefined) {
      const txDate = new Date(body.transactionDate);
      if (await isInClosedPeriod(txDate)) {
        return res.status(409).json({ error: `Periode akuntansi ${txDate.getUTCMonth() + 1}/${txDate.getUTCFullYear()} sudah ditutup.` });
      }
      setValues.transactionDate = txDate;
    }
    if (body.referenceNumber !== undefined) setValues.referenceNumber = body.referenceNumber ?? null;
    if (body.entryType !== undefined)       setValues.entryType = body.entryType ?? null;

    if (Object.keys(setValues).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const [updated] = await db
      .update(financialTransactions)
      .set(setValues)
      .where(eq(financialTransactions.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(mapRow(updated));
  } catch (err) {
    sendAdminError(res, "PATCH /api/admin/accounting/:id", err);
  }
});

// ── DELETE /:id — delete transaction ─────────────────────────────────────────

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Cek period lock sebelum delete
    const [existing] = await db
      .select({ transactionDate: financialTransactions.transactionDate })
      .from(financialTransactions)
      .where(eq(financialTransactions.id, id))
      .limit(1);

    if (existing?.transactionDate && await isInClosedPeriod(existing.transactionDate)) {
      return res.status(409).json({ error: `Tidak dapat menghapus transaksi di periode yang sudah ditutup.` });
    }

    const [deleted] = await db
      .delete(financialTransactions)
      .where(eq(financialTransactions.id, id))
      .returning({ id: financialTransactions.id });

    if (!deleted) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({ ok: true, id: deleted.id });
  } catch (err) {
    sendAdminError(res, "DELETE /api/admin/accounting/:id", err);
  }
});

// ── GET /periods — daftar accounting periods ──────────────────────────────────

router.get("/periods", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(accountingPeriods)
      .orderBy(desc(accountingPeriods.year), desc(accountingPeriods.month));
    res.json(rows);
  } catch (err) {
    sendAdminError(res, "GET /api/admin/accounting/periods", err);
  }
});

// ── POST /periods — buat atau pastikan periode ada ────────────────────────────

router.post("/periods", async (req, res) => {
  try {
    const adminId = (req as any).user?.id as string | undefined;
    const { year, month, notes } = req.body as { year: number; month: number; notes?: string };

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: "year dan month (1-12) wajib diisi" });
    }

    // Upsert: jika sudah ada, kembalikan yang lama; jika belum, buat baru
    const existing = await db
      .select()
      .from(accountingPeriods)
      .where(and(eq(accountingPeriods.year, year), eq(accountingPeriods.month, month)))
      .limit(1);

    if (existing.length > 0) {
      return res.status(200).json(existing[0]);
    }

    const [created] = await db.insert(accountingPeriods).values({
      id: crypto.randomUUID(),
      year,
      month,
      status: "open",
      notes: notes ?? null,
      createdAt: new Date(),
    }).returning();

    res.status(201).json(created);
  } catch (err) {
    sendAdminError(res, "POST /api/admin/accounting/periods", err);
  }
});

// ── PATCH /periods/:id — tutup atau buka kembali periode ─────────────────────

router.patch("/periods/:id", async (req, res) => {
  try {
    const adminId = (req as any).user?.id as string | undefined;
    const { status, notes } = req.body as { status: "open" | "closed"; notes?: string };

    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({ error: "status harus 'open' atau 'closed'" });
    }

    const now = new Date();
    const [updated] = await db
      .update(accountingPeriods)
      .set({
        status,
        notes: notes ?? null,
        ...(status === "closed" ? { closedAt: now, closedBy: adminId ?? null } : { closedAt: null, closedBy: null }),
      })
      .where(eq(accountingPeriods.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Period tidak ditemukan" });
    res.json(updated);
  } catch (err) {
    sendAdminError(res, "PATCH /api/admin/accounting/periods/:id", err);
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────

function mapRow(r: typeof financialTransactions.$inferSelect) {
  return {
    id: r.id,
    type: r.type,
    category: r.category,
    description: r.description,
    amount: r.amount,
    transactionDate: r.transactionDate,
    referenceNumber: r.referenceNumber,
    recordedBy: r.recordedBy,
    accountId: r.accountId,
    entryType: r.entryType,
    createdAt: r.createdAt,
  };
}

export default router;
