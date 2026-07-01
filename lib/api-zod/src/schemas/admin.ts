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

export type AdminCreatePackageInput = z.infer<typeof AdminCreatePackageRequest>;
export type AdminUpdatePackageInput = z.infer<typeof AdminUpdatePackageRequest>;
export type AdminUpdateBookingStatusInput = z.infer<typeof AdminUpdateBookingStatusRequest>;
export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserRequest>;
