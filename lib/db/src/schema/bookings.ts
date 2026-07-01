import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

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
