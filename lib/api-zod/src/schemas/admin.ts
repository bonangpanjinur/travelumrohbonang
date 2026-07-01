import { z } from "zod";

export const AdminCreatePackageRequest = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  durationDays: z.number().int().positive().optional(),
  packageType: z.string().optional(),
  categoryId: z.string().optional(),
  minimumDp: z.number().int().nonnegative().optional(),
  dpDeadlineDays: z.number().int().nonnegative().optional(),
  fullDeadlineDays: z.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true),
});

export const AdminUpdatePackageRequest = AdminCreatePackageRequest.partial();

export const AdminUpdateBookingStatusRequest = z.object({
  status: z.enum(["draft", "pending", "confirmed", "cancelled", "completed"]),
  notes: z.string().optional(),
});

export const AdminUpdateUserRequest = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  branchId: z.string().optional(),
});

export const AdminCreateDepartureRequest = z.object({
  departureDate: z.string().min(1),
  returnDate: z.string().optional(),
  quota: z.number().int().positive(),
  remainingQuota: z.number().int().nonnegative().optional(),
  status: z.enum(["open", "full", "cancelled"]).default("open"),
  muthawifId: z.string().optional(),
});

export const AdminUpdateDepartureRequest = AdminCreateDepartureRequest.partial();

export const AdminCreateDeparturePriceRequest = z.object({
  roomType: z.string().min(1),
  price: z.number().int().nonnegative(),
});

export const AdminUpdateDeparturePriceRequest = AdminCreateDeparturePriceRequest.partial();

export const AdminRecordPaymentRequest = z.object({
  type: z.enum(["dp", "installment", "settlement"]),
  amount: z.number().int().positive(),
  paidAt: z.string().min(1),
  method: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const AdminUpdatePaymentRequest = AdminRecordPaymentRequest.partial();

export const BookingPaymentSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  type: z.string(),
  amount: z.number(),
  paidAt: z.union([z.string(), z.date()]).transform((v) =>
    v instanceof Date ? v.toISOString() : v,
  ),
  method: z.string().nullable().optional(),
  referenceNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  recordedBy: z.string().nullable().optional(),
  isVoided: z.boolean(),
  createdAt: z.union([z.string(), z.date()]).nullable().optional().transform((v) =>
    v instanceof Date ? v.toISOString() : (v ?? null),
  ),
});

export const BookingPaymentSummarySchema = z.object({
  totalPrice: z.number(),
  totalPaid: z.number(),
  remaining: z.number(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]),
  payments: z.array(BookingPaymentSchema),
});

export type AdminCreatePackageInput = z.infer<typeof AdminCreatePackageRequest>;
export type AdminUpdatePackageInput = z.infer<typeof AdminUpdatePackageRequest>;
export type AdminUpdateBookingStatusInput = z.infer<typeof AdminUpdateBookingStatusRequest>;
export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserRequest>;
export type AdminCreateDepartureInput = z.infer<typeof AdminCreateDepartureRequest>;
export type AdminUpdateDepartureInput = z.infer<typeof AdminUpdateDepartureRequest>;
export type AdminCreateDeparturePriceInput = z.infer<typeof AdminCreateDeparturePriceRequest>;
export type AdminUpdateDeparturePriceInput = z.infer<typeof AdminUpdateDeparturePriceRequest>;
export type AdminRecordPaymentInput = z.infer<typeof AdminRecordPaymentRequest>;
export type AdminUpdatePaymentInput = z.infer<typeof AdminUpdatePaymentRequest>;

export const REQUIRED_DOCUMENT_TYPES = ["passport", "visa", "health_certificate", "mahram_letter"] as const;
export const ALL_DOCUMENT_TYPES = [...REQUIRED_DOCUMENT_TYPES, "ktp", "photo"] as const;
export type DocumentType = (typeof ALL_DOCUMENT_TYPES)[number];

export const AdminUpsertDocumentRequest = z.object({
  status: z.enum(["pending", "submitted", "verified", "rejected"]),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
  submittedAt: z.string().optional(),
});

export const PilgrimDocumentSchema = z.object({
  id: z.string(),
  pilgrimId: z.string(),
  bookingId: z.string(),
  documentType: z.string(),
  status: z.string(),
  fileUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  submittedAt: z.union([z.string(), z.date()]).nullable().optional().transform((v) =>
    v instanceof Date ? v.toISOString() : (v ?? null),
  ),
  verifiedAt: z.union([z.string(), z.date()]).nullable().optional().transform((v) =>
    v instanceof Date ? v.toISOString() : (v ?? null),
  ),
  verifiedBy: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).nullable().optional().transform((v) =>
    v instanceof Date ? v.toISOString() : (v ?? null),
  ),
});

export const PilgrimChecklistSchema = z.object({
  pilgrimId: z.string(),
  pilgrimName: z.string(),
  completionPct: z.number(),
  documents: z.array(PilgrimDocumentSchema),
});

export const BookingDocumentChecklistSchema = z.object({
  bookingId: z.string(),
  overallCompletionPct: z.number(),
  totalPilgrims: z.number(),
  fullyCompletedPilgrims: z.number(),
  pilgrims: z.array(PilgrimChecklistSchema),
});

export type AdminUpsertDocumentInput = z.infer<typeof AdminUpsertDocumentRequest>;
