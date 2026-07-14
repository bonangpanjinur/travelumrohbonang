import { Router } from "express";
import { db, chatMessages, eq, asc } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(chatMessages).orderBy(asc(chatMessages.createdAt));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

router.get("/:bookingId", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.bookingId, req.params.bookingId))
      .orderBy(asc(chatMessages.createdAt));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [item] = await db.insert(chatMessages).values({
      id: crypto.randomUUID(),
      ...req.body,
      createdAt: new Date(),
    }).returning();
    res.status(201).json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
