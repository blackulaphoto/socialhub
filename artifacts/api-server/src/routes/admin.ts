import { Router } from "express";
import { db, usersTable, postsTable, postLikesTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getUserCounts, formatUser } from "./auth.js";
import { getUserSummary } from "./users.js";

const router = Router();

async function requireAdminMiddleware(req: any, res: any, next: any) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user?.isAdmin) {
    res.status(403).json({ error: "Forbidden", message: "Admin access required" }); return;
  }
  next();
}

router.get("/admin/users", requireAdminMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const offset = (page - 1) * limit;

  const [totalResult] = await db.select({ count: count() }).from(usersTable);
  const total = Number(totalResult?.count ?? 0);

  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
  const enriched = await Promise.all(users.map(async u => {
    const counts = await getUserCounts(u.id);
    return formatUser(u, counts);
  }));

  res.json({ users: enriched, total, page, totalPages: Math.ceil(total / limit) });
});

router.get("/admin/posts", requireAdminMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const offset = (page - 1) * limit;

  const [totalResult] = await db.select({ count: count() }).from(postsTable);
  const total = Number(totalResult?.count ?? 0);

  const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);

  const enriched = await Promise.all(posts.map(async (post) => {
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.userId)).limit(1);
    const [likeCountResult] = await db.select({ count: count() }).from(postLikesTable).where(eq(postLikesTable.postId, post.id));
    const authorSummary = author ? await getUserSummary(author) : null;
    return { ...post, likeCount: Number(likeCountResult?.count ?? 0), isLiked: false, author: authorSummary };
  }));

  res.json({ posts: enriched, total, page, totalPages: Math.ceil(total / limit) });
});

router.delete("/admin/posts/:postId", requireAdminMiddleware, async (req, res) => {
  const postId = parseInt(req.params.postId);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(postsTable).where(eq(postsTable.id, postId));
  res.json({ success: true, message: "Post deleted" });
});

router.post("/admin/users/:userId/ban", requireAdminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.update(usersTable).set({ isBanned: true }).where(eq(usersTable.id, userId));
  res.json({ success: true, message: "User banned" });
});

router.post("/admin/users/:userId/unban", requireAdminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.update(usersTable).set({ isBanned: false }).where(eq(usersTable.id, userId));
  res.json({ success: true, message: "User unbanned" });
});

export default router;
