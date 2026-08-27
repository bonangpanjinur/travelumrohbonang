import {
  and,
  asc,
  certificates,
  certificateTemplates,
  bookingPilgrims,
  bookings,
  db,
  eq,
  isNull,
  or,
} from "@workspace/db";

/**
 * Issues one certificate per pilgrim after a booking becomes fully paid.
 * The operation is intentionally idempotent and only creates the default
 * Umroh certificate; Badal Umroh requires an explicit performer name.
 */
export async function autoIssueCertificatesForPaidBooking(bookingId: string): Promise<{ issued: number; skipped: number }> {
  const [booking] = await db
    .select({ id: bookings.id, branchId: bookings.branchId, bookingCode: bookings.bookingCode })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) return { issued: 0, skipped: 0 };

  const [template] = await db
    .select({ id: certificateTemplates.id, design: certificateTemplates.design })
    .from(certificateTemplates)
    .where(and(
      eq(certificateTemplates.certificateType, "umroh"),
      booking.branchId
        ? or(isNull(certificateTemplates.branchId), eq(certificateTemplates.branchId, booking.branchId))
        : isNull(certificateTemplates.branchId),
    ))
    .orderBy(asc(certificateTemplates.branchId), asc(certificateTemplates.createdAt))
    .limit(1);

  const pilgrims = await db
    .select({ id: bookingPilgrims.id, name: bookingPilgrims.name })
    .from(bookingPilgrims)
    .where(eq(bookingPilgrims.bookingId, bookingId));

  if (pilgrims.length === 0) return { issued: 0, skipped: 0 };

  let issued = 0;
  let skipped = 0;
  for (const pilgrim of pilgrims) {
    const [existing] = await db
      .select({ id: certificates.id })
      .from(certificates)
      .where(and(
        eq(certificates.bookingId, bookingId),
        eq(certificates.pilgrimId, pilgrim.id),
        eq(certificates.certificateType, "umroh"),
      ))
      .limit(1);

    if (existing) {
      skipped += 1;
      continue;
    }

    const certificateNumber = `UMR-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await db.insert(certificates).values({
      id: crypto.randomUUID(),
      branchId: booking.branchId,
      templateId: template?.id ?? null,
      bookingId,
      pilgrimId: pilgrim.id,
      certificateType: "umroh",
      certificateNumber,
      recipientName: pilgrim.name,
      performerName: null,
      issuedAt: new Date(),
      payload: {
        bookingCode: booking.bookingCode,
        source: "auto_fully_paid",
        design: template?.design ?? null,
      },
      createdBy: null,
    });
    issued += 1;
  }

  return { issued, skipped };
}
