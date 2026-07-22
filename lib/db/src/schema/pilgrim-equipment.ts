import {
  pgTable, text, timestamp, integer,
  index,
} from "drizzle-orm/pg-core";
import { bookingPilgrims, bookings } from "./bookings";
import { equipment } from "./masterdata";

/**
 * PL-DB01 — Assignment of equipment items to individual pilgrims per booking.
 * status flow: pending → distributed → returned
 */
export const pilgrimEquipment = pgTable("pilgrim_equipment", {
  id: text("id").primaryKey(),
  pilgrimId: text("pilgrim_id").notNull().references(() => bookingPilgrims.id, { onDelete: "cascade" }),
  equipmentId: text("equipment_id").notNull().references(() => equipment.id),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending | distributed | returned
  distributedAt: timestamp("distributed_at", { withTimezone: true }),
  distributedBy: text("distributed_by"),
  returnedAt: timestamp("returned_at", { withTimezone: true }),
  size: text("size"),       // ukuran perlengkapan (S/M/L/XL atau nomor)
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_pilgrim_equipment_pilgrim_id").on(t.pilgrimId),
  index("idx_pilgrim_equipment_booking_id").on(t.bookingId),
  index("idx_pilgrim_equipment_equipment_id").on(t.equipmentId),
]);
