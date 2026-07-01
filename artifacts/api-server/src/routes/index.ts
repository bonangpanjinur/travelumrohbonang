import { Router } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import bookingsRouter from "./bookings";
import profileRouter from "./profile";

const router = Router();

router.use(healthRouter);
router.use("/packages", packagesRouter);
router.use("/bookings", bookingsRouter);
router.use("/profile", profileRouter);

export default router;
