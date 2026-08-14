import { jsonb, pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { bookings, bookingPilgrims } from "./bookings";
import { branches } from "./masterdata";

export const certificateTemplates = pgTable("certificate_templates", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  certificateType: text("certificate_type").notNull().default("umroh"),
  design: jsonb("design").notNull().default({}),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_certificate_templates_branch_id").on(t.branchId),
  index("idx_certificate_templates_type").on(t.certificateType),
]);

export const certificates = pgTable("certificates", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
  templateId: text("template_id").references(() => certificateTemplates.id, { onDelete: "set null" }),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  pilgrimId: text("pilgrim_id").notNull().references(() => bookingPilgrims.id, { onDelete: "cascade" }),
  certificateType: text("certificate_type").notNull().default("umroh"),
  certificateNumber: text("certificate_number").notNull(),
  recipientName: text("recipient_name").notNull(),
  performerName: text("performer_name"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").notNull().default({}),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_certificates_branch_id").on(t.branchId),
  index("idx_certificates_booking_id").on(t.bookingId),
  index("idx_certificates_pilgrim_id").on(t.pilgrimId),
]);
