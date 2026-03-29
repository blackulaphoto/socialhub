import { Router } from "express";
import { db, reportsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/reports", requireAuth, async (req, res) => {
  const { targetType, targetId, reason, details } = req.body;
  const normalizedTargetId = Number(targetId);
  if (!targetType || Number.isNaN(normalizedTargetId) || !reason) {
    res.status(400).json({ error: "targetType, targetId, and reason are required" });
    return;
  }

  const [report] = await db.insert(reportsTable).values({
    reporterUserId: req.session.userId!,
    targetType,
    targetId: normalizedTargetId,
    reason,
    details: details || null,
  }).returning();

  res.status(201).json(report);
});

export default router;
