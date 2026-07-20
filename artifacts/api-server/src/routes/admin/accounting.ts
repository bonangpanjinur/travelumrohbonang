/**
 * K-02 FIX: Admin Accounting Routes
 *
 * Replaces the direct Supabase client calls in Accounting.tsx with proper
 * api-server endpoints. All financial_transactions CRUD goes through here.
 *
 * GET    /api/admin/accounting          — list transactions (type/category/date filters)
 * POST   /api/admin/accounting          — create transaction
 * PATCH  /api/admin/accounting/:id      — update transaction
 * DELETE /api/admin/accounting/:id      — delete transaction
 */

import { Router } from "express";
import {
  db,
  financialTransactions,
  eq,
  and,
  desc,
  gte,
  lte,
  sql,
} from "@workspace/db";
import { sendAdminError } from "../../lib/adminApiError";

const router = Router();

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

    // Return camelCase to frontend (consistent with rest of api-server)
    res.json(rows.map(mapRow));
  } catch (err) {
    sendAdminError(res, "GET /api/admin/accounting", err);
  }
});

// ── POST / — create transaction ───────────────────────────────────────────────

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
    };

    if (!body.type || !body.category || !body.amount) {
      return res.status(400).json({ error: "type, category, and amount are required" });
    }

    const amount = parseFloat(String(body.amount));
    if (!isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const [created] = await db
      .insert(financialTransactions)
      .values({
        id: crypto.randomUUID(),
        type: body.type,
        category: body.category,
        description: body.description ?? null,
        amount: String(amount),
        transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
        referenceNumber: body.referenceNumber ?? null,
        recordedBy: adminId ?? null,
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
    };

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
    if (body.transactionDate !== undefined) setValues.transactionDate = new Date(body.transactionDate);
    if (body.referenceNumber !== undefined) setValues.referenceNumber = body.referenceNumber ?? null;

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
    createdAt: r.createdAt,
  };
}

export default router;
