import type { RequestHandler } from "express";

/**
 * Requires authMiddleware to have already validated the Supabase Bearer token
 * and populated req.user. This middleware intentionally does not trust role or
 * identity data supplied by the client.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  next();
};
