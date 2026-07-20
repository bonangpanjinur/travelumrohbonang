import {
  pgTable, text, timestamp, index,
} from "drizzle-orm/pg-core";
import { packageDepartures } from "./packages";
import { bookingPilgrims } from "./bookings";

export const incidentReports = pgTable("incident_reports", {
  id:           text("id").primaryKey(),
  departureId:  text("departure_id").references(() => packageDepartures.id, { onDelete: "set null" }),
  pilgrimId:    text("pilgrim_id").references(() => bookingPilgrims.id, { onDelete: "set null" }),
  type:         text("type").notNull(), // 'kesehatan' | 'kehilangan' | 'ketinggalan' | 'keamanan' | 'lainnya'
  title:        text("title").notNull(),
  description:  text("description").notNull(),
  status:       text("status").notNull().default("open"), // 'open' | 'in_progress' | 'resolved' | 'closed'
  severity:     text("severity").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'critical'
  location:     text("location"),
  handledBy:    text("handled_by"),
  resolution:   text("resolution"),
  reportedBy:   text("reported_by"),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
  resolvedAt:   timestamp("resolved_at", { withTimezone: true }),
}, (t) => [
  index("idx_incident_reports_departure_id").on(t.departureId),
  index("idx_incident_reports_status").on(t.status),
  index("idx_incident_reports_created_at").on(t.createdAt),
]);
