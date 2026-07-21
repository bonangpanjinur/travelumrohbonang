/**
 * O-9: Visa Tracking — status pengajuan visa per jemaah
 */

import {
  pgTable, text, timestamp, date, index,
} from "drizzle-orm/pg-core";
import { bookings } from "./bookings";
import { bookingPilgrims } from "./bookings";

export const visaApplications = pgTable("visa_applications", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  pilgrimId: text("pilgrim_id").notNull().references(() => bookingPilgrims.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("draft"),
  // draft | submitted | processing | approved | rejected | expired
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  expiryDate: date("expiry_date"),
  rejectionReason: text("rejection_reason"),
  visaNumber: text("visa_number"),
  notes: text("notes"),
  updatedBy: text("updated_by"),   // admin user id who last updated
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
  index("idx_visa_booking_id").on(t.bookingId),
  index("idx_visa_pilgrim_id").on(t.pilgrimId),
  index("idx_visa_status").on(t.status),
]);
