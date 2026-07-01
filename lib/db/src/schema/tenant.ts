import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const tenantSites = pgTable("tenant_sites", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id"),
  subdomain: text("subdomain").notNull(),
  customDomain: text("custom_domain"),
  siteName: text("site_name"),
  tagline: text("tagline"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  heroImageUrl: text("hero_image_url"),
  heroTitle: text("hero_title"),
  heroSubtitle: text("hero_subtitle"),
  aboutText: text("about_text"),
  whatsappNumber: text("whatsapp_number"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  isActive: boolean("is_active").notNull().default(true),
  template: text("template"),
  gscVerification: text("gsc_verification"),
  seoDefaultImage: text("seo_default_image"),
  branchId: text("branch_id"),
  agentId: text("agent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const tenantSitePackages = pgTable("tenant_site_packages", {
  id: text("id").primaryKey(),
  tenantSiteId: text("tenant_site_id").notNull(),
  packageId: text("package_id").notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const slugRedirects = pgTable("slug_redirects", {
  id: text("id").primaryKey(),
  tenantSiteId: text("tenant_site_id"),
  resourceType: text("resource_type").notNull(),
  oldSlug: text("old_slug").notNull(),
  newSlug: text("new_slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const templateUpgradeOrders = pgTable("template_upgrade_orders", {
  id: text("id").primaryKey(),
  tenantSiteId: text("tenant_site_id").notNull(),
  requestedBy: text("requested_by").notNull(),
  currentTemplate: text("current_template"),
  targetTemplate: text("target_template"),
  price: integer("price"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
