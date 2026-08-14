import { resolvePaymentPolicy } from "./paymentPolicyResolver";

type EffectivePolicy = Awaited<ReturnType<typeof resolvePaymentPolicy>>;
type ScheduleItem = {
  sequence: number;
  code: string;
  label: string;
  percentage: number | null;
  amount: number;
  dueDate: string | null;
  daysBeforeDeparture: number | null;
  status: "pending";
};

function numericValue(value: unknown, keys: string[] = []) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value === "object") {
    for (const key of keys) {
      const candidate = (value as Record<string, unknown>)[key];
      if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
      if (typeof candidate === "string" && candidate.trim() !== "" && Number.isFinite(Number(candidate))) return Number(candidate);
    }
  }
  return null;
}

function ruleValue(policy: EffectivePolicy, code: string) {
  return policy.rules.find((rule) => rule.ruleCode === code && rule.isEnabled)?.value;
}

function daysBefore(value: unknown) {
  return numericValue(value, ["daysBeforeDeparture", "days_before_departure", "days", "value"]);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

function dueDateFromDays(departureDate: Date | null, days: number | null) {
  return departureDate && days !== null ? addDays(departureDate, -days) : null;
}

export function snapshotEffectivePaymentPolicy(policy: EffectivePolicy) {
  return {
    packageId: policy.packageId,
    isConfigured: policy.isConfigured,
    capturedAt: new Date().toISOString(),
    globalPolicy: policy.globalPolicy ? {
      id: policy.globalPolicy.id,
      name: policy.globalPolicy.name,
      version: policy.globalPolicy.version,
    } : null,
    packagePolicy: policy.packagePolicy ? {
      id: policy.packagePolicy.id,
      name: policy.packagePolicy.name,
      version: policy.packagePolicy.version,
    } : null,
    rules: policy.rules.map((rule) => ({
      ruleCode: rule.ruleCode,
      ruleType: rule.ruleType,
      value: rule.value,
      currency: rule.currency,
      isEnabled: rule.isEnabled,
      displayOrder: rule.displayOrder,
      displayText: rule.displayText,
    })),
  };
}

export function calculatePaymentSchedule(
  policy: EffectivePolicy,
  totalAmount: number,
  departureDateInput?: string | Date | null,
): ScheduleItem[] {
  if (!policy.isConfigured || totalAmount <= 0) return [];
  const departureDate = departureDateInput ? new Date(departureDateInput) : null;
  const items: ScheduleItem[] = [];
  let allocated = 0;
  const addItem = (code: string, label: string, amount: number, percentage: number | null, days: number | null) => {
    const safeAmount = Math.max(0, Math.min(Math.round(amount), Math.max(0, totalAmount - allocated)));
    if (safeAmount <= 0) return;
    allocated += safeAmount;
    items.push({
      sequence: items.length + 1,
      code,
      label,
      percentage,
      amount: safeAmount,
      dueDate: dueDateFromDays(departureDate, days),
      daysBeforeDeparture: days,
      status: "pending",
    });
  };

  const downPayment = ruleValue(policy, "down_payment");
  const downPercentage = numericValue(downPayment, ["percentage", "percent"]);
  const downFixed = numericValue(downPayment, ["amount", "fixedAmount", "fixed_amount"]);
  if (downPercentage !== null) addItem("down_payment", "Down Payment", totalAmount * downPercentage / 100, downPercentage, daysBefore(downPayment));
  else if (downFixed !== null) addItem("down_payment", "Down Payment", downFixed, null, daysBefore(downPayment));

  const installmentValue = ruleValue(policy, "installment_schedule");
  const installments = Array.isArray(installmentValue)
    ? installmentValue
    : installmentValue && typeof installmentValue === "object" && Array.isArray((installmentValue as any).installments)
      ? (installmentValue as any).installments
      : [];
  for (const installment of installments) {
    const percentage = numericValue(installment, ["percentage", "percent"]);
    const fixed = numericValue(installment, ["amount", "fixedAmount", "fixed_amount"]);
    const days = daysBefore(installment);
    const amount = percentage !== null ? totalAmount * percentage / 100 : (fixed ?? 0);
    addItem("installment", String(installment?.label || `Cicilan ${items.length + 1}`), amount, percentage, days);
  }

  const finalValue = ruleValue(policy, "final_payment_due");
  const finalDays = daysBefore(finalValue);
  if (allocated < totalAmount) {
    addItem("final_payment_due", "Pelunasan", totalAmount - allocated, null, finalDays);
  }
  return items;
}

export async function buildBookingPaymentSnapshots(
  packageId: string | null | undefined,
  totalAmount: number,
  departureDate?: string | Date | null,
) {
  const policy = await resolvePaymentPolicy(packageId ?? undefined);
  return {
    paymentPolicySnapshot: snapshotEffectivePaymentPolicy(policy),
    paymentScheduleSnapshot: calculatePaymentSchedule(policy, totalAmount, departureDate),
  };
}
