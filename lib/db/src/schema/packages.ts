import { pgTable, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";

export const packages = pgTable("packages", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  durationDays: integer("duration_days"),
  packageType: text("package_type"),
  categoryId: text("category_id"),
  hotelMakkahId: text("hotel_makkah_id"),
  hotelMadinahId: text("hotel_madinah_id"),
  airlineId: text("airline_id"),
  airportId: text("airport_id"),
  minimumDp: integer("minimum_dp"),
  dpDeadlineDays: integer("dp_deadline_days"),
  fullDeadlineDays: integer("full_deadline_days"),
  isActive: boolean("is_active"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const packageDepartures = pgTable("package_departures", {
  id: text("id").primaryKey(),
  packageId: text("package_id"),
  departureDate: text("departure_date").notNull(),
  returnDate: text("return_date"),
  quota: integer("quota").notNull(),
  remainingQuota: integer("remaining_quota").notNull(),
  status: text("status"),
  muthawifId: text("muthawif_id"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const departurePrices = pgTable("departure_prices", {
  id: text("id").primaryKey(),
  departureId: text("departure_id"),
  roomType: text("room_type").notNull(),
  price: integer("price").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const departureGallery = pgTable("departure_gallery", {
  id: text("id").primaryKey(),
  departureId: text("departure_id").notNull(),
  imageUrl: text("image_url").notNull(),
  title: text("title"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const packageCosts = pgTable("package_costs", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull(),
  departureId: text("departure_id"),
  category: text("category"),
  itemName: text("item_name").notNull(),
  qty: numeric("qty"),
  unit: text("unit"),
  unitCost: numeric("unit_cost"),
  currencyCode: text("currency_code"),
  isPerPax: boolean("is_per_pax").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const packageCommissions = pgTable("package_commissions", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull(),
  label: text("label"),
  commissionAmount: numeric("commission_amount").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
