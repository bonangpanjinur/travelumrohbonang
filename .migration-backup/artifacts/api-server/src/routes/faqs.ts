import { Router } from "express";
import { db, faqs, eq } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { scope, scopes, package_id } = req.query;

    let rows = await db
      .select()
      .from(faqs)
      .where(eq(faqs.isActive, true));

    const scopeList: string[] = [];
    if (scopes && typeof scopes === "string") scopeList.push(...scopes.split(","));
    else if (scope && typeof scope === "string") scopeList.push(scope);

    if (scopeList.length > 0) {
      rows = rows.filter(
        (r) =>
          scopeList.includes(r.scope ?? "") ||
          (package_id && r.packageId === package_id),
      );
    }

    const result = rows
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((r) => ({
        id: r.id,
        question: r.question,
        answer: r.answer,
        scope: r.scope,
        package_id: r.packageId,
        sort_order: r.sortOrder,
      }));

    res.json({ data: result });
  } catch (err: any) {
    console.error("[GET /api/faqs] failed:", err);
    res.status(500).json({
      error: "Failed to fetch FAQs",
      message: process.env.NODE_ENV === "development" ? err?.message : undefined,
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    });
  }
});

export default router;
