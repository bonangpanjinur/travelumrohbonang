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
import notificationsRouter from "./notifications";
import wishlistsRouter from "./wishlists";
import { strictLimiter, writeLimiter } from "../middlewares/rateLimiter";

const router = Router();

// ── Public / no-auth routes ──────────────────────────────────────────────────
router.use(healthRouter);
router.use(authRouter);
router.use("/packages", packagesRouter);
router.use("/faqs", faqsRouter);

// Public CMS content (blog, pages, gallery, settings, etc.)
router.use("/cms", cmsRouter);

// Misc public helpers (currencies, tenant-site)
router.use(miscRouter);

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

router.use("/notifications", strictLimiter, notificationsRouter);

router.use("/wishlists", strictLimiter);
router.post("/wishlists/toggle", writeLimiter);
router.use("/wishlists", wishlistsRouter);

// Client-side logging (no auth required — best-effort; write-rate-limited at router level)
router.use("/logs", writeLimiter, logsRouter);

export default router;
