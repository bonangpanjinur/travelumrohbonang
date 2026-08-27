import { z } from "zod";

export const BookingSchema = z.object({
  id: z.string(),
  bookingCode: z.string(),
  userId: z.string().nullable(),
  packageId: z.string().nullable(),
  departureId: z.string().nullable(),
  branchId: z.string().nullable(),
  status: z.string().nullable(),
  approvedAt: z.coerce.date().nullable().optional(),
  approvalExpiresAt: z.coerce.date().nullable().optional(),
  totalPrice: z.number().positive(),
  currency: z.string(),
  paymentScheme: z.string().nullable(),
  policyAcceptedAt: z.coerce.date().nullable().optional(),
  policyAcceptedVersion: z.string().nullable().optional(),
  invoicePreferences: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: z.string().nullable(),
  // Group booking fields
  isGroupBooking: z.boolean().default(false),
  groupName: z.string().nullable().optional(),
  picName: z.string().nullable().optional(),
  picPhone: z.string().nullable().optional(),
  picEmail: z.string().nullable().optional(),
  createdAt: z.coerce.date().nullable(),
});

const BookingRoomSelection = z.object({
  roomType: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const CreateBookingRequest = z.object({
  packageId: z.string(),
  departureId: z.string(),
  // Deprecated client hint; backend calculates the authoritative total from rooms.
  totalPrice: z.number().positive().optional(),
  rooms: z.array(BookingRoomSelection).min(1),
  currency: z.string().default("IDR"),
  paymentScheme: z.string().optional(),
  policyAccepted: z.boolean().optional(),
  invoicePreferences: z.object({
    digital: z.boolean().default(true),
    email: z.boolean().default(false),
    whatsapp: z.boolean().default(false),
    includePaymentPolicy: z.boolean().default(true),
    includePaymentSchedule: z.boolean().default(true),
    includePilgrims: z.boolean().default(true),
  }).optional(),
  idempotencyKey: z.string().max(100).optional(),
  notes: z.string().optional(),
  picType: z.string().optional(),
  picId: z.string().optional(),
  agentId: z.string().optional(),
  redeemPoints: z.number().int().positive().optional(),
  // Group booking
  isGroupBooking: z.boolean().optional(),
  groupName: z.string().max(200).optional(),
  picName: z.string().max(100).optional(),
  picPhone: z.string().max(30).optional(),
  picEmail: z.string().email().optional(),
});

export const BookingWithDetailsSchema = BookingSchema.extend({
  packageTitle: z.string().nullable(),
  packageSlug: z.string().nullable(),
  departureDate: z.string().nullable(),
  returnDate: z.string().nullable().optional(),
  minimumDp: z.number().nullable().optional(),
  dpDeadlineDays: z.number().nullable().optional(),
  fullDeadlineDays: z.number().nullable().optional(),
});

export const BookingListResponse = z.object({
  data: z.array(BookingWithDetailsSchema),
  total: z.number(),
});

export const BookingRoomSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  roomType: z.string(),
  price: z.union([z.string(), z.number()]),
  quantity: z.number(),
  subtotal: z.union([z.string(), z.number()]),
});

export const CreateBookingRoomItem = z.object({
  roomType: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  subtotal: z.number().positive(),
});

export const CreateBookingRoomsRequest = z.object({
  rooms: z.array(CreateBookingRoomItem).min(1),
});

export const BookingPilgrimSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  gender: z.string().nullable(),
  nik: z.string().nullable(),
  birthDate: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  passportNumber: z.string().nullable().optional(),
  passportExpiry: z.string().nullable().optional(),
  roomType: z.string().nullable().optional(),
  roomNumber: z.string().nullable().optional(),
});

export const CreateBookingPilgrimItem = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  gender: z.enum(["male", "female"]),
  nik: z.string().optional(),
  birthDate: z.string().optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
});

export const CreateBookingPilgrimsRequest = z.object({
  pilgrims: z.array(CreateBookingPilgrimItem).min(1),
});

export type Booking = z.infer<typeof BookingSchema>;
export type CreateBookingInput = z.infer<typeof CreateBookingRequest>;
export type BookingRoom = z.infer<typeof BookingRoomSchema>;
export type BookingPilgrim = z.infer<typeof BookingPilgrimSchema>;
