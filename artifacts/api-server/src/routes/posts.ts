import { Router } from "express";
import {
  artistProfilesTable,
  customFeedsTable,
  db,
  followsTable,
  groupMembersTable,
  groupsTable,
  postCommentsTable,
  postLikesTable,
  postReactionsTable,
  postMediaTable,
  postsTable,
  userProfileDetailsTable,
  usersTable,
} from "@workspace/db";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  canUsersInteract,
  canViewPost,
  enrichPost,
  formatUser,
  getPostsForUserIds,
  getUserSummary,
} from "./helpers.js";
import { createNotification } from "../lib/notifications.js";
import { notifyMentionedUsers } from "../lib/mentions.js";

const router = Router();
const REACTION_TYPES = ["like", "heart", "wow", "angry"] as const;

async function resolveFeedUserIds(
  currentUserId: number | undefined,
  mode: string,
  city?: string,
  customFeedId?: number,
) {
  if (!currentUserId) {
    const users = await db.select({ id: usersTable.id }).from(usersTable);
    return users.map((user) => user.id);
  }

  if (mode === "following") {
    const follows = await db.select({ followingId: followsTable.followingId }).from(followsTable).where(eq(followsTable.followerId, currentUserId));
    return [currentUserId, ...follows.map((entry) => entry.followingId)];
  }

  if (mode === "local") {
    const targetCity = city?.trim();
    const rows = await db.select().from(userProfileDetailsTable)
      .where(targetCity ? ilike(userProfileDetailsTable.city, `%${targetCity}%`) : undefined);
    const localUserIds = rows.map((row) => row.userId);
    return localUserIds.length > 0 ? localUserIds : [currentUserId];
  }

  if (mode === "custom" && customFeedId) {
    const [feed] = await db.select().from(customFeedsTable)
      .where(and(eq(customFeedsTable.id, customFeedId), eq(customFeedsTable.ownerId, currentUserId)))
      .limit(1);
    if (!feed) return [currentUserId];

    const artistConditions = [];
    if (feed.categories.length > 0) {
      artistConditions.push(or(...feed.categories.map((category) => ilike(artistProfilesTable.category, `%${category}%`))));
    }
    if (feed.locations.length > 0) {
      artistConditions.push(or(...feed.locations.map((location) => ilike(artistProfilesTable.location, `%${location}%`))));
    }
    if (feed.tags.length > 0) {
      artistConditions.push(sql`${artistProfilesTable.tags} && ARRAY[${sql.join(feed.tags.map((tag) => sql`${tag}`), sql`, `)}]::text[]`);
    }

    const artistMatches = artistConditions.length > 0
      ? await db.select({ userId: artistProfilesTable.userId }).from(artistProfilesTable).where(and(...artistConditions))
      : [];

    return [...new Set([currentUserId, ...feed.includedUserIds, ...artistMatches.map((match) => match.userId)])];
  }

  if (mode === "discovery") {
    const artists = await db.select({ userId: artistProfilesTable.userId }).from(artistProfilesTable).orderBy(desc(artistProfilesTable.updatedAt)).limit(30);
    return [...new Set([currentUserId, ...artists.map((artist) => artist.userId)])];
  }

  const users = await db.select({ id: usersTable.id }).from(usersTable);
  return users.map((user) => user.id);
}

router.get("/feed", async (req, res) => {
  const mode = String(req.query.mode || (req.session.userId ? "following" : "discovery"));
  const city = typeof req.query.city === "string" ? req.query.city : undefined;
  const customFeedId = req.query.customFeedId ? Number(req.query.customFeedId) : undefined;
  const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const userIds = await resolveFeedUserIds(req.session.userId, mode, city, customFeedId);
  const page = await getPostsForUserIds(userIds, req.session.userId, { cursor, limit });
  res.json({
    posts: page.posts,
    total: page.posts.length,
    limit: Math.min(Math.max(limit ?? 12, 1), 30),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    mode,
  });
});

router.post("/posts", requireAuth, async (req, res) => {
  const { content, imageUrl, media, groupId, repostOfPostId, visibility, actorSurface } = req.body;
  const normalizedContent = typeof content === "string" ? content.trim() : "";
  const normalizedRepostOfPostId = repostOfPostId ? Number(repostOfPostId) : null;
  const normalizedVisibility = typeof visibility === "string" && ["public", "friends", "private"].includes(visibility)
    ? visibility
    : "public";
  const normalizedActorSurface = actorSurface === "artist" ? "artist" : "personal";

  const hasMedia = Boolean(
    (typeof imageUrl === "string" && imageUrl.trim()) ||
    (Array.isArray(media) && media.length > 0),
  );

  if (!normalizedContent && !normalizedRepostOfPostId && !hasMedia) {
    res.status(400).json({ error: "Content or media is required" });
    return;
  }

  if (normalizedRepostOfPostId && Number.isNaN(normalizedRepostOfPostId)) {
    res.status(400).json({ error: "Invalid repost target" });
    return;
  }

  if (normalizedRepostOfPostId) {
    const [originalPost] = await db.select().from(postsTable).where(eq(postsTable.id, normalizedRepostOfPostId)).limit(1);
    if (!originalPost) {
      res.status(404).json({ error: "Original post not found" });
      return;
    }
  }

  if (groupId) {
    const normalizedGroupId = Number(groupId);
    if (Number.isNaN(normalizedGroupId)) {
      res.status(400).json({ error: "Invalid group" });
      return;
    }

    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, normalizedGroupId)).limit(1);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const [membership] = await db.select().from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, normalizedGroupId), eq(groupMembersTable.userId, req.session.userId!)))
      .limit(1);
    const isOwner = group.ownerId === req.session.userId;
    if (!membership && !isOwner) {
      res.status(403).json({ error: "Join the group before posting" });
      return;
    }
  }

  const [post] = await db.insert(postsTable).values({
    userId: req.session.userId!,
    actorSurface: normalizedActorSurface,
    content: normalizedContent,
    imageUrl: imageUrl || media?.[0]?.url || null,
    visibility: normalizedVisibility,
    repostOfPostId: normalizedRepostOfPostId,
  }).returning();

  if (Array.isArray(media) && media.length > 0) {
    await db.insert(postMediaTable).values(
      media.map((item: { type: string; url: string; title?: string; thumbnailUrl?: string }) => ({
        postId: post.id,
        type: item.type,
        url: item.url,
        title: item.title || null,
        thumbnailUrl: item.thumbnailUrl || null,
      })),
    );
  }

  if (groupId) {
    const { groupPostsTable } = await import("@workspace/db");
    await db.insert(groupPostsTable).values({ groupId: Number(groupId), postId: post.id }).onConflictDoNothing();
  }

  await notifyMentionedUsers({
    actorUserId: req.session.userId!,
    content: normalizedContent,
    href: `/profile/${req.session.userId}#post-${post.id}`,
    title: "You were mentioned in a post",
    body: "You were mentioned in a post.",
    entityType: "post",
    entityId: post.id,
  });

  res.status(201).json(await enrichPost(post, req.session.userId));
});

router.post("/posts/:postId/update", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (post.userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { content, imageUrl, media, visibility, actorSurface } = req.body;
  const normalizedContent = typeof content === "string" ? content.trim() : post.content;
  const normalizedVisibility = typeof visibility === "string" && ["public", "friends", "private"].includes(visibility)
    ? visibility
    : post.visibility;
  const normalizedActorSurface = actorSurface === "artist" ? "artist" : actorSurface === "personal" ? "personal" : post.actorSurface;

  const [updated] = await db.update(postsTable).set({
    actorSurface: normalizedActorSurface,
    content: normalizedContent,
    imageUrl: typeof imageUrl === "string" ? imageUrl : null,
    visibility: normalizedVisibility,
    updatedAt: new Date(),
  }).where(eq(postsTable.id, postId)).returning();

  if (Array.isArray(media)) {
    await db.delete(postMediaTable).where(eq(postMediaTable.postId, postId));
    if (media.length > 0) {
      await db.insert(postMediaTable).values(
        media.map((item: { type: string; url: string; title?: string; thumbnailUrl?: string }) => ({
          postId,
          type: item.type,
          url: item.url,
          title: item.title || null,
          thumbnailUrl: item.thumbnailUrl || null,
        })),
      );
    }
  }

  await notifyMentionedUsers({
    actorUserId: req.session.userId!,
    content: normalizedContent,
    href: `/profile/${req.session.userId}#post-${postId}`,
    title: "You were mentioned in an updated post",
    body: "You were mentioned in an updated post.",
    entityType: "post",
    entityId: postId,
  });

  res.json(await enrichPost(updated, req.session.userId));
});

router.get("/posts/:postId", async (req, res) => {
  const postId = Number(req.params.postId);
  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await canViewPost(post, req.session.userId))) {
    res.status(403).json({ error: "You cannot view this post" });
    return;
  }

  res.json(await enrichPost(post, req.session.userId));
});

router.delete("/posts/:postId", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await canViewPost(post, req.session.userId)) || !(await canUsersInteract(req.session.userId, post.userId))) {
    res.status(403).json({ error: "You cannot react to this post" });
    return;
  }
  if (post.userId !== req.session.userId && !me?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(postsTable).where(eq(postsTable.id, postId));
  res.json({ success: true, message: "Post deleted" });
});

router.post("/posts/:postId/like", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await canViewPost(post, req.session.userId)) || !(await canUsersInteract(req.session.userId, post.userId))) {
    res.status(403).json({ error: "You cannot react to this post" });
    return;
  }

  await db.insert(postReactionsTable).values({
    postId,
    userId: req.session.userId!,
    reactionType: "like",
  }).onConflictDoUpdate({
    target: [postReactionsTable.postId, postReactionsTable.userId],
    set: {
      reactionType: "like",
      updatedAt: new Date(),
    },
  });

  const [like] = await db.insert(postLikesTable).values({ postId, userId: req.session.userId! }).onConflictDoNothing().returning();
  if (like && post.userId !== req.session.userId) {
    const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    if (actor) {
      await createNotification({
        userId: post.userId,
        actorUserId: actor.id,
        type: "like",
        title: "New like",
        body: `${actor.username} liked one of your posts.`,
        href: `/profile/${actor.id}`,
        entityType: "post_like",
        entityId: like.id,
      });
    }
  }
  res.json({ success: true, message: "Liked" });
});

router.post("/posts/:postId/unlike", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(postLikesTable).where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, req.session.userId!)));
  await db.delete(postReactionsTable).where(and(eq(postReactionsTable.postId, postId), eq(postReactionsTable.userId, req.session.userId!), eq(postReactionsTable.reactionType, "like")));
  res.json({ success: true, message: "Unliked" });
});

router.post("/posts/:postId/react", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  const reactionType = typeof req.body?.reactionType === "string" ? req.body.reactionType : "";
  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  if (!REACTION_TYPES.includes(reactionType as (typeof REACTION_TYPES)[number])) {
    res.status(400).json({ error: "Invalid reaction type" });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.insert(postReactionsTable).values({
    postId,
    userId: req.session.userId!,
    reactionType,
  }).onConflictDoUpdate({
    target: [postReactionsTable.postId, postReactionsTable.userId],
    set: {
      reactionType,
      updatedAt: new Date(),
    },
  });

  if (reactionType === "like") {
    await db.insert(postLikesTable).values({ postId, userId: req.session.userId! }).onConflictDoNothing();
  } else {
    await db.delete(postLikesTable).where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, req.session.userId!)));
  }

  if (post.userId !== req.session.userId) {
    const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    if (actor) {
      await createNotification({
        userId: post.userId,
        actorUserId: actor.id,
        type: "reaction",
        title: "New reaction",
        body: `${actor.username} reacted ${reactionType} to your post.`,
        href: `/profile/${actor.id}`,
        entityType: "post_reaction",
        entityId: postId,
      });
    }
  }

  res.json(await enrichPost(post, req.session.userId));
});

router.post("/posts/:postId/reaction/remove", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(postReactionsTable).where(and(eq(postReactionsTable.postId, postId), eq(postReactionsTable.userId, req.session.userId!)));
  await db.delete(postLikesTable).where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, req.session.userId!)));

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.json({ success: true, message: "Reaction removed" });
    return;
  }

  res.json(await enrichPost(post, req.session.userId));
});

router.post("/posts/:postId/repost", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [originalPost] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!originalPost) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await canViewPost(originalPost, req.session.userId)) || !(await canUsersInteract(req.session.userId, originalPost.userId))) {
    res.status(403).json({ error: "You cannot repost this post" });
    return;
  }

  const [repost] = await db.insert(postsTable).values({
    userId: req.session.userId!,
    actorSurface: originalPost.actorSurface ?? "personal",
    content,
    repostOfPostId: postId,
    imageUrl: null,
  }).returning();

  if (originalPost.userId !== req.session.userId) {
    const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    if (actor) {
      await createNotification({
        userId: originalPost.userId,
        actorUserId: actor.id,
        type: "repost",
        title: "New repost",
        body: `${actor.username} reposted one of your posts.`,
        href: `/profile/${actor.id}`,
        entityType: "repost",
        entityId: repost.id,
      });
    }
  }

  res.status(201).json(await enrichPost(repost, req.session.userId));
});

router.get("/posts/:postId/comments", async (req, res) => {
  const postId = Number(req.params.postId);
  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await canViewPost(post, req.session.userId))) {
    res.status(403).json({ error: "You cannot view comments for this post" });
    return;
  }

  res.json((await enrichPost(post, req.session.userId)).comments || []);
});

router.post("/posts/:postId/comments", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  const parentCommentId = req.body?.parentCommentId ? Number(req.body.parentCommentId) : null;
  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  if (!content) {
    res.status(400).json({ error: "Comment content is required" });
    return;
  }
  if (parentCommentId && Number.isNaN(parentCommentId)) {
    res.status(400).json({ error: "Invalid parent comment ID" });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await canViewPost(post, req.session.userId)) || !(await canUsersInteract(req.session.userId, post.userId))) {
    res.status(403).json({ error: "You cannot comment on this post" });
    return;
  }

  const [comment] = await db.insert(postCommentsTable).values({
    postId,
    userId: req.session.userId!,
    parentCommentId,
    content,
  }).returning();

  if (post.userId !== req.session.userId) {
    const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    if (actor) {
      await createNotification({
        userId: post.userId,
        actorUserId: actor.id,
        type: "comment",
        title: "New comment",
        body: `${actor.username} commented on your post.`,
        href: `/profile/${actor.id}#post-${postId}`,
        entityType: "post_comment",
        entityId: comment.id,
      });
    }
  }

  await notifyMentionedUsers({
    actorUserId: req.session.userId!,
    content,
    href: `/profile/${post.userId}#post-${postId}`,
    title: "You were mentioned in a comment",
    body: "You were mentioned in a comment.",
    entityType: "post_comment",
    entityId: comment.id,
  });

  res.status(201).json((await enrichPost(post, req.session.userId)).comments || []);
});

router.delete("/posts/:postId/comments/:commentId", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  const commentId = Number(req.params.commentId);
  if (Number.isNaN(postId) || Number.isNaN(commentId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [comment] = await db.select().from(postCommentsTable).where(and(
    eq(postCommentsTable.id, commentId),
    eq(postCommentsTable.postId, postId),
  )).limit(1);
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!comment) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (comment.userId !== req.session.userId && !me?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(postCommentsTable).where(eq(postCommentsTable.id, commentId));
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.json({ success: true, message: "Comment deleted" });
    return;
  }
  res.json((await enrichPost(post, req.session.userId)).comments || []);
});

router.get("/custom-feeds", requireAuth, async (req, res) => {
  const feeds = await db.select().from(customFeedsTable).where(eq(customFeedsTable.ownerId, req.session.userId!)).orderBy(desc(customFeedsTable.updatedAt));
  res.json(feeds);
});

router.post("/custom-feeds", requireAuth, async (req, res) => {
  const { name, description, includedUserIds, categories, tags, locations } = req.body;
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const [feed] = await db.insert(customFeedsTable).values({
    ownerId: req.session.userId!,
    name,
    description: description || null,
    includedUserIds: Array.isArray(includedUserIds) ? includedUserIds.map(Number) : [],
    categories: Array.isArray(categories) ? categories : [],
    tags: Array.isArray(tags) ? tags : [],
    locations: Array.isArray(locations) ? locations : [],
  }).returning();

  res.status(201).json(feed);
});

router.post("/custom-feeds/:feedId", requireAuth, async (req, res) => {
  const feedId = Number(req.params.feedId);
  if (Number.isNaN(feedId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const { name, description, includedUserIds, categories, tags, locations } = req.body;
  const [feed] = await db.update(customFeedsTable).set({
    name,
    description: description || null,
    includedUserIds: Array.isArray(includedUserIds) ? includedUserIds.map(Number) : [],
    categories: Array.isArray(categories) ? categories : [],
    tags: Array.isArray(tags) ? tags : [],
    locations: Array.isArray(locations) ? locations : [],
    updatedAt: new Date(),
  }).where(and(eq(customFeedsTable.id, feedId), eq(customFeedsTable.ownerId, req.session.userId!))).returning();

  if (!feed) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(feed);
});

router.delete("/custom-feeds/:feedId", requireAuth, async (req, res) => {
  const feedId = Number(req.params.feedId);
  if (Number.isNaN(feedId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.delete(customFeedsTable).where(and(eq(customFeedsTable.id, feedId), eq(customFeedsTable.ownerId, req.session.userId!)));
  res.json({ success: true, message: "Custom feed deleted" });
});

router.get("/discover/people", async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(12);
  res.json(await Promise.all(users.map((user) => getUserSummary(user))));
});

export default router;
