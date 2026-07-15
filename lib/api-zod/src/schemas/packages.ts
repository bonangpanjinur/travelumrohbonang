import { z } from "zod";

export const PackageSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  durationDays: z.number().nullable(),
  packageType: z.string().nullable(),
  categoryId: z.string().nullable(),
  isActive: z.boolean().nullable(),
  minimumDp: z.number().nullable(),
  dpDeadlineDays: z.number().nullable(),
  fullDeadlineDays: z.number().nullable(),
  createdAt: z.coerce.date().nullable(),
});

export const DeparturePriceSchema = z.object({
  id: z.string(),
  departureId: z.string().nullable(),
  roomType: z.string(),
  price: z.number(),
});

export const PackageDepartureSchema = z.object({
  id: z.string(),
  packageId: z.string().nullable(),
  departureDate: z.string(),
  returnDate: z.string().nullable(),
  quota: z.number(),
  remainingQuota: z.number(),
  status: z.string().nullable(),
  prices: z.array(DeparturePriceSchema),
});

export const PackageDetailSchema = PackageSchema.extend({
  departures: z.array(PackageDepartureSchema),
});

export const PackageListResponse = z.object({
  data: z.array(PackageSchema),
  total: z.number(),
});

export type Package = z.infer<typeof PackageSchema>;
export type PackageDeparture = z.infer<typeof PackageDepartureSchema>;
export type DeparturePrice = z.infer<typeof DeparturePriceSchema>;
export type PackageDetail = z.infer<typeof PackageDetailSchema>;
