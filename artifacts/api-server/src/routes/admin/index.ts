import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { requireAdmin } from "../../middlewares/requireAdmin";
import adminPackagesRouter from "./packages";
import adminBookingsRouter from "./bookings";
import adminUsersRouter from "./users";
import adminDeparturesRouter from "./departures";
import adminPaymentsRouter from "./payments";
import adminDocumentsRouter from "./documents";
import adminSystemHealthRouter from "./systemHealth";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.use("/packages", adminPackagesRouter);
router.use("/packages/:packageId/departures", adminDeparturesRouter);
router.use("/bookings", adminBookingsRouter);
router.use("/bookings/:bookingId/payments", adminPaymentsRouter);
router.use("/bookings/:bookingId/documents", adminDocumentsRouter);
router.use("/users", adminUsersRouter);
router.use("/system-health", adminSystemHealthRouter);

export default router;
