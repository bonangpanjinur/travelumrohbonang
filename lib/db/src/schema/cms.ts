import {
  pgTable, text, integer, boolean, timestamp,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { packages } from "./packages";
import { bookings } from "./bookings";

export const testimonials = pgTable("testimonials", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  packageName: text("package_name"),
  photoUrl: text("photo_url"),
  rating: integer("rating"),
  content: text("content"),
  travelDate: text("travel_date"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const pilgrimTestimonials = pgTable("pilgrim_testimonials", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),         // references auth.users — no local FK
  rating: integer("rating"),
  message: text("message"),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_pilgrim_testimonials_booking_id").on(t.bookingId),
]);

export const packageReviews = pgTable("package_reviews", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),         // references auth.users — no local FK
  rating: integer("rating"),
  title: text("title"),
  comment: text("comment"),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_package_reviews_package_id").on(t.packageId),
]);

export const wishlists = pgTable("wishlists", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),         // references auth.users — no local FK
  packageId: text("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_wishlists_package_id").on(t.packageId),
  index("idx_wishlists_user_id").on(t.userId),
]);

export const blogPosts = pgTable("blog_posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  excerpt: text("excerpt"),
  content: text("content"),
  imageUrl: text("image_url"),
  category: text("category"),
  author: text("author"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("uq_blog_posts_slug").on(t.slug),
  index("idx_blog_posts_is_published").on(t.isPublished),
]);

export const gallery = pgTable("gallery", {
  id: text("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  title: text("title"),
  description: text("description"),
  category: text("category"),
  sortOrder: integer("sort_order"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const faqs = pgTable("faqs", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  scope: text("scope"),
  packageId: text("package_id").references(() => packages.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_faqs_scope").on(t.scope),
  index("idx_faqs_package_id").on(t.packageId),
]);

export const pages = pgTable("pages", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("uq_pages_slug").on(t.slug),
]);

export const manasikMaterials = pgTable("manasik_materials", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type"),
  fileUrl: text("file_url"),
  thumbnailUrl: text("thumbnail_url"),
  sortOrder: integer("sort_order"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  sortOrder: integer("sort_order"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const guideSteps = pgTable("guide_steps", {
  id: text("id").primaryKey(),
  stepNumber: integer("step_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const advantages = pgTable("advantages", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const navigationItems = pgTable("navigation_items", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  parentId: text("parent_id").references((): any => navigationItems.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  openInNewTab: boolean("open_in_new_tab").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_navigation_items_parent_id").on(t.parentId),
]);

export const floatingButtons = pgTable("floating_buttons", {
  id: text("id").primaryKey(),
  platform: text("platform").notNull(),
  label: text("label").notNull(),
  url: text("url"),
  icon: text("icon"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
