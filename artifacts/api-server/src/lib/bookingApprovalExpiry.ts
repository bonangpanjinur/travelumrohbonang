const DEFAULT_APPROVAL_EXPIRY_HOURS = 24;

export function getApprovalExpiryHours(): number {
  const configured = Number(process.env.BOOKING_APPROVAL_EXPIRY_HOURS);
  if (!Number.isFinite(configured) || configured <= 0 || configured > 720) {
    return DEFAULT_APPROVAL_EXPIRY_HOURS;
  }
  return configured;
}

export function getApprovalExpiryDate(approvedAt = new Date()): Date {
  return new Date(approvedAt.getTime() + getApprovalExpiryHours() * 60 * 60 * 1000);
}
