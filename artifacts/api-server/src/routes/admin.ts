import { Router } from "express";
import { db, eventsTable, groupsTable, pageViewsTable, postsTable, reportsTable, usersTable } from "@workspace/db";
import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { enrichPost, formatEvent, formatGroup, formatUser } from "./helpers.js";
import { describeMediaStorage } from "../lib/media-storage.js";

const router = Router();

async function requireAdminMiddleware(req: any, res: any, next: any) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user?.isAdmin) {
    res.status(403).json({ error: "Forbidden", message: "Admin access required" });
    return;
  }
  next();
}

router.get("/admin/users", requireAdminMiddleware, async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json({
    users: await Promise.all(users.map((user) => formatUser(user))),
    total: users.length,
    page: 1,
    totalPages: 1,
  });
});

router.get("/admin/posts", requireAdminMiddleware, async (req, res) => {
  const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt));
  res.json({
    posts: await Promise.all(posts.map((post) => enrichPost(post, req.session.userId))),
    total: posts.length,
    page: 1,
    totalPages: 1,
  });
});

router.get("/admin/groups", requireAdminMiddleware, async (req, res) => {
  const groups = await db.select().from(groupsTable).orderBy(desc(groupsTable.createdAt));
  res.json(await Promise.all(groups.map((group) => formatGroup(group, req.session.userId))));
});

router.get("/admin/events", requireAdminMiddleware, async (_req, res) => {
  const events = await db.select().from(eventsTable).orderBy(eventsTable.startsAt);
  res.json(await Promise.all(events.map((event) => formatEvent(event))));
});

router.get("/admin/reports", requireAdminMiddleware, async (_req, res) => {
  const reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt));
  const reporterIds = [...new Set(reports.map((report) => report.reporterUserId))];
  const reviewerIds = [...new Set(reports.map((report) => report.reviewedByUserId).filter(Boolean) as number[])];
  const users = [...new Set([...reporterIds, ...reviewerIds])].length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, [...new Set([...reporterIds, ...reviewerIds])]))
    : [];
  const userMap = new Map(users.map((user) => [user.id, user]));

  res.json(await Promise.all(reports.map(async (report) => ({
    ...report,
    reporter: userMap.get(report.reporterUserId) ? await formatUser(userMap.get(report.reporterUserId)!) : null,
    reviewer: report.reviewedByUserId && userMap.get(report.reviewedByUserId) ? await formatUser(userMap.get(report.reviewedByUserId)!) : null,
  }))));
});

router.post("/admin/reports/:reportId/status", requireAdminMiddleware, async (req, res) => {
  const reportId = Number(req.params.reportId);
  if (Number.isNaN(reportId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const { status, adminNote } = req.body;
  if (!status) {
    res.status(400).json({ error: "status is required" });
    return;
  }

  const [report] = await db.update(reportsTable).set({
    status,
    adminNote: adminNote || null,
    reviewedByUserId: req.session.userId!,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(reportsTable.id, reportId)).returning();

  if (!report) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ success: true, message: "Report updated" });
});

router.get("/admin/analytics", requireAdminMiddleware, async (_req, res) => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [usersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [postsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(postsTable);
  const [groupsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(groupsTable);
  const [eventsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(eventsTable);
  const [openReportsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(reportsTable).where(eq(reportsTable.status, "open"));
  const [pageViews24h] = await db.select({ count: sql<number>`count(*)::int` }).from(pageViewsTable).where(gte(pageViewsTable.createdAt, last24Hours));
  const [activeUsers7d] = await db.select({ count: sql<number>`count(distinct user_id)::int` }).from(pageViewsTable).where(gte(pageViewsTable.createdAt, last7Days));
  const topPaths = await db.execute(sql`
    SELECT path, count(*)::int AS views
    FROM page_views
    WHERE created_at >= ${last7Days}
    GROUP BY path
    ORDER BY views DESC, path ASC
    LIMIT 8
  `);

  res.json({
    totals: {
      users: Number(usersCount?.count ?? 0),
      posts: Number(postsCount?.count ?? 0),
      groups: Number(groupsCount?.count ?? 0),
      events: Number(eventsCount?.count ?? 0),
      openReports: Number(openReportsCount?.count ?? 0),
    },
    traffic: {
      pageViews24h: Number(pageViews24h?.count ?? 0),
      activeUsers7d: Number(activeUsers7d?.count ?? 0),
      topPaths: Array.isArray(topPaths.rows) ? topPaths.rows : [],
    },
  });
});

router.get("/admin/storage-status", requireAdminMiddleware, async (req, res) => {
  const storage = describeMediaStorage(req);
  const root = storage.root || "";
  const persistentLikely =
    storage.provider === "local" &&
    (root.startsWith("/data") || root.startsWith("/uploads") || root.includes("\\.local\\uploads"));

  res.json({
    storage: {
      ...storage,
      persistentLikely,
      mode:
        storage.provider === "local"
          ? persistentLikely
            ? "persistent-local-volume"
            : "ephemeral-local-disk"
          : storage.provider,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      railwayService: process.env.RAILWAY_SERVICE_NAME || null,
      railwayPublicDomain: process.env.RAILWAY_PUBLIC_DOMAIN || null,
    },
  });
});

router.delete("/admin/posts/:postId", requireAdminMiddleware, async (req, res) => {
  const postId = Number(req.params.postId);
  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.delete(postsTable).where(eq(postsTable.id, postId));
  res.json({ success: true, message: "Post deleted" });
});

router.delete("/admin/groups/:groupId", requireAdminMiddleware, async (req, res) => {
  const groupId = Number(req.params.groupId);
  if (Number.isNaN(groupId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.delete(groupsTable).where(eq(groupsTable.id, groupId));
  res.json({ success: true, message: "Group deleted" });
});

router.delete("/admin/events/:eventId", requireAdminMiddleware, async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (Number.isNaN(eventId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  res.json({ success: true, message: "Event deleted" });
});

router.post("/admin/users/:userId/ban", requireAdminMiddleware, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.update(usersTable).set({ isBanned: true }).where(eq(usersTable.id, userId));
  res.json({ success: true, message: "User banned" });
});

router.post("/admin/users/:userId/unban", requireAdminMiddleware, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.update(usersTable).set({ isBanned: false }).where(eq(usersTable.id, userId));
  res.json({ success: true, message: "User unbanned" });
});

export default router;
