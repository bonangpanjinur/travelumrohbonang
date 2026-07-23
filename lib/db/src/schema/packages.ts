import {
  pgTable, text, integer, boolean, numeric, timestamp,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { packageCategories, hotels, airlines, airports, muthawifs } from "./masterdata";

export const packages = pgTable("packages", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  durationDays: integer("duration_days"),
  packageType: text("package_type"),
  categoryId: text("category_id").references(() => packageCategories.id, { onDelete: "set null" }),
  // FASE 1: hotelMakkahId, hotelMadinahId, airlineId, airportId dipindah ke package_departures
  minimumDp: integer("minimum_dp"),
  dpDeadlineDays: integer("dp_deadline_days"),
  fullDeadlineDays: integer("full_deadline_days"),
  isActive: boolean("is_active"),
  // JSON array of document type strings admin has configured as required for this package.
  // Example: '["paspor","ktp","foto","vaksin"]'  — falls back to global REQUIRED_DOCUMENT_TYPES if null.
  requiredDocTypes: text("required_doc_types"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("uq_packages_slug").on(t.slug),
  index("idx_packages_is_active").on(t.isActive),
  index("idx_packages_category_id").on(t.categoryId),
]);

export const packageDepartures = pgTable("package_departures", {
  id: text("id").primaryKey(),
  // nullable: a departure can exist before being linked to a package
  packageId: text("package_id").references(() => packages.id, { onDelete: "set null" }),
  departureDate: text("departure_date").notNull(),
  returnDate: text("return_date"),
  quota: integer("quota").notNull(),
  remainingQuota: integer("remaining_quota").notNull(),
  status: text("status"),
  muthawifId: text("muthawif_id").references(() => muthawifs.id, { onDelete: "set null" }),
  // KB-F03: Info penerbangan per keberangkatan
  airlineId: text("airline_id").references(() => airlines.id, { onDelete: "set null" }),
  flightNumber: text("flight_number"),
  departureAirportId: text("departure_airport_id").references(() => airports.id, { onDelete: "set null" }),
  arrivalAirportId: text("arrival_airport_id").references(() => airports.id, { onDelete: "set null" }),
  // FASE 1: hotel dipindah dari packages ke sini
  hotelMakkahId: text("hotel_makkah_id").references(() => hotels.id, { onDelete: "set null" }),
  hotelMadinahId: text("hotel_madinah_id").references(() => hotels.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_departures_package_id").on(t.packageId),
  index("idx_departures_status").on(t.status),
]);

export const departurePrices = pgTable("departure_prices", {
  id: text("id").primaryKey(),
  departureId: text("departure_id").notNull().references(() => packageDepartures.id, { onDelete: "cascade" }),
  roomType: text("room_type").notNull(),
  price: integer("price").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_departure_prices_departure_id").on(t.departureId),
]);

// FASE 1: departure_hotels menggantikan package_hotels
// Hotel ekstra (selain Makkah & Madinah) per keberangkatan
export const departureHotels = pgTable("departure_hotels", {
  id: text("id").primaryKey(),
  departureId: text("departure_id").references(() => packageDepartures.id, { onDelete: "cascade" }),
  hotelId: text("hotel_id").notNull().references(() => hotels.id, { onDelete: "cascade" }),
  label: text("label"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_departure_hotels_departure_id").on(t.departureId),
  index("idx_departure_hotels_hotel_id").on(t.hotelId),
]);

export const departureGallery = pgTable("departure_gallery", {
  id: text("id").primaryKey(),
  departureId: text("departure_id").notNull().references(() => packageDepartures.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  // NOTE: DB has 'caption', not 'title'/'description' — removed to prevent "column does not exist" errors
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_departure_gallery_departure_id").on(t.departureId),
]);

export const packageCosts = pgTable("package_costs", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  departureId: text("departure_id").references(() => packageDepartures.id, { onDelete: "set null" }),
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
  // Fase 4: realisasi biaya aktual
  actualAmount: numeric("actual_amount"),
  invoiceReference: text("invoice_reference"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (t) => [
  index("idx_package_costs_package_id").on(t.packageId),
  index("idx_package_costs_departure_id").on(t.departureId),
]);

export const packageCommissions = pgTable("package_commissions", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  label: text("label"),
  commissionAmount: numeric("commission_amount").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_package_commissions_package_id").on(t.packageId),
]);
