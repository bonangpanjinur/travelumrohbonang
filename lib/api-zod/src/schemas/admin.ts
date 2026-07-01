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

export type AdminCreatePackageInput = z.infer<typeof AdminCreatePackageRequest>;
export type AdminUpdatePackageInput = z.infer<typeof AdminUpdatePackageRequest>;
export type AdminUpdateBookingStatusInput = z.infer<typeof AdminUpdateBookingStatusRequest>;
export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserRequest>;
export type AdminCreateDepartureInput = z.infer<typeof AdminCreateDepartureRequest>;
export type AdminUpdateDepartureInput = z.infer<typeof AdminUpdateDepartureRequest>;
export type AdminCreateDeparturePriceInput = z.infer<typeof AdminCreateDeparturePriceRequest>;
export type AdminUpdateDeparturePriceInput = z.infer<typeof AdminUpdateDeparturePriceRequest>;
