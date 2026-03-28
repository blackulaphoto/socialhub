import { Router } from "express";
import { db, usersTable, followsTable, postsTable, artistProfilesTable, galleryItemsTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getUserCounts, formatUser } from "./auth.js";

const router = Router();

async function getUserSummary(user: typeof usersTable.$inferSelect) {
  const [followerResult] = await db.select({ count: count() }).from(followsTable).where(eq(followsTable.followingId, user.id));
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    profileType: user.profileType,
    followerCount: Number(followerResult?.count ?? 0),
  };
}

router.get("/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found", message: "User not found" }); return; }

  const counts = await getUserCounts(userId);

  let isFollowing = false;
  if (req.session.userId && req.session.userId !== userId) {
    const [follow] = await db.select().from(followsTable)
      .where(and(eq(followsTable.followerId, req.session.userId), eq(followsTable.followingId, userId)))
      .limit(1);
    isFollowing = !!follow;
  }

  let artistProfile = null;
  if (user.profileType === "artist") {
    const [profile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);
    if (profile) {
      const gallery = await db.select().from(galleryItemsTable).where(eq(galleryItemsTable.artistId, profile.id)).orderBy(desc(galleryItemsTable.createdAt));
      const userSummary = await getUserSummary(user);
      artistProfile = {
        ...profile,
        gallery,
        user: userSummary,
      };
    }
  }

  res.json({
    user: formatUser(user, counts),
    isFollowing,
    artistProfile,
  });
});

router.post("/:userId/update", requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const { bio, avatarUrl } = req.body;
  const [updated] = await db.update(usersTable)
    .set({ bio: bio ?? null, avatarUrl: avatarUrl ?? null, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  const counts = await getUserCounts(userId);
  res.json(formatUser(updated, counts));
});

router.post("/:userId/follow", requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  if (userId === req.session.userId) { res.status(400).json({ error: "Cannot follow yourself" }); return; }

  const existing = await db.select().from(followsTable)
    .where(and(eq(followsTable.followerId, req.session.userId!), eq(followsTable.followingId, userId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(followsTable).values({ followerId: req.session.userId!, followingId: userId });
  }

  res.json({ success: true, message: "Followed" });
});

router.post("/:userId/unfollow", requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db.delete(followsTable)
    .where(and(eq(followsTable.followerId, req.session.userId!), eq(followsTable.followingId, userId)));

  res.json({ success: true, message: "Unfollowed" });
});

router.get("/:userId/followers", async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const follows = await db.select({ followerId: followsTable.followerId })
    .from(followsTable).where(eq(followsTable.followingId, userId));

  const followerIds = follows.map(f => f.followerId);
  if (followerIds.length === 0) { res.json([]); return; }

  const followers = await Promise.all(
    followerIds.map(async (id) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
      if (!u) return null;
      return getUserSummary(u);
    })
  );

  res.json(followers.filter(Boolean));
});

router.get("/:userId/following", async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const follows = await db.select({ followingId: followsTable.followingId })
    .from(followsTable).where(eq(followsTable.followerId, userId));

  const followingIds = follows.map(f => f.followingId);
  if (followingIds.length === 0) { res.json([]); return; }

  const following = await Promise.all(
    followingIds.map(async (id) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
      if (!u) return null;
      return getUserSummary(u);
    })
  );

  res.json(following.filter(Boolean));
});

router.get("/:userId/posts", async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;

  const [totalResult] = await db.select({ count: count() }).from(postsTable).where(eq(postsTable.userId, userId));
  const total = Number(totalResult?.count ?? 0);

  const posts = await db.select().from(postsTable)
    .where(eq(postsTable.userId, userId))
    .orderBy(desc(postsTable.createdAt))
    .limit(limit).offset(offset);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const author = await getUserSummary(user);

  const enriched = await Promise.all(posts.map(async (post) => {
    const [likeResult] = await db.select({ count: count() }).from(postsTable).where(eq(postsTable.id, post.id));
    const { postLikesTable } = await import("@workspace/db");
    const [likeCountResult] = await db.select({ count: count() }).from(postLikesTable).where(eq(postLikesTable.postId, post.id));
    let isLiked = false;
    if (req.session.userId) {
      const [liked] = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, req.session.userId))).limit(1);
      isLiked = !!liked;
    }
    return { ...post, likeCount: Number(likeCountResult?.count ?? 0), isLiked, author };
  }));

  res.json({ posts: enriched, total, page, totalPages: Math.ceil(total / limit) });
});

export { getUserSummary };
export default router;
