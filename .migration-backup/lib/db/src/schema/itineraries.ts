import {
  pgTable, text, integer, boolean, timestamp,
  index,
} from "drizzle-orm/pg-core";
import { packageDepartures } from "./packages";

export const itineraries = pgTable("itineraries", {
  id: text("id").primaryKey(),
  departureId: text("departure_id").notNull().references(() => packageDepartures.id, { onDelete: "cascade" }),
  title: text("title"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_itineraries_departure_id").on(t.departureId),
]);

export const itineraryDays = pgTable("itinerary_days", {
  id: text("id").primaryKey(),
  itineraryId: text("itinerary_id").notNull().references(() => itineraries.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_itinerary_days_itinerary_id").on(t.itineraryId),
]);
