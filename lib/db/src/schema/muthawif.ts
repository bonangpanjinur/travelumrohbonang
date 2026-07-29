import {
  pgTable, text, timestamp, index,
} from "drizzle-orm/pg-core";
import { muthawifs } from "./masterdata";
import { packageDepartures } from "./packages";

/**
 * Sprint 4A — Muthawif daily field reports.
 * Each row represents one report submitted by a muthawif for a given day and departure.
 */
export const muthawifDailyReports = pgTable("muthawif_daily_reports", {
  id: text("id").primaryKey(),
  muthawifId: text("muthawif_id")
    .notNull()
    .references(() => muthawifs.id, { onDelete: "cascade" }),
  departureId: text("departure_id")
    .notNull()
    .references(() => packageDepartures.id, { onDelete: "cascade" }),
  reportDate: text("report_date").notNull(),            // YYYY-MM-DD
  location: text("location"),                           // e.g. "Makkah", "Madinah", "Transit"
  groupCondition: text("group_condition"),              // e.g. "baik", "sedang", "butuh_perhatian"
  content: text("content"),                             // free-form report body
  notes: text("notes"),                                 // internal notes
  status: text("status").notNull().default("submitted"),// draft | submitted
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
  index("idx_muthawif_daily_reports_muthawif_id").on(t.muthawifId),
  index("idx_muthawif_daily_reports_departure_id").on(t.departureId),
  index("idx_muthawif_daily_reports_date").on(t.reportDate),
]);
