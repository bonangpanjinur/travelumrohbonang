import { pgTable, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull(),
  category: text("category"),
  value: jsonb("value"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const seoOverrides = pgTable("seo_overrides", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  title: text("title"),
  description: text("description"),
  ogImage: text("og_image"),
  canonicalOverride: text("canonical_override"),
  noindex: boolean("noindex").notNull().default(false),
  keywords: text("keywords"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
