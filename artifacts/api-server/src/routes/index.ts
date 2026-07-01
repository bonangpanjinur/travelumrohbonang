import { Router } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import bookingsRouter from "./bookings";
import profileRouter from "./profile";
import adminRouter from "./admin";
import { strictLimiter, writeLimiter } from "../middlewares/rateLimiter";

const router = Router();

router.use(healthRouter);
router.use("/packages", packagesRouter);
router.use("/admin", strictLimiter, adminRouter);

router.use("/bookings", strictLimiter);
router.post("/bookings", writeLimiter);
router.post("/bookings/:id/rooms", writeLimiter);
router.post("/bookings/:id/pilgrims", writeLimiter);
router.use("/bookings", bookingsRouter);

router.use("/profile", strictLimiter);
router.patch("/profile/:id", writeLimiter);
router.use("/profile", profileRouter);

export default router;
