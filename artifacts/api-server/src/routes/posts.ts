import { Router } from "express";
import { db, postsTable, postLikesTable, usersTable, followsTable } from "@workspace/db";
import { eq, and, count, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getUserSummary } from "./users.js";

const router = Router();

async function enrichPost(post: typeof postsTable.$inferSelect, currentUserId?: number) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.userId)).limit(1);
  const [likeCountResult] = await db.select({ count: count() }).from(postLikesTable).where(eq(postLikesTable.postId, post.id));
  let isLiked = false;
  if (currentUserId) {
    const [liked] = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, currentUserId))).limit(1);
    isLiked = !!liked;
  }
  const authorSummary = author ? await getUserSummary(author) : null;
  return { ...post, likeCount: Number(likeCountResult?.count ?? 0), isLiked, author: authorSummary };
}

router.get("/feed", async (req, res) => {
  if (!req.session.userId) {
    // Return recent public posts for non-logged in users
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const [totalResult] = await db.select({ count: count() }).from(postsTable);
    const total = Number(totalResult?.count ?? 0);
    const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);
    const enriched = await Promise.all(posts.map(p => enrichPost(p)));
    res.json({ posts: enriched, total, page, totalPages: Math.ceil(total / limit) });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;

  const follows = await db.select({ followingId: followsTable.followingId })
    .from(followsTable).where(eq(followsTable.followerId, req.session.userId));
  const followingIds = [req.session.userId, ...follows.map(f => f.followingId)];

  const [totalResult] = await db.select({ count: count() }).from(postsTable).where(inArray(postsTable.userId, followingIds));
  const total = Number(totalResult?.count ?? 0);

  const posts = await db.select().from(postsTable)
    .where(inArray(postsTable.userId, followingIds))
    .orderBy(desc(postsTable.createdAt))
    .limit(limit).offset(offset);

  const enriched = await Promise.all(posts.map(p => enrichPost(p, req.session.userId)));
  res.json({ posts: enriched, total, page, totalPages: Math.ceil(total / limit) });
});

router.post("/posts", requireAuth, async (req, res) => {
  const { content, imageUrl } = req.body;
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "Content is required" }); return;
  }
  const [post] = await db.insert(postsTable).values({
    userId: req.session.userId!,
    content: content.trim(),
    imageUrl: imageUrl || null,
  }).returning();

  const enriched = await enrichPost(post, req.session.userId);
  res.status(201).json(enriched);
});

router.get("/posts/:postId", async (req, res) => {
  const postId = parseInt(req.params.postId);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) { res.status(404).json({ error: "Not found" }); return; }

  const enriched = await enrichPost(post, req.session.userId);
  res.json(enriched);
});

router.delete("/posts/:postId", requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) { res.status(404).json({ error: "Not found" }); return; }

  // Check ownership or admin
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (post.userId !== req.session.userId && !me?.isAdmin) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(postsTable).where(eq(postsTable.id, postId));
  res.json({ success: true, message: "Post deleted" });
});

router.post("/posts/:postId/like", requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const existing = await db.select().from(postLikesTable)
    .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, req.session.userId!)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(postLikesTable).values({ postId, userId: req.session.userId! });
  }
  res.json({ success: true, message: "Liked" });
});

router.post("/posts/:postId/unlike", requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db.delete(postLikesTable)
    .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, req.session.userId!)));

  res.json({ success: true, message: "Unliked" });
});

export default router;
