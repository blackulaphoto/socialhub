import { Router } from "express";
import { db, pageViewsTable } from "@workspace/db";

const router = Router();

router.post("/analytics/page-view", async (req, res) => {
  const { path, referrer } = req.body;
  if (!path || typeof path !== "string") {
    res.status(400).json({ error: "path is required" });
    return;
  }

  await db.insert(pageViewsTable).values({
    userId: req.session.userId ?? null,
    path,
    referrer: typeof referrer === "string" ? referrer : null,
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
  });

  res.status(201).json({ success: true, message: "Tracked" });
});

export default router;
