import { Router } from "express";
import { db, agents, branches, and, eq } from "@workspace/db";

const router = Router();

/**
 * Public agent profile, addressed by the stable public slug used in QR codes.
 * Sensitive operational fields (email, commission, user id, date of birth)
 * are intentionally not returned to anonymous visitors.
 */
router.get("/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || slug.length > 100) return res.status(404).json({ error: "Agent not found" });

    const [agent] = await db
      .select({
        id: agents.id,
        name: agents.name,
        gender: agents.gender,
        address: agents.address,
        phone: agents.phone,
        agentCode: agents.agentCode,
        referralCode: agents.referralCode,
        publicSlug: agents.publicSlug,
        publicDescription: agents.publicDescription,
        branchId: agents.branchId,
        branchName: branches.name,
        branchCode: branches.code,
        branchAddress: branches.address,
        branchCity: branches.city,
        branchRegion: branches.region,
        branchPhone: branches.phone,
        branchMapUrl: branches.mapUrl,
      })
      .from(agents)
      .leftJoin(branches, eq(agents.branchId, branches.id))
      .where(and(
        eq(agents.publicSlug, slug),
        eq(agents.isActive, true),
        eq(agents.publicPageEnabled, true),
      ))
      .limit(1);

    if (!agent) return res.status(404).json({ error: "Agent not found" });

    return res.json({
      id: agent.id,
      name: agent.name,
      gender: agent.gender,
      address: agent.address,
      phone: agent.phone,
      agentCode: agent.agentCode,
      referralCode: agent.referralCode,
      publicSlug: agent.publicSlug,
      publicDescription: agent.publicDescription,
      status: "Agen Resmi",
      branch: agent.branchId ? {
        id: agent.branchId,
        code: agent.branchCode,
        name: agent.branchName,
        address: agent.branchAddress,
        city: agent.branchCity,
        region: agent.branchRegion,
        phone: agent.branchPhone,
        mapUrl: agent.branchMapUrl,
      } : null,
    });
  } catch (error) {
    console.error("[public-agents/profile]", error);
    return res.status(500).json({ error: "Failed to fetch public agent profile" });
  }
});

export default router;
