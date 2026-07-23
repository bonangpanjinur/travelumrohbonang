import {
  pgTable, text, integer, timestamp, numeric, boolean, doublePrecision,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { packages, packageDepartures } from "./packages";
import { branches } from "./masterdata";
import { masterPilgrims } from "./pilgrims";

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  bookingCode: text("booking_code").notNull(),
  userId: text("user_id"),                  // references auth.users — no local FK
  packageId: text("package_id").references(() => packages.id, { onDelete: "set null" }),
  departureId: text("departure_id").references(() => packageDepartures.id, { onDelete: "set null" }),
  branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
  agentId: text("agent_id"),                // back-ref handled in agents.ts to avoid circular
  picId: text("pic_id"),
  picType: text("pic_type"),
  status: text("status"),
  totalPrice: integer("total_price").notNull(),
  currency: text("currency").notNull(),
  exchangeRate: doublePrecision("exchange_rate").default(1), // rate_to_idr snapshot at booking time
  paymentScheme: text("payment_scheme"),
  notes: text("notes"),
  // Group booking fields
  isGroupBooking: boolean("is_group_booking").notNull().default(false),
  groupName: text("group_name"),            // e.g. "Rombongan Masjid Al-Ikhlas"
  picName: text("pic_name"),                // Group coordinator name
  picPhone: text("pic_phone"),              // Group coordinator phone
  picEmail: text("pic_email"),              // Group coordinator email
  // Pemesan — person who booked (agent, staff, owner); may differ from pilgrims
  pemesanName: text("pemesan_name"),
  pemesanPhone: text("pemesan_phone"),
  pemesanEmail: text("pemesan_email"),
  // Number of seats consumed by this booking (1 for single, N for group)
  paxCount: integer("pax_count").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("uq_bookings_code").on(t.bookingCode),
  index("idx_bookings_user_id").on(t.userId),
  index("idx_bookings_package_id").on(t.packageId),
  index("idx_bookings_departure_id").on(t.departureId),
  index("idx_bookings_agent_id").on(t.agentId),
  index("idx_bookings_status").on(t.status),
]);

export const bookingRooms = pgTable("booking_rooms", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  roomType: text("room_type").notNull(),
  price: numeric("price").notNull(),
  quantity: integer("quantity").notNull(),
  subtotal: numeric("subtotal").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_booking_rooms_booking_id").on(t.bookingId),
]);

export const bookingPilgrims = pgTable("booking_pilgrims", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  // JM-DB01: optional link to master pilgrims table for returning pilgrim tracking
  pilgrimId: text("pilgrim_id").references(() => masterPilgrims.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  gender: text("gender"),
  nik: text("nik"),
  birthDate: text("birth_date"),
  nationality: text("nationality"),
  passportNumber: text("passport_number"),
  passportExpiry: text("passport_expiry"),
  roomType: text("room_type"),
  roomNumber: text("room_number"),
  // O-10: Seat Assignment — kursi pesawat per jemaah
  seatNumber: text("seat_number"),       // misal: 14A
  flightSegment: text("flight_segment"), // misal: MH-1234 (GO) / SV-7654 (RETURN)
  notes: text("notes"),                  // catatan internal per jemaah
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_booking_pilgrims_booking_id").on(t.bookingId),
  index("idx_booking_pilgrims_pilgrim_id").on(t.pilgrimId),
]);

export const pilgrimDocuments = pgTable("pilgrim_documents", {
  id: text("id").primaryKey(),
  pilgrimId: text("pilgrim_id").notNull().references(() => bookingPilgrims.id, { onDelete: "cascade" }),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  status: text("status").notNull().default("pending"),
  fileUrl: text("file_url"),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: text("verified_by"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_pilgrim_docs_pilgrim_id").on(t.pilgrimId),
  index("idx_pilgrim_docs_booking_id").on(t.bookingId),
]);

export const checkIns = pgTable("check_ins", {
  id: text("id").primaryKey(),
  pilgrimId: text("pilgrim_id").notNull().references(() => bookingPilgrims.id, { onDelete: "cascade" }),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  departureId: text("departure_id").references(() => packageDepartures.id, { onDelete: "set null" }),
  location: text("location"),
  notes: text("notes"),
  checkedInBy: text("checked_in_by"),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_check_ins_pilgrim_id").on(t.pilgrimId),
  index("idx_check_ins_booking_id").on(t.bookingId),
]);

// BK-03: Audit trail setiap perubahan status booking
export const bookingStatusLogs = pgTable("booking_status_logs", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedBy: text("changed_by"), // admin user id or "system"
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_booking_status_logs_booking_id").on(t.bookingId),
]);

export const bookingPayments = pgTable("booking_payments", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
  method: text("method"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  proofUrl: text("proof_url"),
  recordedBy: text("recorded_by"),
  isVoided: boolean("is_voided").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_booking_payments_booking_id").on(t.bookingId),
]);
