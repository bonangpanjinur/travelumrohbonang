import { pgTable, text, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";

export const packageCategories = pgTable("package_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: text("parent_id"),
  icon: text("icon"),
  showExtraHotels: boolean("show_extra_hotels").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const hotels = pgTable("hotels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city"),
  stars: integer("stars"),
  imageUrl: text("image_url"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const airlines = pgTable("airlines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const airports = pgTable("airports", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  city: text("city"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const packageHotels = pgTable("package_hotels", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull(),
  hotelId: text("hotel_id").notNull(),
  city: text("city"),
  label: text("label"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const muthawifs = pgTable("muthawifs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  photoUrl: text("photo_url"),
  bio: text("bio"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const branches = pgTable("branches", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  city: text("city"),
  region: text("region"),
  postalCode: text("postal_code"),
  country: text("country"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  openingHours: text("opening_hours"),
  imageUrl: text("image_url"),
  mapUrl: text("map_url"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const currencies = pgTable("currencies", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name"),
  symbol: text("symbol"),
  rateToIdr: integer("rate_to_idr"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
