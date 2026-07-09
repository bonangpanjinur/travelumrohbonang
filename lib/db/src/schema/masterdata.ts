import {
  pgTable, text, integer, boolean, timestamp, doublePrecision,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";

export const packageCategories = pgTable("package_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: text("parent_id").references((): any => packageCategories.id, { onDelete: "set null" }),
  // NOTE: icon column does not exist in the actual DB — omitted to prevent
  // Drizzle from including it in INSERT/SELECT and causing "column does not exist" errors.
  showExtraHotels: boolean("show_extra_hotels"),
  isActive: boolean("is_active"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_package_categories_parent_id").on(t.parentId),
  index("idx_package_categories_is_active").on(t.isActive),
]);

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
  hotelId: text("hotel_id").notNull().references(() => hotels.id, { onDelete: "cascade" }),
  // NOTE: 'city' does not exist in the actual DB — removed to prevent INSERT errors
  label: text("label"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_package_hotels_package_id").on(t.packageId),
  index("idx_package_hotels_hotel_id").on(t.hotelId),
]);

export const muthawifs = pgTable("muthawifs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  photoUrl: text("photo_url"),
  // NOTE: 'bio' and 'is_active' do not exist in the actual DB — removed to prevent INSERT errors
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
}, (t) => [
  uniqueIndex("uq_branches_slug").on(t.slug),
]);

export const currencies = pgTable("currencies", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name"),
  symbol: text("symbol"),
  rateToIdr: integer("rate_to_idr"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("uq_currencies_code").on(t.code),
]);
