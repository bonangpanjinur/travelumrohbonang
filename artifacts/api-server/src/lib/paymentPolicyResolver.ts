import {
  and,
  desc,
  eq,
  inArray,
  paymentPolicies,
  paymentPolicyRules,
  db,
} from "@workspace/db";

export const PAYMENT_RULE_CODES = [
  "down_payment",
  "installment_schedule",
  "final_payment_due",
  "late_payment",
  "cancellation_fee",
  "refund_policy",
  "package_change_fee",
  "payment_methods",
  "payment_proof_deadline",
] as const;

export type PaymentRuleCode = (typeof PAYMENT_RULE_CODES)[number];
export type PaymentRuleInput = {
  ruleCode: string;
  ruleType: string;
  value: unknown;
  currency?: string | null;
  isEnabled?: boolean;
  displayOrder?: number;
  displayText?: string | null;
};

export function validatePaymentRules(rules: PaymentRuleInput[]) {
  const errors: string[] = [];
  const seen = new Set<string>();
  const allowedTypes = new Set([
    "percentage",
    "fixed_amount",
    "days_before_departure",
    "installment",
    "tiered",
    "boolean",
    "text",
  ]);

  for (const rule of rules) {
    const code = String(rule.ruleCode ?? "").trim();
    if (!code) errors.push("ruleCode wajib diisi");
    if (seen.has(code)) errors.push(`Rule duplikat: ${code}`);
    seen.add(code);
    if (!allowedTypes.has(rule.ruleType)) errors.push(`Tipe rule tidak valid: ${code}`);
    if (rule.value === undefined || rule.value === null) errors.push(`Value wajib diisi: ${code}`);
    const valueObject = rule.value && typeof rule.value === "object" && !Array.isArray(rule.value) ? rule.value as Record<string, unknown> : null;
    const percentageValue = typeof rule.value === "number" ? rule.value : valueObject?.percentage;
    const fixedValue = valueObject?.amount;
    if (rule.ruleType === "percentage" && typeof percentageValue === "number" && (percentageValue < 0 || percentageValue > 100)) {
      errors.push(`Persentase harus 0 sampai 100: ${code}`);
    }
    if (rule.ruleType === "fixed_amount" && typeof fixedValue === "number" && fixedValue < 0) {
      errors.push(`Nominal tidak boleh negatif: ${code}`);
    }
    if (rule.ruleType === "tiered") {
      if (!Array.isArray(rule.value) || rule.value.length === 0) errors.push(`Rule bertingkat harus memiliki minimal satu tingkat: ${code}`);
      for (const tier of (Array.isArray(rule.value) ? rule.value : [])) {
        const tierValue = tier && typeof tier === "object" ? (tier as Record<string, unknown>).value : null;
        const tierMode = tier && typeof tier === "object" ? (tier as Record<string, unknown>).mode : null;
        if (typeof tierValue !== "number" || tierValue < 0 || (tierMode === "percentage" && tierValue > 100)) errors.push(`Nilai tier tidak valid: ${code}`);
      }
    }
    if (rule.displayOrder !== undefined && (!Number.isInteger(rule.displayOrder) || rule.displayOrder < 0)) {
      errors.push(`displayOrder tidak valid: ${code}`);
    }
  }

  return errors;
}

function activePolicyRows(packageId?: string) {
  return Promise.all([
    db.select().from(paymentPolicies)
      .where(and(eq(paymentPolicies.scope, "global"), eq(paymentPolicies.status, "active")))
      .orderBy(desc(paymentPolicies.version)),
    packageId
      ? db.select().from(paymentPolicies)
        .where(and(eq(paymentPolicies.scope, "package"), eq(paymentPolicies.packageId, packageId), eq(paymentPolicies.status, "active")))
        .orderBy(desc(paymentPolicies.version))
      : Promise.resolve([]),
  ]);
}

export async function resolvePaymentPolicy(packageId?: string) {
  const [globalPolicies, packagePolicies] = await activePolicyRows(packageId);
  const globalPolicy = globalPolicies[0] ?? null;
  const packagePolicy = packagePolicies[0] ?? null;
  const policies = [globalPolicy, packagePolicy].filter(Boolean) as typeof paymentPolicies.$inferSelect[];
  const ruleRows = policies.length
    ? await db.select().from(paymentPolicyRules).where(inArray(paymentPolicyRules.policyId, policies.map((p) => p.id)))
    : [];

  const byCode = new Map<string, typeof paymentPolicyRules.$inferSelect>();
  if (globalPolicy) {
    for (const rule of ruleRows.filter((r) => r.policyId === globalPolicy.id && r.isEnabled)) {
      byCode.set(rule.ruleCode, rule);
    }
  }
  if (packagePolicy) {
    for (const rule of ruleRows.filter((r) => r.policyId === packagePolicy.id && r.isEnabled)) {
      byCode.set(rule.ruleCode, rule);
    }
  }

  return {
    packageId: packageId ?? null,
    globalPolicy,
    packagePolicy,
    rules: Array.from(byCode.values()).sort((a, b) => a.displayOrder - b.displayOrder),
    isConfigured: Boolean(globalPolicy || packagePolicy),
  };
}
