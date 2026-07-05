import { Router, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { isAdminEmail } from "../lib/adminAllowlist";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../lib/supabaseEnv";

const router = Router();

// ── Supabase HTTP helpers (no DATABASE_URL / pool needed) ────────────────────

async function getSupabaseRole(userId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ role: string }>;
    return rows[0]?.role ?? null;
  } catch {
    return null;
  }
}

async function createSupabaseRole(userId: string, role: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify({ user_id: userId, role }),
    });
  } catch {
    // best-effort
  }
}

// ── GET /auth/user ────────────────────────────────────────────────────────────

router.get("/auth/user", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json(GetCurrentAuthUserResponse.parse({ user: null }));
    return;
  }

  const { id, email } = req.user;

  // Look up role from user_roles table via Supabase HTTP (no DATABASE_URL needed)
  let role = await getSupabaseRole(id);

  if (!role) {
    // First login — assign default role and persist it
    role = isAdminEmail(email) ? "admin" : "buyer";
    await createSupabaseRole(id, role);
  }

  res.json(
    GetCurrentAuthUserResponse.parse({
      user: { ...req.user, role },
    }),
  );
});

router.get("/logout", (_req: Request, res: Response) => {
  res.redirect("/");
});

export default router;
