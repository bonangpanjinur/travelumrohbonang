import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const itineraries = pgTable("itineraries", {
  id: text("id").primaryKey(),
  departureId: text("departure_id").notNull(),
  title: text("title"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const itineraryDays = pgTable("itinerary_days", {
  id: text("id").primaryKey(),
  itineraryId: text("itinerary_id").notNull(),
  dayNumber: integer("day_number").notNull(),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
