import { Router, Request, Response } from "express";
import { and, db, desc, eq, paymentPolicies, paymentPolicyRules } from "@workspace/db";
import { resolvePaymentPolicy, validatePaymentRules, type PaymentRuleInput } from "../../lib/paymentPolicyResolver";

const router = Router();

function sendError(res: Response, label: string, err: unknown) {
  console.error(`[${label}]`, err);
  return res.status(500).json({ error: "Terjadi kesalahan server" });
}

function normalizeRules(input: unknown): PaymentRuleInput[] {
  return Array.isArray(input) ? input as PaymentRuleInput[] : [];
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const policies = await db.select().from(paymentPolicies).orderBy(desc(paymentPolicies.updatedAt));
    const rules = policies.length
      ? await db.select().from(paymentPolicyRules)
      : [];
    const grouped = new Map<string, typeof paymentPolicyRules.$inferSelect[]>();
    for (const rule of rules) grouped.set(rule.policyId, [...(grouped.get(rule.policyId) ?? []), rule]);
    return res.json(policies.map((policy) => ({ ...policy, rules: grouped.get(policy.id) ?? [] })));
  } catch (err) {
    return sendError(res, "GET /admin/payment-policies", err);
  }
});

router.get("/effective/:packageId", async (req: Request, res: Response) => {
  try {
    return res.json(await resolvePaymentPolicy(String(req.params.packageId)));
  } catch (err) {
    return sendError(res, "GET /admin/payment-policies/effective", err);
  }
});

router.get("/effective", async (_req: Request, res: Response) => {
  try {
    return res.json(await resolvePaymentPolicy());
  } catch (err) {
    return sendError(res, "GET /admin/payment-policies/effective-global", err);
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, scope = "global", packageId, inheritsGlobal = true, rules = [] } = req.body as {
      name?: string;
      scope?: string;
      packageId?: string | null;
      inheritsGlobal?: boolean;
      rules?: PaymentRuleInput[];
    };
    if (!name?.trim()) return res.status(400).json({ error: "name wajib diisi" });
    if (!(["global", "package"] as string[]).includes(scope)) return res.status(400).json({ error: "scope tidak valid" });
    if (scope === "package" && !packageId) return res.status(400).json({ error: "packageId wajib untuk policy paket" });
    const ruleErrors = validatePaymentRules(normalizeRules(rules));
    if (ruleErrors.length) return res.status(400).json({ error: "Rule tidak valid", details: ruleErrors });

    const existing = await db.select({ version: paymentPolicies.version })
      .from(paymentPolicies)
      .where(scope === "global"
        ? eq(paymentPolicies.scope, "global")
        : and(eq(paymentPolicies.scope, "package"), eq(paymentPolicies.packageId, packageId!)))
      .orderBy(desc(paymentPolicies.version));
    const version = (existing[0]?.version ?? 0) + 1;
    const policyId = crypto.randomUUID();
    const created = await db.transaction(async (tx) => {
      const [policy] = await tx.insert(paymentPolicies).values({
        id: policyId,
        name: name.trim(),
        scope,
        packageId: scope === "package" ? packageId! : null,
        inheritsGlobal: Boolean(inheritsGlobal),
        status: "draft",
        version,
        createdBy: (req.user as any)?.id ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      if (rules.length) {
        await tx.insert(paymentPolicyRules).values(normalizeRules(rules).map((rule, index) => ({
          id: crypto.randomUUID(),
          policyId,
          ruleCode: String(rule.ruleCode).trim(),
          ruleType: rule.ruleType,
          value: rule.value,
          currency: rule.currency ?? null,
          isEnabled: rule.isEnabled !== false,
          displayOrder: rule.displayOrder ?? index,
          displayText: rule.displayText ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })));
      }
      return policy;
    });
    return res.status(201).json({ ...created, rules });
  } catch (err) {
    return sendError(res, "POST /admin/payment-policies", err);
  }
});

router.post("/:id/activate", async (req: Request, res: Response) => {
  try {
    const [policy] = await db.select().from(paymentPolicies).where(eq(paymentPolicies.id, String(req.params.id)));
    if (!policy) return res.status(404).json({ error: "Policy tidak ditemukan" });
    const now = new Date();
    const [updated] = await db.transaction(async (tx) => {
      await tx.update(paymentPolicies).set({ status: "archived", updatedAt: now }).where(
        policy.scope === "global"
          ? and(eq(paymentPolicies.scope, "global"), eq(paymentPolicies.status, "active"))
          : and(eq(paymentPolicies.scope, "package"), eq(paymentPolicies.packageId, policy.packageId!), eq(paymentPolicies.status, "active")),
      );
      return tx.update(paymentPolicies).set({
        status: "active",
        approvedBy: (req.user as any)?.id ?? null,
        approvedAt: now,
        effectiveFrom: policy.effectiveFrom ?? now,
        updatedAt: now,
      }).where(eq(paymentPolicies.id, policy.id)).returning();
    });
    return res.json(updated);
  } catch (err) {
    return sendError(res, "POST /admin/payment-policies/:id/activate", err);
  }
});

export default router;
