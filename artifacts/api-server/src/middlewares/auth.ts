import { type RequestHandler } from "express";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface AuthenticatedUser {
  id: string;
  email: string | undefined;
  role: string | undefined;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  if (!isSupabaseConfigured || !supabase) {
    res.status(503).json({ error: "Authentication is not configured yet" });
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: (data.user.app_metadata?.role as string | undefined),
  };

  next();
};
