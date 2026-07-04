import { Router, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { db, usersTable, userRoles } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isAdminEmail } from "../lib/adminAllowlist";

const router = Router();

async function upsertUser(params: {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}) {
  const [user] = await db
    .insert(usersTable)
    .values(params)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        profileImageUrl: params.profileImageUrl,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

router.get("/auth/user", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json(GetCurrentAuthUserResponse.parse({ user: null }));
    return;
  }

  try {
    await upsertUser({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      profileImageUrl: req.user.profileImageUrl,
    });
  } catch (err) {
    console.error("[auth] upsertUser failed:", err instanceof Error ? err.message : err);
  }

  // Prefer explicit role from user_roles table; fall back to email-based check
  let role: string = isAdminEmail(req.user.email) ? "admin" : "user";
  try {
    const [dbRole] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, req.user.id))
      .limit(1);
    if (dbRole?.role) role = dbRole.role;
  } catch {
    // DB unavailable — keep email-based fallback
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
