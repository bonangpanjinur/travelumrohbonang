/**
 * O-11: Pre-departure Checklist Otomatis
 * Checklist item per keberangkatan dibuat otomatis oleh cron job H-60/30/14/7/3
 */

import {
  pgTable, text, integer, boolean, timestamp, index,
} from "drizzle-orm/pg-core";
import { packageDepartures } from "./packages";

export const departureChecklists = pgTable("departure_checklists", {
  id: text("id").primaryKey(),
  departureId: text("departure_id").notNull().references(() => packageDepartures.id, { onDelete: "cascade" }),
  hMinus: integer("h_minus").notNull(),   // 60, 30, 14, 7, 3
  category: text("category"),             // dokumen | hotel | distribusi | briefing | transportasi
  item: text("item").notNull(),            // deskripsi item checklist
  isDone: boolean("is_done").notNull().default(false),
  doneBy: text("done_by"),                // admin user id
  doneAt: timestamp("done_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_checklist_departure_id").on(t.departureId),
  index("idx_checklist_h_minus").on(t.hMinus),
  index("idx_checklist_is_done").on(t.isDone),
]);
