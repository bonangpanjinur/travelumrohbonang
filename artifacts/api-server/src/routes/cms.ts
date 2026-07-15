import { Router } from "express";
import {
  db,
  blogPosts,
  pages,
  gallery,
  faqs,
  manasikMaterials,
  testimonials,
  slugRedirects,
  siteSettings,
  seoOverrides,
  navigationItems,
  guideSteps,
  advantages,
  floatingButtons,
  services,
  chatMessages,
  bookings,
  eq,
  and,
  desc,
  asc,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const STAFF_ROLES = new Set(["super_admin", "admin", "branch_manager", "staff"]);

const router = Router();

// Blog Posts
router.get("/blog-posts", async (req, res) => {
  try {
    const { slug } = req.query;
    if (slug) {
      const [post] = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.slug, slug as string), eq(blogPosts.isPublished, true)))
        .limit(1);
      return res.json({ data: post });
    }
    const posts = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.publishedAt));
    res.json({ data: posts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

// Pages
router.get("/pages", async (req, res) => {
  try {
    const { slug } = req.query;
    if (slug) {
      const [page] = await db
        .select()
        .from(pages)
        .where(and(eq(pages.slug, slug as string), eq(pages.isActive, true)))
        .limit(1);
      return res.json({ data: page });
    }
    const allPages = await db.select().from(pages).where(eq(pages.isActive, true));
    res.json({ data: allPages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pages" });
  }
});

// Gallery
router.get("/gallery", async (req, res) => {
  try {
    const images = await db
      .select()
      .from(gallery)
      .where(eq(gallery.isActive, true))
      .orderBy(asc(gallery.sortOrder));
    res.json({ data: images });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

// Manasik Materials
router.get("/manasik-materials", async (req, res) => {
  try {
    const materials = await db
      .select()
      .from(manasikMaterials)
      .where(eq(manasikMaterials.isActive, true))
      .orderBy(asc(manasikMaterials.sortOrder));
    res.json({ data: materials });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch manasik materials" });
  }
});

// Testimonials
router.get("/testimonials", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.isActive, true))
      .orderBy(asc(testimonials.sortOrder));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

// Slug Redirects
router.get("/slug-redirects", async (req, res) => {
  try {
    const redirects = await db.select().from(slugRedirects);
    res.json({ data: redirects });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch slug redirects" });
  }
});

// Site Settings
router.get("/site-settings", async (req, res) => {
  try {
    const settings = await db.select().from(siteSettings);
    res.json({ data: settings });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch site settings" });
  }
});

// SEO Overrides
router.get("/seo-overrides", async (req, res) => {
  try {
    const overrides = await db.select().from(seoOverrides);
    res.json({ data: overrides });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch SEO overrides" });
  }
});

// Navigation Items
router.get("/navigation-items", async (req, res) => {
  try {
    const items = await db
      .select()
      .from(navigationItems)
      .where(eq(navigationItems.isActive, true))
      .orderBy(asc(navigationItems.sortOrder));
    res.json({ data: items });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch navigation items" });
  }
});

// Guide Steps
router.get("/guide-steps", async (req, res) => {
  try {
    const steps = await db
      .select()
      .from(guideSteps)
      .where(eq(guideSteps.isActive, true))
      .orderBy(asc(guideSteps.stepNumber));
    res.json({ data: steps });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch guide steps" });
  }
});

// Advantages
router.get("/advantages", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(advantages)
      .where(eq(advantages.isActive, true))
      .orderBy(asc(advantages.sortOrder));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch advantages" });
  }
});

// Floating Buttons
router.get("/floating-buttons", async (req, res) => {
  try {
    const buttons = await db
      .select()
      .from(floatingButtons)
      .where(eq(floatingButtons.isActive, true))
      .orderBy(asc(floatingButtons.sortOrder));
    res.json({ data: buttons });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch floating buttons" });
  }
});

// Services
router.get("/services", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(asc(services.sortOrder));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// Chat Messages (Scoped by booking — auth + ownership required, see P0-1 fix 2026-07-08)
router.get("/chat-messages", requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { booking_id } = req.query;
    if (!booking_id) return res.status(400).json({ error: "Booking ID is required" });

    const [booking] = await db
      .select({ id: bookings.id, userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, booking_id as string))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const isOwner = booking.userId === req.user.id;
    const isStaff = STAFF_ROLES.has(req.user.role as string);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: "Not authorized to view this booking's chat" });
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.bookingId, booking_id as string))
      .orderBy(asc(chatMessages.createdAt));
    res.json({ data: messages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

export default router;
