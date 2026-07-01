import { pgTable, text, integer, timestamp, numeric, boolean } from "drizzle-orm/pg-core";

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  bookingCode: text("booking_code").notNull(),
  userId: text("user_id"),
  packageId: text("package_id"),
  departureId: text("departure_id"),
  branchId: text("branch_id"),
  agentId: text("agent_id"),
  picId: text("pic_id"),
  picType: text("pic_type"),
  status: text("status"),
  totalPrice: integer("total_price").notNull(),
  currency: text("currency").notNull(),
  paymentScheme: text("payment_scheme"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const bookingRooms = pgTable("booking_rooms", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  roomType: text("room_type").notNull(),
  price: numeric("price").notNull(),
  quantity: integer("quantity").notNull(),
  subtotal: numeric("subtotal").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const bookingPilgrims = pgTable("booking_pilgrims", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  gender: text("gender"),
  nik: text("nik"),
  birthDate: text("birth_date"),
  passportNumber: text("passport_number"),
  passportExpiry: text("passport_expiry"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const pilgrimDocuments = pgTable("pilgrim_documents", {
  id: text("id").primaryKey(),
  pilgrimId: text("pilgrim_id").notNull(),
  bookingId: text("booking_id").notNull(),
  documentType: text("document_type").notNull(), // "passport" | "visa" | "health_certificate" | "mahram_letter" | "ktp" | "photo"
  status: text("status").notNull().default("pending"), // "pending" | "submitted" | "verified" | "rejected"
  fileUrl: text("file_url"),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: text("verified_by"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const bookingPayments = pgTable("booking_payments", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  type: text("type").notNull(), // "dp" | "installment" | "settlement"
  amount: integer("amount").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
  method: text("method"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  isVoided: boolean("is_voided").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
