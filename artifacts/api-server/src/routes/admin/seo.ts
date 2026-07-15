import { Router } from "express";
import {
  db,
  seoOverrides,
  packages,
  blogPosts,
  pages,
  eq,
} from "@workspace/db";

const router = Router();

router.get("/overrides", async (req, res) => {
  try {
    const data = await db.select().from(seoOverrides);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch SEO overrides" });
  }
});

router.post("/overrides", async (req, res) => {
  try {
    const [item] = await db.insert(seoOverrides).values({
      id: crypto.randomUUID(),
      ...req.body,
      createdAt: new Date(),
    }).returning();
    res.status(201).json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to create SEO override" });
  }
});

router.patch("/overrides/:id", async (req, res) => {
  try {
    const [item] = await db.update(seoOverrides).set(req.body).where(eq(seoOverrides.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to update SEO override" });
  }
});

router.delete("/overrides/:id", async (req, res) => {
  try {
    const [item] = await db.delete(seoOverrides).where(eq(seoOverrides.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete SEO override" });
  }
});

// Lightweight, on-demand SEO audit: scans packages/blog posts/pages for common
// meta issues and returns findings. Not persisted — recomputed each run.
router.get("/audit", async (_req, res) => {
  try {
    res.json({ data: await runAudit() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch SEO audit" });
  }
});

router.post("/audit", async (_req, res) => {
  try {
    res.json({ data: await runAudit() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to run SEO audit" });
  }
});

type Finding = {
  id: string;
  path: string;
  issue: string;
  severity: "error" | "warning" | "info";
  created_at: string;
};

async function runAudit(): Promise<Finding[]> {
  const findings: Finding[] = [];
  const now = new Date().toISOString();

  const [pkgRows, blogRows, pageRows] = await Promise.all([
    db.select({ id: packages.id, slug: packages.slug, title: packages.title, description: packages.description }).from(packages),
    db.select({ id: blogPosts.id, slug: blogPosts.slug, title: blogPosts.title, excerpt: blogPosts.excerpt, seoDescription: blogPosts.seoDescription }).from(blogPosts),
    db.select({ id: pages.id, slug: pages.slug, title: pages.title, seoDescription: pages.seoDescription }).from(pages),
  ]);

  for (const p of pkgRows) {
    const path = `/paket/${p.slug}`;
    if (!p.title || p.title.trim().length === 0) {
      findings.push({ id: crypto.randomUUID(), path, issue: "Judul paket kosong", severity: "error", created_at: now });
    } else if (p.title.length > 60) {
      findings.push({ id: crypto.randomUUID(), path, issue: `Judul terlalu panjang (${p.title.length} karakter, maks 60)`, severity: "warning", created_at: now });
    }
    if (!p.description || p.description.trim().length === 0) {
      findings.push({ id: crypto.randomUUID(), path, issue: "Deskripsi paket kosong (meta description)", severity: "error", created_at: now });
    } else if (p.description.length > 160) {
      findings.push({ id: crypto.randomUUID(), path, issue: `Deskripsi terlalu panjang (${p.description.length} karakter, maks 160)`, severity: "warning", created_at: now });
    }
  }

  for (const b of blogRows) {
    const path = `/blog/${b.slug}`;
    if (!b.title || b.title.trim().length === 0) {
      findings.push({ id: crypto.randomUUID(), path, issue: "Judul artikel kosong", severity: "error", created_at: now });
    }
    if ((!b.seoDescription || b.seoDescription.trim().length === 0) && (!b.excerpt || b.excerpt.trim().length === 0)) {
      findings.push({ id: crypto.randomUUID(), path, issue: "Meta description & excerpt kosong", severity: "warning", created_at: now });
    }
  }

  for (const pg of pageRows) {
    const path = `/${pg.slug}`;
    if (!pg.seoDescription || pg.seoDescription.trim().length === 0) {
      findings.push({ id: crypto.randomUUID(), path, issue: "Meta description halaman kosong", severity: "warning", created_at: now });
    }
  }

  return findings;
}

export default router;
