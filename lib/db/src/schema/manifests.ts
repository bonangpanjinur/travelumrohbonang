// MN-DB01: Snapshot manifest saat dicetak/didownload
import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { packageDepartures } from "./packages";

export const manifests = pgTable("manifests", {
  id: text("id").primaryKey(),
  departureId: text("departure_id").references(() => packageDepartures.id, { onDelete: "cascade" }),
  printedAt: timestamp("printed_at", { withTimezone: true }).defaultNow(),
  printedBy: text("printed_by"), // admin user id
  totalPilgrims: integer("total_pilgrims").notNull().default(0),
  format: text("format").notNull().default("pdf"), // pdf | csv | print
  snapshotJson: text("snapshot_json"), // summary JSON (not full data)
}, (t) => [
  index("idx_manifests_departure_id").on(t.departureId),
]);
