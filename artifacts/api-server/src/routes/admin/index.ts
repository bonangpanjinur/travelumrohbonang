import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import {
  requireAdmin,
  requireStaff,
  requireOperational,
  requireFinance,
  requireSuperAdmin,
} from "../../middlewares/requireAdmin";

// Routers
import adminPackagesRouter from "./packages";
import adminBookingsRouter from "./bookings";
import adminUsersRouter from "./users";
import adminDeparturesRouter from "./departures";
import adminPaymentsRouter from "./payments";
import adminDocumentsRouter from "./documents";
import adminSystemHealthRouter from "./systemHealth";
import adminAgentsRouter from "./agents";
import adminSettingsRouter from "./settings";
import adminTenantRouter from "./tenant";
import adminBranchesRouter from "./branches";
import adminPilgrimsRouter from "./pilgrims";
import adminCouponsRouter from "./coupons";
import adminCrmRouter from "./crm";
import adminLogsRouter from "./logs";
import adminCurrenciesRouter from "./currencies";
import adminContentRouter from "./content";
import adminGalleryRouter from "./gallery";
import adminTestimonialsRouter from "./testimonials";
import adminReviewsRouter from "./reviews";
import adminCostsRouter from "./costs";
import adminRefundsRouter from "./refunds";
import adminLoyaltyRouter from "./loyalty";
import adminRedirectsRouter from "./redirects";
import adminSeoRouter from "./seo";
import adminMasterdataRouter from "./masterdata";
import adminIntegrationsRouter from "./integrations";
import adminChatsRouter from "./chats";
import adminMenuPermissionsRouter from "./menu-permissions";
import adminAnalyticsRouter from "./analytics";
import adminContractsRouter from "./contracts";
import adminPaymentGatewayRouter from "./payment-gateway";
import adminIncidentReportsRouter from "./incidentReports";
import { logDiag } from "../../lib/tempDiagnosticLog"; // TEMP DIAG

const router = Router();

// Every admin route requires a valid authenticated session
router.use((req, _res, next) => { logDiag("requireAuth:before", req); next(); }); // TEMP DIAG
router.use(requireAuth);
router.use((req, _res, next) => { logDiag("requireAuth:after", req); next(); }); // TEMP DIAG

// ── Super-admin-only routes ─────────────────────────────────────────────────
// Agents router contains role-management endpoints (POST/DELETE /roles)
// protected individually by requireSuperAdmin inside the router itself.
// The GET /roles endpoint is readable by all admins.
router.use("/agents", requireAdmin, adminAgentsRouter);
router.use("/integrations", requireSuperAdmin, adminIntegrationsRouter);
// GET readable by all admin roles; PUT/DELETE restricted to super_admin inside the router
router.use(
  "/menu-permissions",
  (req, _res, next) => { logDiag("requireOperational:before", req); next(); }, // TEMP DIAG
  requireOperational,
  (req, _res, next) => { logDiag("requireOperational:after", req); next(); }, // TEMP DIAG
  adminMenuPermissionsRouter,
);
router.use("/analytics", requireFinance, adminAnalyticsRouter);

// ── Full admin routes (super_admin + admin only) ────────────────────────────
router.use("/users", requireAdmin, adminUsersRouter);
router.use("/settings", requireAdmin, adminSettingsRouter);
router.use("/tenant", requireAdmin, adminTenantRouter);
router.use("/system-health", requireAdmin, adminSystemHealthRouter);
router.use("/logs", requireAdmin, adminLogsRouter);
router.use("/incident-reports", requireAdmin, adminIncidentReportsRouter);
router.use("/currencies", requireAdmin, adminCurrenciesRouter);
router.use("/content", requireAdmin, adminContentRouter);
router.use("/gallery", requireAdmin, adminGalleryRouter);
router.use("/testimonials", requireAdmin, adminTestimonialsRouter);
router.use("/reviews", requireAdmin, adminReviewsRouter);
router.use("/costs", requireAdmin, adminCostsRouter);
router.use("/coupons", requireAdmin, adminCouponsRouter);
router.use("/crm", requireAdmin, adminCrmRouter);
router.use("/loyalty", requireAdmin, adminLoyaltyRouter);
router.use("/redirects", requireAdmin, adminRedirectsRouter);
router.use("/seo", requireAdmin, adminSeoRouter);
router.use("/masterdata", requireAdmin, adminMasterdataRouter);

// ── Staff routes (super_admin, admin, branch_manager, staff) ────────────────
router.use("/packages", requireStaff, adminPackagesRouter);
router.use("/departures", requireStaff, adminDeparturesRouter);
router.use("/packages/:packageId/departures", requireStaff, adminDeparturesRouter);
router.use("/pilgrims", requireStaff, adminPilgrimsRouter);
router.use("/chats", requireStaff, adminChatsRouter);
router.use("/branches", requireStaff, adminBranchesRouter);

// ── Operational routes (adds agent access) ──────────────────────────────────
router.use("/bookings", requireOperational, adminBookingsRouter);
router.use("/payments", requireOperational, adminPaymentsRouter);
router.use("/bookings/:bookingId/payments", requireOperational, adminPaymentsRouter);
router.use("/bookings/:bookingId/documents", requireOperational, adminDocumentsRouter);
router.use("/documents", requireOperational, adminDocumentsRouter);
router.use("/refunds", requireAdmin, adminRefundsRouter);

// ── P2-5: Contracts (staff+ read, admin-only delete handled inside router) ────
router.use("/contracts", requireStaff, adminContractsRouter);

// ── P1-2: Payment Gateway (webhook routes exposed at app level in index.ts) ───
router.use("/payment-gateway", requireAdmin, adminPaymentGatewayRouter);

export default router;
