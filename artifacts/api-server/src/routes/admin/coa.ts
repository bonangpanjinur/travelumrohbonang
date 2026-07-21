/**
 * F-7: Chart of Accounts (CoA) + Buku Besar + Trial Balance
 *
 * GET    /api/admin/coa                     — list all accounts
 * POST   /api/admin/coa                     — create account
 * PATCH  /api/admin/coa/:id                 — update account
 * DELETE /api/admin/coa/:id                 — delete account (hanya jika belum dipakai)
 * POST   /api/admin/coa/seed                — seed akun standar
 * GET    /api/admin/coa/ledger              — buku besar (transaksi per akun)
 * GET    /api/admin/coa/trial-balance       — trial balance (saldo debit/kredit per akun)
 */

import { Router } from "express";
import {
  db, chartOfAccounts, financialTransactions,
  eq, and, gte, lte, desc, asc, sql, isNull,
} from "@workspace/db";
import { sendAdminError } from "../../lib/adminApiError";

const router = Router();

// ── GET / — list all CoA ─────────────────────────────────────────────────────

router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(chartOfAccounts)
      .orderBy(asc(chartOfAccounts.code));
    res.json(rows);
  } catch (err) {
    sendAdminError(res, "GET /api/admin/coa", err);
  }
});

// ── POST / — create account ───────────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const { code, name, type, category, normalBalance, description, sortOrder } = req.body as {
      code: string; name: string; type: string; category?: string;
      normalBalance?: string; description?: string; sortOrder?: number;
    };

    if (!code || !name || !type) {
      return res.status(400).json({ error: "code, name, type are required" });
    }

    const nb = normalBalance ?? (["asset", "expense"].includes(type) ? "debit" : "credit");

    const [created] = await db
      .insert(chartOfAccounts)
      .values({
        id: crypto.randomUUID(),
        code, name, type, category: category ?? null,
        normalBalance: nb,
        description: description ?? null,
        sortOrder: sortOrder ?? 0,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Kode akun sudah ada" });
    sendAdminError(res, "POST /api/admin/coa", err);
  }
});

// ── PATCH /:id — update account ───────────────────────────────────────────────

router.patch("/:id", async (req, res) => {
  try {
    const { name, category, description, isActive, sortOrder } = req.body;
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (category !== undefined) patch.category = category;
    if (description !== undefined) patch.description = description;
    if (isActive !== undefined) patch.isActive = isActive;
    if (sortOrder !== undefined) patch.sortOrder = sortOrder;

    if (!Object.keys(patch).length) return res.status(400).json({ error: "No fields to update" });

    const [updated] = await db
      .update(chartOfAccounts)
      .set(patch)
      .where(eq(chartOfAccounts.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Account not found" });
    res.json(updated);
  } catch (err) {
    sendAdminError(res, "PATCH /api/admin/coa/:id", err);
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Check if account is used in any transaction
    const [usage] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(financialTransactions)
      .where(eq(financialTransactions.accountId, id));

    if ((usage?.cnt ?? 0) > 0) {
      return res.status(409).json({ error: "Akun sudah digunakan dalam transaksi, tidak dapat dihapus" });
    }

    const [deleted] = await db
      .delete(chartOfAccounts)
      .where(eq(chartOfAccounts.id, id))
      .returning({ id: chartOfAccounts.id });

    if (!deleted) return res.status(404).json({ error: "Account not found" });
    res.json({ ok: true });
  } catch (err) {
    sendAdminError(res, "DELETE /api/admin/coa/:id", err);
  }
});

// ── POST /seed — seed akun standar ───────────────────────────────────────────

router.post("/seed", async (_req, res) => {
  try {
    const SEED_ACCOUNTS = [
      // ASSET
      { code: "1-1101", name: "Kas", type: "asset", category: "kas-bank", normalBalance: "debit" },
      { code: "1-1102", name: "Rekening Bank BCA", type: "asset", category: "kas-bank", normalBalance: "debit" },
      { code: "1-1103", name: "Rekening Bank Mandiri", type: "asset", category: "kas-bank", normalBalance: "debit" },
      { code: "1-1201", name: "Piutang Jemaah", type: "asset", category: "piutang", normalBalance: "debit" },
      { code: "1-1202", name: "Piutang Lain-lain", type: "asset", category: "piutang", normalBalance: "debit" },
      { code: "1-1301", name: "Perlengkapan Manasik (Stok)", type: "asset", category: "persediaan", normalBalance: "debit" },
      { code: "1-2101", name: "Aset Tetap - Inventaris Kantor", type: "asset", category: "aset-tetap", normalBalance: "debit" },
      // LIABILITY
      { code: "2-1101", name: "Hutang Usaha", type: "liability", category: "utang-jangka-pendek", normalBalance: "credit" },
      { code: "2-1102", name: "Uang Muka Jemaah (DP)", type: "liability", category: "utang-jangka-pendek", normalBalance: "credit" },
      { code: "2-1103", name: "Tabungan Umroh Jemaah", type: "liability", category: "utang-jangka-pendek", normalBalance: "credit" },
      { code: "2-1104", name: "Hutang PPN", type: "liability", category: "pajak", normalBalance: "credit" },
      { code: "2-1105", name: "Hutang PPh 23", type: "liability", category: "pajak", normalBalance: "credit" },
      // EQUITY
      { code: "3-1101", name: "Modal Usaha", type: "equity", category: "modal", normalBalance: "credit" },
      { code: "3-1102", name: "Laba Ditahan", type: "equity", category: "modal", normalBalance: "credit" },
      // REVENUE
      { code: "4-1001", name: "Pendapatan Paket Umroh", type: "revenue", category: "pendapatan-utama", normalBalance: "credit" },
      { code: "4-1002", name: "Pendapatan DP / Cicilan", type: "revenue", category: "pendapatan-utama", normalBalance: "credit" },
      { code: "4-1003", name: "Pendapatan Komisi Agen", type: "revenue", category: "pendapatan-lain", normalBalance: "credit" },
      { code: "4-1004", name: "Pendapatan Lain-lain", type: "revenue", category: "pendapatan-lain", normalBalance: "credit" },
      // EXPENSE
      { code: "5-1001", name: "HPP - Tiket Pesawat", type: "expense", category: "hpp", normalBalance: "debit" },
      { code: "5-1002", name: "HPP - Hotel Makkah", type: "expense", category: "hpp", normalBalance: "debit" },
      { code: "5-1003", name: "HPP - Hotel Madinah", type: "expense", category: "hpp", normalBalance: "debit" },
      { code: "5-1004", name: "HPP - Visa", type: "expense", category: "hpp", normalBalance: "debit" },
      { code: "5-1005", name: "HPP - Handling & Transportasi", type: "expense", category: "hpp", normalBalance: "debit" },
      { code: "5-1006", name: "HPP - Perlengkapan Manasik", type: "expense", category: "hpp", normalBalance: "debit" },
      { code: "5-2001", name: "Biaya Operasional Kantor", type: "expense", category: "operasional", normalBalance: "debit" },
      { code: "5-2002", name: "Biaya Gaji & THR", type: "expense", category: "operasional", normalBalance: "debit" },
      { code: "5-2003", name: "Biaya Marketing & Iklan", type: "expense", category: "operasional", normalBalance: "debit" },
      { code: "5-2004", name: "Komisi Agen & Referral", type: "expense", category: "operasional", normalBalance: "debit" },
      { code: "5-3001", name: "Biaya Pajak PPN", type: "expense", category: "pajak", normalBalance: "debit" },
      { code: "5-3002", name: "Biaya Pajak PPh", type: "expense", category: "pajak", normalBalance: "debit" },
    ];

    let inserted = 0;
    let skipped = 0;
    for (const acct of SEED_ACCOUNTS) {
      try {
        await db.insert(chartOfAccounts).values({
          id: crypto.randomUUID(),
          sortOrder: 0,
          createdAt: new Date(),
          isActive: true,
          ...acct,
          description: null,
          category: acct.category ?? null,
        });
        inserted++;
      } catch (e: any) {
        if (e?.code === "23505") { skipped++; continue; }
        throw e;
      }
    }

    res.json({ ok: true, inserted, skipped, total: SEED_ACCOUNTS.length });
  } catch (err) {
    sendAdminError(res, "POST /api/admin/coa/seed", err);
  }
});

// ── GET /ledger — Buku Besar (transaksi per akun) ────────────────────────────

router.get("/ledger", async (req, res) => {
  try {
    const { accountId, from, to } = req.query as {
      accountId?: string; from?: string; to?: string;
    };

    if (!accountId) {
      return res.status(400).json({ error: "accountId query param required" });
    }

    const conditions: Parameters<typeof and>[0][] = [
      eq(financialTransactions.accountId, accountId),
    ];
    if (from) conditions.push(gte(financialTransactions.transactionDate, new Date(from)));
    if (to) conditions.push(lte(financialTransactions.transactionDate, new Date(to)));

    const rows = await db
      .select()
      .from(financialTransactions)
      .where(and(...conditions))
      .orderBy(asc(financialTransactions.transactionDate));

    // Compute running balance
    let runningBalance = 0;
    const withBalance = rows.map((r) => {
      const amt = parseFloat(String(r.amount));
      const isDebit = r.entryType === "debit";
      runningBalance += isDebit ? amt : -amt;
      return { ...r, runningBalance };
    });

    res.json(withBalance);
  } catch (err) {
    sendAdminError(res, "GET /api/admin/coa/ledger", err);
  }
});

// ── GET /trial-balance — Trial Balance ───────────────────────────────────────

router.get("/trial-balance", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    const conditions: Parameters<typeof and>[0][] = [];
    if (from) conditions.push(gte(financialTransactions.transactionDate, new Date(from)));
    if (to) conditions.push(lte(financialTransactions.transactionDate, new Date(to)));

    // Aggregate debit and credit sums per account
    const txAgg = await db
      .select({
        accountId: financialTransactions.accountId,
        totalDebit: sql<string>`COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END), 0)`,
      })
      .from(financialTransactions)
      .where(
        conditions.length > 0
          ? and(...conditions)
          : sql`TRUE`
      )
      .groupBy(financialTransactions.accountId);

    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.isActive, true))
      .orderBy(asc(chartOfAccounts.code));

    const aggMap = new Map(txAgg.map((r) => [r.accountId, r]));

    const rows = accounts.map((acct) => {
      const agg = aggMap.get(acct.id);
      const debit = parseFloat(agg?.totalDebit ?? "0");
      const credit = parseFloat(agg?.totalCredit ?? "0");
      const balance = acct.normalBalance === "debit" ? debit - credit : credit - debit;
      return {
        id: acct.id,
        code: acct.code,
        name: acct.name,
        type: acct.type,
        category: acct.category,
        normalBalance: acct.normalBalance,
        totalDebit: debit,
        totalCredit: credit,
        balance,
      };
    });

    const totalDebit = rows.reduce((s, r) => s + r.totalDebit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.totalCredit, 0);

    res.json({ rows, totalDebit, totalCredit });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/coa/trial-balance", err);
  }
});

export default router;
