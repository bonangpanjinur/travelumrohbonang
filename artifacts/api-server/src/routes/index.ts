import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import packagesRouter from "./packages";
import faqsRouter from "./faqs";
import bookingsRouter from "./bookings";
import profileRouter from "./profile";
import adminRouter from "./admin";
import miscRouter from "./misc";
import cmsRouter from "./cms";
import contractsRouter from "./contracts";
import logsRouter from "./logs";
import pilgrimDocumentsRouter from "./pilgrim-documents";
import pilgrimsRouter from "./pilgrims";
import notificationsRouter from "./notifications";
import loyaltyRouter from "./loyalty";
import wishlistsRouter from "./wishlists";
import pilgrimTestimonialsRouter from "./pilgrim-testimonials";
import paymentGatewayWebhooksRouter from "./payment-gateway-webhooks";
import agentRouter from "./agent";
import savingsRouter from "./savings";
import cronRouter from "./admin/cron";
import { strictLimiter, writeLimiter } from "../middlewares/rateLimiter";

const router = Router();

import trackRouter from "./track";

// ── Public / no-auth routes ──────────────────────────────────────────────────
router.use(healthRouter);
router.use(authRouter);
router.use("/packages", packagesRouter);
router.use("/faqs", faqsRouter);
// Public booking tracking (QR code scan, no auth)
router.use("/track", trackRouter);

// Public CMS content (blog, pages, gallery, settings, etc.)
router.use("/cms", cmsRouter);

// Misc public helpers (currencies, tenant-site, payment-settings)
// Mounted at both root (legacy) and /misc (new canonical) so existing callers
// that hit /api/currencies or /api/payment-settings still work.
router.use(miscRouter);
router.use("/misc", miscRouter);

// ── Admin (all sub-routes protected individually inside adminRouter) ──────────
router.use("/admin", strictLimiter, adminRouter);

// ── Authenticated user routes ─────────────────────────────────────────────────
router.use("/bookings", strictLimiter);
router.post("/bookings", writeLimiter);
router.post("/bookings/:id/rooms", writeLimiter);
router.post("/bookings/:id/pilgrims", writeLimiter);
router.use("/bookings", bookingsRouter);

router.use("/profile", strictLimiter);
router.patch("/profile/:id", writeLimiter);
router.use("/profile", profileRouter);

router.use("/contracts", strictLimiter, contractsRouter);

router.use("/pilgrim-documents", strictLimiter);
router.post("/pilgrim-documents", writeLimiter);
router.use("/pilgrim-documents", pilgrimDocumentsRouter);

router.use("/pilgrims", strictLimiter, pilgrimsRouter);

router.use("/notifications", strictLimiter, notificationsRouter);

router.use("/loyalty", strictLimiter, loyaltyRouter);

router.use("/wishlists", strictLimiter);
router.post("/wishlists/toggle", writeLimiter);
router.use("/wishlists", wishlistsRouter);

router.use("/pilgrim-testimonials", strictLimiter, pilgrimTestimonialsRouter);

// Payment gateway webhooks — PUBLIC (server-to-server from Midtrans/Xendit, no JWT)
// Signature verification happens inside the router.
// Configure Midtrans notification URL: https://<host>/api/payments/webhook/midtrans
// Configure Xendit callback URL:       https://<host>/api/payments/webhook/xendit
router.use("/payments/webhook", writeLimiter, paymentGatewayWebhooksRouter);

// Agent portal — dedicated endpoints scoped to the authenticated user's own agent record
router.use("/agent", strictLimiter, agentRouter);

// Tabungan Umroh — user savings portal
router.use("/savings", strictLimiter, savingsRouter);

// Client-side logging (no auth required — best-effort; write-rate-limited at router level)
router.use("/logs", writeLimiter, logsRouter);

// ── Vercel Cron endpoints — NO session auth; CRON_SECRET header check only ────
// Must stay outside the authenticated admin router so Vercel Cron scheduler
// (which only sends Authorization: Bearer <CRON_SECRET>) is not rejected by
// requireAuth middleware.
router.use("/cron", cronRouter);

export default router;
