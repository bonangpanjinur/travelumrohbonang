/**
 * O-11: Pre-departure Checklist Otomatis
 *
 * GET    /api/admin/checklist?departureId=X        — list checklist untuk departure
 * POST   /api/admin/checklist/generate/:departureId — generate checklist standar
 * PATCH  /api/admin/checklist/:id                  — update item (mark done/undone)
 * DELETE /api/admin/checklist/:id                  — hapus item
 * POST   /api/admin/checklist                      — tambah item manual
 */

import { Router } from "express";
import {
  db, departureChecklists, packageDepartures, profiles,
  eq, and, asc, sql,
} from "@workspace/db";
import { sendAdminError } from "../../lib/adminApiError";
import { resolveUserScope } from "../../lib/scopeGuard";

const router = Router();

async function departureScopeCondition(req: any, departureColumn = "departure_checklists.departure_id") {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return sql`TRUE`;
  if (scope.type === "branch" && scope.branchId) {
    return sql`EXISTS (SELECT 1 FROM bookings b WHERE b.departure_id = ${sql.raw(departureColumn)} AND b.branch_id = ${scope.branchId})`;
  }
  if (scope.type === "agent" && scope.agentId) {
    return sql`EXISTS (SELECT 1 FROM bookings b WHERE b.departure_id = ${sql.raw(departureColumn)} AND (b.agent_id = ${scope.agentId} OR (b.pic_type = 'agen' AND b.pic_id = ${scope.agentId})))`;
  }
  return sql`FALSE`;
}

async function canAccessDeparture(req: any, departureId: string) {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return true;
  const rows = await db.execute(sql`
    SELECT 1 FROM bookings b WHERE b.departure_id = ${departureId}
    AND ${scope.type === "branch"
      ? sql`b.branch_id = ${scope.branchId ?? ""}`
      : sql`b.agent_id = ${scope.agentId ?? ""} OR (b.pic_type = 'agen' AND b.pic_id = ${scope.agentId ?? ""})`}
    LIMIT 1
  `);
  return ((rows as any).rows ?? rows).length > 0;
}

async function canAccessChecklist(req: any, checklistId: string) {
  const rows = await db.select({ departureId: departureChecklists.departureId })
    .from(departureChecklists).where(eq(departureChecklists.id, checklistId)).limit(1);
  return rows[0] ? canAccessDeparture(req, rows[0].departureId) : false;
}

// ── Default checklist template ────────────────────────────────────────────────

const CHECKLIST_TEMPLATE = [
  { hMinus: 60, category: "dokumen", item: "Cek kelengkapan paspor semua jemaah (masa berlaku min. 6 bulan)" },
  { hMinus: 60, category: "dokumen", item: "Cek kelengkapan dokumen vaksin / kartu kuning jemaah" },
  { hMinus: 60, category: "dokumen", item: "Pastikan semua jemaah sudah upload foto terbaru" },
  { hMinus: 60, category: "visa", item: "Inisiasi proses pengajuan visa ke KBSA / imigrasi" },
  { hMinus: 30, category: "hotel", item: "Konfirmasi reservasi hotel Makkah & Madinah" },
  { hMinus: 30, category: "hotel", item: "Konfirmasi tiket pesawat (nomor penerbangan, waktu)" },
  { hMinus: 30, category: "keuangan", item: "Cek sisa piutang jemaah — ingatkan yang belum lunas" },
  { hMinus: 30, category: "dokumen", item: "Pastikan semua visa sudah diproses / diajukan" },
  { hMinus: 14, category: "distribusi", item: "Mulai distribusi perlengkapan manasik (koper, baju ihram, dll)" },
  { hMinus: 14, category: "dokumen", item: "Finalisasi manifest keberangkatan" },
  { hMinus: 14, category: "penempatan", item: "Pastikan penempatan kamar hotel sudah selesai" },
  { hMinus: 14, category: "visa", item: "Semua visa jemaah harus sudah approved" },
  { hMinus: 7, category: "briefing", item: "Kirim undangan briefing / manasik ke semua jemaah via WA" },
  { hMinus: 7, category: "keuangan", item: "Final cek cicilan overdue — follow up admin keuangan" },
  { hMinus: 7, category: "penempatan", item: "Konfirmasi penempatan kursi pesawat" },
  { hMinus: 3, category: "transportasi", item: "Konfirmasi armada bus / transportasi ke bandara" },
  { hMinus: 3, category: "checkin", item: "Kirim info check-in bandara ke jemaah (waktu, titik kumpul)" },
  { hMinus: 3, category: "distribusi", item: "Pastikan semua perlengkapan sudah terdistribusi" },
];

// ── GET / — list checklist ────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const { departureId } = req.query as { departureId?: string };

    if (!departureId) {
      return res.status(400).json({ error: "departureId query param required" });
    }

    const rows = await db
      .select({
        id:          departureChecklists.id,
        departureId: departureChecklists.departureId,
        hMinus:      departureChecklists.hMinus,
        category:    departureChecklists.category,
        item:        departureChecklists.item,
        isDone:      departureChecklists.isDone,
        doneBy:      departureChecklists.doneBy,
        doneByName:  profiles.name,
        doneAt:      departureChecklists.doneAt,
        notes:       departureChecklists.notes,
      })
      .from(departureChecklists)
      .leftJoin(profiles, eq(profiles.id, departureChecklists.doneBy))
      .where(and(
        eq(departureChecklists.departureId, departureId),
        await departureScopeCondition(req),
      ))
      .orderBy(asc(departureChecklists.hMinus), asc(departureChecklists.category));

    const doneCount = rows.filter((r: { isDone: boolean | null }) => r.isDone).length;
    res.json({
      data: rows,
      stats: { total: rows.length, done: doneCount, remaining: rows.length - doneCount },
    });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/checklist", err);
  }
});

// ── POST /generate/:departureId — generate checklist standar ─────────────────

router.post("/generate/:departureId", async (req, res) => {
  try {
    const { departureId } = req.params;

    // Check departure exists
    const [dep] = await db
      .select({ id: packageDepartures.id, departureDate: packageDepartures.departureDate })
      .from(packageDepartures)
      .where(eq(packageDepartures.id, departureId));

    if (!dep) return res.status(404).json({ error: "Departure not found" });
    if (!(await canAccessDeparture(req, departureId))) return res.status(403).json({ error: "Akses keberangkatan ditolak" });

    // Insert template items (skip if already exists for this departure)
    let inserted = 0;
    let skipped = 0;

    for (const tmpl of CHECKLIST_TEMPLATE) {
      const existing = await db
        .select({ id: departureChecklists.id })
        .from(departureChecklists)
        .where(and(
          eq(departureChecklists.departureId, departureId),
          eq(departureChecklists.hMinus, tmpl.hMinus),
          eq(departureChecklists.item, tmpl.item),
          await departureScopeCondition(req),
        ));

      if (existing.length > 0) { skipped++; continue; }

      await db.insert(departureChecklists).values({
        id: crypto.randomUUID(),
        departureId,
        hMinus: tmpl.hMinus,
        category: tmpl.category,
        item: tmpl.item,
        isDone: false,
        createdAt: new Date(),
      });
      inserted++;
    }

    res.json({ ok: true, inserted, skipped, total: CHECKLIST_TEMPLATE.length });
  } catch (err) {
    sendAdminError(res, "POST /api/admin/checklist/generate/:departureId", err);
  }
});

// ── POST / — tambah item manual ───────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const { departureId, hMinus, category, item, notes } = req.body;

    if (!departureId || !item) {
      return res.status(400).json({ error: "departureId and item required" });
    }
    if (!(await canAccessDeparture(req, departureId))) return res.status(403).json({ error: "Akses keberangkatan ditolak" });

    const [created] = await db
      .insert(departureChecklists)
      .values({
        id: crypto.randomUUID(),
        departureId,
        hMinus: hMinus ?? 0,
        category: category ?? null,
        item,
        notes: notes ?? null,
        isDone: false,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    sendAdminError(res, "POST /api/admin/checklist", err);
  }
});

// ── PATCH /:id — update item ──────────────────────────────────────────────────

router.patch("/:id", async (req, res) => {
  try {
    const adminId = (req as any).user?.id as string | undefined;
    if (!(await canAccessChecklist(req, req.params.id))) return res.status(403).json({ error: "Akses checklist ditolak" });
    const { isDone, notes, item, hMinus, category } = req.body;

    const patch: Record<string, unknown> = {};
    if (isDone !== undefined) {
      patch.isDone = isDone;
      patch.doneBy = isDone ? (adminId ?? null) : null;
      patch.doneAt = isDone ? new Date() : null;
    }
    if (notes !== undefined) patch.notes = notes;
    if (item !== undefined) patch.item = item;
    if (hMinus !== undefined) patch.hMinus = hMinus;
    if (category !== undefined) patch.category = category;

    if (!Object.keys(patch).length) return res.status(400).json({ error: "No fields to update" });

    const [updated] = await db
      .update(departureChecklists)
      .set(patch)
      .where(eq(departureChecklists.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Checklist item not found" });
    res.json(updated);
  } catch (err) {
    sendAdminError(res, "PATCH /api/admin/checklist/:id", err);
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

router.delete("/:id", async (req, res) => {
  try {
    if (!(await canAccessChecklist(req, req.params.id))) return res.status(403).json({ error: "Akses checklist ditolak" });
    const [deleted] = await db
      .delete(departureChecklists)
      .where(eq(departureChecklists.id, req.params.id))
      .returning({ id: departureChecklists.id });

    if (!deleted) return res.status(404).json({ error: "Checklist item not found" });
    res.json({ ok: true });
  } catch (err) {
    sendAdminError(res, "DELETE /api/admin/checklist/:id", err);
  }
});

export default router;
