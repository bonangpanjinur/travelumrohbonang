import { Router } from "express";
import {
  db,
  blogPosts,
  pages,
  gallery,
  faqs,
  manasikMaterials,
  services,
  guideSteps,
  advantages,
  navigationItems,
  floatingButtons,
  eq,
} from "@workspace/db";

const router = Router();

const createCrudRoutes = (table: any, name: string) => {
  router.get(`/${name}`, async (req, res) => {
    try {
      const data = await db.select().from(table);
      res.json({ data });
    } catch (err) {
      res.status(500).json({ error: `Failed to fetch ${name}` });
    }
  });

  router.post(`/${name}`, async (req, res) => {
    try {
      const [item] = (await db.insert(table).values({
        id: crypto.randomUUID(),
        ...req.body,
        createdAt: new Date(),
      }).returning()) as any[];
      res.status(201).json({ data: item });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: `Failed to create ${name}` });
    }
  });

  router.patch(`/${name}/:id`, async (req, res) => {
    try {
      const [item] = await db.update(table).set(req.body).where(eq(table.id, req.params.id)).returning();
      if (!item) return res.status(404).json({ error: "Not found" });
      res.json({ data: item });
    } catch (err) {
      res.status(500).json({ error: `Failed to update ${name}` });
    }
  });

  router.delete(`/${name}/:id`, async (req, res) => {
    try {
      const [item] = (await db.delete(table).where(eq(table.id, req.params.id)).returning()) as any[];
      if (!item) return res.status(404).json({ error: "Not found" });
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: `Failed to delete ${name}` });
    }
  });
};

createCrudRoutes(blogPosts, "blog-posts");
createCrudRoutes(pages, "pages");
createCrudRoutes(gallery, "gallery");
createCrudRoutes(faqs, "faqs");
createCrudRoutes(manasikMaterials, "manasik-materials");
createCrudRoutes(services, "services");
createCrudRoutes(guideSteps, "guide-steps");
createCrudRoutes(advantages, "advantages");
createCrudRoutes(navigationItems, "navigation-items");
createCrudRoutes(floatingButtons, "floating-buttons");

export default router;
