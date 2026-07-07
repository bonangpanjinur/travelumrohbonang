import { Router } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";

const router = Router();

// ── GET /auth/user ────────────────────────────────────────────────────────────
//
// Returns the currently-authenticated user (resolved by authMiddleware) or
// { user: null } if unauthenticated. Never throws — any error is caught and
// returned as { user: null } so the frontend never receives a 500 from here.

router.get("/auth/user", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      const parsed = GetCurrentAuthUserResponse.safeParse({ user: null });
      res.json(parsed.success ? parsed.data : { user: null });
      return;
    }

    // authMiddleware already resolved the user (including role lookup).
    // Re-use req.user directly — no need to hit the DB again.
    const parsed = GetCurrentAuthUserResponse.safeParse({ user: req.user });

    if (!parsed.success) {
      // Zod validation failed (e.g. unexpected role value from DB).
      // Return unauthenticated rather than leaking unvalidated data or 500.
      console.error("[auth/user] Zod parse failed:", parsed.error.issues);
      res.json({ user: null });
      return;
    }

    res.json(parsed.data);
  } catch (err) {
    console.error("[auth/user] unexpected error:", err);
    // Return unauthenticated rather than 500 so the client can handle it.
    res.json({ user: null });
  }
});

router.get("/logout", (_req, res) => {
  res.redirect("/");
});

export default router;
