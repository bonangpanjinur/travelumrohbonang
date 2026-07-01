import { pgTable, text, integer, timestamp, numeric } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at", { withTimezone: true }),
});
