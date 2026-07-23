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

const HotelBriefSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    stars: z.number().nullable().optional(),
    city: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const AirlineBriefSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const ExtraHotelItemSchema = z.object({
  id: z.string(),
  hotelId: z.string().optional(),
  label: z.string().nullable().optional(),
  sortOrder: z.number().nullable().optional(),
  hotel: z
    .object({
      name: z.string(),
      stars: z.number().nullable().optional(),
      city: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const PackageDepartureSchema = z.object({
  id: z.string(),
  packageId: z.string().nullable(),
  departureDate: z.string(),
  returnDate: z.string().nullable(),
  quota: z.number(),
  remainingQuota: z.number(),
  status: z.string().nullable(),
  // FASE 1: hotel & maskapai dipindah dari packages ke sini
  hotelMakkahId: z.string().nullable().optional(),
  hotelMadinahId: z.string().nullable().optional(),
  airlineId: z.string().nullable().optional(),
  flightNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  prices: z.array(DeparturePriceSchema),
  // FASE 2: nested hotel/airline objects untuk admin detail view
  hotelMakkah: HotelBriefSchema,
  hotelMadinah: HotelBriefSchema,
  airline: AirlineBriefSchema,
  extraHotels: z.array(ExtraHotelItemSchema).optional(),
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
