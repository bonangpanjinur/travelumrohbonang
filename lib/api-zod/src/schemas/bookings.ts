import { z } from "zod";

export const BookingSchema = z.object({
  id: z.string(),
  bookingCode: z.string(),
  userId: z.string().nullable(),
  packageId: z.string().nullable(),
  departureId: z.string().nullable(),
  branchId: z.string().nullable(),
  status: z.string().nullable(),
  totalPrice: z.number(),
  currency: z.string(),
  paymentScheme: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
});

export const CreateBookingRequest = z.object({
  packageId: z.string(),
  departureId: z.string(),
  totalPrice: z.number().positive(),
  currency: z.string().default("IDR"),
  paymentScheme: z.string().optional(),
  notes: z.string().optional(),
  picType: z.string().optional(),
  picId: z.string().optional(),
  agentId: z.string().optional(),
});

export const BookingWithDetailsSchema = BookingSchema.extend({
  packageTitle: z.string().nullable(),
  packageSlug: z.string().nullable(),
  departureDate: z.string().nullable(),
});

export const BookingListResponse = z.object({
  data: z.array(BookingWithDetailsSchema),
  total: z.number(),
});

export type Booking = z.infer<typeof BookingSchema>;
export type CreateBookingInput = z.infer<typeof CreateBookingRequest>;
