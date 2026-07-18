import {
  pgTable, text, timestamp,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * JM-DB01 — Master table for unique pilgrims (across multiple bookings).
 * booking_pilgrims.pilgrim_id FK references this table when a pilgrim is
 * matched or auto-created on booking confirmation.
 */
export const masterPilgrims = pgTable("pilgrims", {
  id: text("id").primaryKey(),
  nik: text("nik"),
  passportNumber: text("passport_number"),
  name: text("name").notNull(),
  birthDate: text("birth_date"),
  nationality: text("nationality").default("WNI"),
  phone: text("phone"),
  email: text("email"),
  gender: text("gender"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex("uq_pilgrims_nik").on(t.nik),
  uniqueIndex("uq_pilgrims_passport").on(t.passportNumber),
  index("idx_pilgrims_name").on(t.name),
]);
