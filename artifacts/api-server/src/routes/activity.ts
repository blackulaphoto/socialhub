import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
  getActivitySummaryForUser,
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/notifications.js";

const router = Router();

router.get("/activity/summary", requireAuth, async (req, res) => {
  res.json(await getActivitySummaryForUser(req.session.userId!));
});

router.get("/notifications", requireAuth, async (req, res) => {
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
  if (limit !== undefined && Number.isNaN(limit)) {
    res.status(400).json({ error: "Invalid limit" });
    return;
  }

  res.json(await getNotificationsForUser(req.session.userId!, limit));
});

router.post("/notifications/read-all", requireAuth, async (req, res) => {
  await markAllNotificationsRead(req.session.userId!);
  res.json({ success: true, message: "Notifications marked as read" });
});

router.post("/notifications/:notificationId/read", requireAuth, async (req, res) => {
  const notificationId = Number(req.params.notificationId);
  if (Number.isNaN(notificationId)) {
    res.status(400).json({ error: "Invalid notification" });
    return;
  }

  const notification = await markNotificationRead(req.session.userId!, notificationId);
  if (!notification) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ success: true, message: "Notification marked as read" });
});

export default router;
