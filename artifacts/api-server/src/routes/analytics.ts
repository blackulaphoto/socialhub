import { Router } from "express";
import { db, conversationsTable, followsTable, messageInquiriesTable, messagesTable, pageViewsTable, postsTable } from "@workspace/db";
import { and, eq, gte, or, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

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

router.get("/analytics/creator", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const artistPath = `/artists/${userId}`;
  const profilePath = `/profile/${userId}`;

  const [totalViews] = await db.select({ count: sql<number>`count(*)::int` })
    .from(pageViewsTable)
    .where(or(eq(pageViewsTable.path, artistPath), eq(pageViewsTable.path, profilePath)));
  const [views7d] = await db.select({ count: sql<number>`count(*)::int` })
    .from(pageViewsTable)
    .where(and(
      or(eq(pageViewsTable.path, artistPath), eq(pageViewsTable.path, profilePath)),
      gte(pageViewsTable.createdAt, last7Days),
    ));
  const [views30d] = await db.select({ count: sql<number>`count(*)::int` })
    .from(pageViewsTable)
    .where(and(
      or(eq(pageViewsTable.path, artistPath), eq(pageViewsTable.path, profilePath)),
      gte(pageViewsTable.createdAt, last30Days),
    ));

  const [followersTotal] = await db.select({ count: sql<number>`count(*)::int` })
    .from(followsTable)
    .where(eq(followsTable.followingId, userId));
  const [followers30d] = await db.select({ count: sql<number>`count(*)::int` })
    .from(followsTable)
    .where(and(eq(followsTable.followingId, userId), gte(followsTable.createdAt, last30Days)));

  const [postsTotal] = await db.select({ count: sql<number>`count(*)::int` })
    .from(postsTable)
    .where(and(eq(postsTable.userId, userId), eq(postsTable.actorSurface, "artist")));
  const [posts30d] = await db.select({ count: sql<number>`count(*)::int` })
    .from(postsTable)
    .where(and(
      eq(postsTable.userId, userId),
      eq(postsTable.actorSurface, "artist"),
      gte(postsTable.createdAt, last30Days),
    ));

  const inquiriesTotal = await db.execute(sql`
    SELECT count(*)::int AS count
    FROM message_inquiries mi
    JOIN messages m ON m.id = mi.message_id
    JOIN conversations c ON c.id = m.conversation_id
    WHERE (c.user1_id = ${userId} OR c.user2_id = ${userId})
  `);
  const inquiries30d = await db.execute(sql`
    SELECT count(*)::int AS count
    FROM message_inquiries mi
    JOIN messages m ON m.id = mi.message_id
    JOIN conversations c ON c.id = m.conversation_id
    WHERE (c.user1_id = ${userId} OR c.user2_id = ${userId})
      AND mi.created_at >= ${last30Days}
  `);

  res.json({
    views: {
      total: Number(totalViews?.count ?? 0),
      last7d: Number(views7d?.count ?? 0),
      last30d: Number(views30d?.count ?? 0),
    },
    followers: {
      total: Number(followersTotal?.count ?? 0),
      last30d: Number(followers30d?.count ?? 0),
    },
    posts: {
      total: Number(postsTotal?.count ?? 0),
      last30d: Number(posts30d?.count ?? 0),
    },
    inquiries: {
      total: Number(inquiriesTotal.rows?.[0]?.count ?? 0),
      last30d: Number(inquiries30d.rows?.[0]?.count ?? 0),
    },
  });
});

export default router;
