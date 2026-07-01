import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { requireAdmin } from "../../middlewares/requireAdmin";
import adminPackagesRouter from "./packages";
import adminBookingsRouter from "./bookings";
import adminUsersRouter from "./users";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.use("/packages", adminPackagesRouter);
router.use("/bookings", adminBookingsRouter);
router.use("/users", adminUsersRouter);

export default router;
