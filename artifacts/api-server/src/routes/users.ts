import { Router } from "express";
import {
  artistProfilesTable,
  creatorProfileSettingsTable,
  customFeedsTable,
  db,
  followsTable,
  friendshipsTable,
  galleryItemsTable,
  postMediaTable,
  postsTable,
  profileReactionsTable,
  userPhotoItemsTable,
  userProfileDetailsTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  enrichPost,
  formatArtistProfile,
  formatUser,
  getCustomFeeds,
  getFriendshipState,
  getProfileReactionSummary,
  getUserSummary,
} from "./helpers.js";
import { createNotification } from "../lib/notifications.js";

const router = Router();
const REACTION_TYPES = ["like", "heart", "wow", "angry"] as const;

router.get("/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Not found", message: "User not found" });
    return;
  }

  let isFollowing = false;
  let friendship = { status: "none", isFriend: false };
  if (req.session.userId && req.session.userId !== userId) {
    const [follow] = await db.select().from(followsTable)
      .where(and(eq(followsTable.followerId, req.session.userId), eq(followsTable.followingId, userId)))
      .limit(1);
    isFollowing = !!follow;
    friendship = await getFriendshipState(req.session.userId, userId);
  }

  const [artistProfile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);
  const [details] = await db.select().from(userProfileDetailsTable).where(eq(userProfileDetailsTable.userId, userId)).limit(1);
  const [creatorSettings] = await db.select().from(creatorProfileSettingsTable).where(eq(creatorProfileSettingsTable.userId, userId)).limit(1);
  const profileReactions = await getProfileReactionSummary(userId, req.session.userId);

  const pinnedPost = creatorSettings?.pinnedPostId
    ? await db.select().from(postsTable).where(eq(postsTable.id, creatorSettings.pinnedPostId)).limit(1)
    : [];

  res.json({
    user: await formatUser(user),
    isFollowing,
    friendship,
    profileReactions,
    details: details ?? null,
    artistProfile: artistProfile ? await formatArtistProfile(artistProfile, user) : null,
    creatorSettings: {
      primaryActionType: creatorSettings?.primaryActionType ?? "contact",
      primaryActionLabel: creatorSettings?.primaryActionLabel ?? "Contact Me",
      primaryActionUrl: creatorSettings?.primaryActionUrl ?? null,
      featuredTitle: creatorSettings?.featuredTitle ?? null,
      featuredDescription: creatorSettings?.featuredDescription ?? null,
      featuredUrl: creatorSettings?.featuredUrl ?? null,
      featuredType: creatorSettings?.featuredType ?? "highlight",
      moodPreset: creatorSettings?.moodPreset ?? "sleek",
      layoutTemplate: creatorSettings?.layoutTemplate ?? "portfolio",
      fontPreset: creatorSettings?.fontPreset ?? "modern",
      enabledModules: creatorSettings?.enabledModules ?? ["featured", "about", "media", "posts", "events", "contact"],
      moduleOrder: creatorSettings?.moduleOrder ?? ["featured", "about", "media", "posts", "events", "contact"],
      pinnedPost: pinnedPost[0] ? await enrichPost(pinnedPost[0], req.session.userId) : null,
    },
    customFeeds: req.session.userId === userId ? await getCustomFeeds(userId) : [],
  });
});

router.post("/:userId/update", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const {
    bio,
    avatarUrl,
    bannerUrl,
    location,
    city,
    age,
    work,
    school,
    about,
    interests,
    accentColor,
    themeName,
    links,
    featuredContent,
  } = req.body;

  const [updated] = await db.update(usersTable)
    .set({ bio: bio ?? null, avatarUrl: avatarUrl ?? null, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  await db.insert(userProfileDetailsTable).values({
    userId,
    bannerUrl: bannerUrl ?? null,
    location: location ?? null,
    city: city ?? null,
    age: Number.isFinite(Number(age)) ? Number(age) : null,
    work: work ?? null,
    school: school ?? null,
    about: about ?? null,
    interests: Array.isArray(interests) ? interests : [],
    accentColor: accentColor ?? "#8b5cf6",
    themeName: themeName ?? "nocturne",
    links: Array.isArray(links) ? links : [],
    featuredContent: featuredContent ?? null,
  }).onConflictDoUpdate({
    target: userProfileDetailsTable.userId,
    set: {
      bannerUrl: bannerUrl ?? null,
      location: location ?? null,
      city: city ?? null,
      age: Number.isFinite(Number(age)) ? Number(age) : null,
      work: work ?? null,
      school: school ?? null,
      about: about ?? null,
      interests: Array.isArray(interests) ? interests : [],
      accentColor: accentColor ?? "#8b5cf6",
      themeName: themeName ?? "nocturne",
      links: Array.isArray(links) ? links : [],
      featuredContent: featuredContent ?? null,
      updatedAt: new Date(),
    },
  });

  res.json(await formatUser(updated));
});

router.post("/:userId/follow", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  if (userId === req.session.userId) {
    res.status(400).json({ error: "Cannot follow yourself" });
    return;
  }

  const [follow] = await db.insert(followsTable).values({
    followerId: req.session.userId!,
    followingId: userId,
  }).onConflictDoNothing().returning();

  if (follow) {
    const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    if (actor) {
      await createNotification({
        userId,
        actorUserId: actor.id,
        type: "follow",
        title: "New follower",
        body: `${actor.username} started following you.`,
        href: `/profile/${actor.id}`,
        entityType: "follow",
        entityId: follow.id,
      });
    }
  }

  res.json({ success: true, message: "Followed" });
});

router.post("/:userId/unfollow", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(followsTable)
    .where(and(eq(followsTable.followerId, req.session.userId!), eq(followsTable.followingId, userId)));

  res.json({ success: true, message: "Unfollowed" });
});

router.post("/:userId/friend-request", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  if (userId === req.session.userId) {
    res.status(400).json({ error: "Cannot friend yourself" });
    return;
  }

  const state = await getFriendshipState(req.session.userId, userId);
  if (state.status === "friends" || state.status === "outgoing") {
    res.json({ success: true, message: state.status === "friends" ? "Already friends" : "Request already sent" });
    return;
  }
  if (state.status === "incoming" && state.id) {
    const [friendship] = await db.update(friendshipsTable)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(friendshipsTable.id, state.id))
      .returning();
    res.json({ success: true, message: "Friend request accepted", friendship });
    return;
  }

  const [friendship] = await db.insert(friendshipsTable).values({
    requesterUserId: req.session.userId!,
    addresseeUserId: userId,
    status: "pending",
  }).returning();

  const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (actor) {
    await createNotification({
      userId,
      actorUserId: actor.id,
      type: "friend_request",
      title: "New friend request",
      body: `${actor.username} sent you a friend request.`,
      href: `/profile/${actor.id}`,
      entityType: "friend_request",
      entityId: friendship.id,
    });
  }

  res.status(201).json({ success: true, message: "Friend request sent", friendship });
});

router.post("/:userId/friend-request/accept", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [friendship] = await db.update(friendshipsTable)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(and(
      eq(friendshipsTable.requesterUserId, userId),
      eq(friendshipsTable.addresseeUserId, req.session.userId!),
      eq(friendshipsTable.status, "pending"),
    ))
    .returning();

  if (!friendship) {
    res.status(404).json({ error: "Friend request not found" });
    return;
  }

  const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (actor) {
    await createNotification({
      userId,
      actorUserId: actor.id,
      type: "friend_accept",
      title: "Friend request accepted",
      body: `${actor.username} accepted your friend request.`,
      href: `/profile/${actor.id}`,
      entityType: "friendship",
      entityId: friendship.id,
    });
  }

  res.json({ success: true, message: "Friend request accepted", friendship });
});

router.delete("/:userId/friend", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(friendshipsTable).where(and(
    or(
      and(eq(friendshipsTable.requesterUserId, req.session.userId!), eq(friendshipsTable.addresseeUserId, userId)),
      and(eq(friendshipsTable.requesterUserId, userId), eq(friendshipsTable.addresseeUserId, req.session.userId!)),
    ),
  ));

  res.json({ success: true, message: "Friend connection removed" });
});

router.post("/:userId/react", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  const reactionType = typeof req.body?.reactionType === "string" ? req.body.reactionType : "";
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  if (userId === req.session.userId) {
    res.status(400).json({ error: "Cannot react to yourself" });
    return;
  }
  if (!REACTION_TYPES.includes(reactionType as (typeof REACTION_TYPES)[number])) {
    res.status(400).json({ error: "Invalid reaction type" });
    return;
  }

  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(profileReactionsTable).values({
    targetUserId: userId,
    reactorUserId: req.session.userId!,
    reactionType,
  }).onConflictDoUpdate({
    target: [profileReactionsTable.targetUserId, profileReactionsTable.reactorUserId],
    set: {
      reactionType,
      updatedAt: new Date(),
    },
  });

  const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (actor) {
    await createNotification({
      userId,
      actorUserId: actor.id,
      type: "profile_reaction",
      title: "New profile reaction",
      body: `${actor.username} reacted ${reactionType} to your profile.`,
      href: `/profile/${actor.id}`,
      entityType: "profile_reaction",
      entityId: userId,
    });
  }

  res.json(await getProfileReactionSummary(userId, req.session.userId));
});

router.post("/:userId/reaction/remove", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(profileReactionsTable).where(and(
    eq(profileReactionsTable.targetUserId, userId),
    eq(profileReactionsTable.reactorUserId, req.session.userId!),
  ));

  res.json(await getProfileReactionSummary(userId, req.session.userId));
});

router.get("/:userId/followers", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const follows = await db.select({ followerId: followsTable.followerId }).from(followsTable).where(eq(followsTable.followingId, userId));
  const followerIds = follows.map((entry) => entry.followerId);
  if (followerIds.length === 0) {
    res.json([]);
    return;
  }

  const followers = await db.select().from(usersTable).where(inArray(usersTable.id, followerIds));
  res.json(await Promise.all(followers.map((user) => getUserSummary(user))));
});

router.get("/:userId/following", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const follows = await db.select({ followingId: followsTable.followingId }).from(followsTable).where(eq(followsTable.followerId, userId));
  const followingIds = follows.map((entry) => entry.followingId);
  if (followingIds.length === 0) {
    res.json([]);
    return;
  }

  const following = await db.select().from(usersTable).where(inArray(usersTable.id, followingIds));
  res.json(await Promise.all(following.map((user) => getUserSummary(user))));
});

router.get("/:userId/posts", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const posts = await db.select().from(postsTable)
    .where(eq(postsTable.userId, userId))
    .orderBy(desc(postsTable.createdAt));

  res.json({
    posts: await Promise.all(posts.map((post) => enrichPost(post, req.session.userId))),
    total: posts.length,
    page: 1,
    totalPages: 1,
  });
});

router.get("/:userId/photos", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const photos = await db.select().from(userPhotoItemsTable)
    .where(eq(userPhotoItemsTable.userId, userId))
    .orderBy(desc(userPhotoItemsTable.createdAt));

  res.json(photos);
});

router.post("/:userId/photos", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { imageUrl, caption } = req.body;
  if (!imageUrl || typeof imageUrl !== "string") {
    res.status(400).json({ error: "imageUrl is required" });
    return;
  }

  const [photo] = await db.insert(userPhotoItemsTable).values({
    userId,
    imageUrl,
    caption: typeof caption === "string" ? caption : null,
  }).returning();

  res.status(201).json(photo);
});

router.delete("/:userId/photos/:photoId", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  const photoId = Number(req.params.photoId);
  if (Number.isNaN(userId) || Number.isNaN(photoId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(userPhotoItemsTable)
    .where(and(eq(userPhotoItemsTable.userId, userId), eq(userPhotoItemsTable.id, photoId)));

  res.json({ success: true, message: "Photo deleted" });
});

router.post("/:userId/creator-settings", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const {
    primaryActionType,
    primaryActionLabel,
    primaryActionUrl,
    featuredTitle,
    featuredDescription,
    featuredUrl,
    featuredType,
    moodPreset,
    layoutTemplate,
    fontPreset,
    enabledModules,
    moduleOrder,
    pinnedPostId,
  } = req.body;

  await db.insert(creatorProfileSettingsTable).values({
    userId,
    primaryActionType: primaryActionType ?? "contact",
    primaryActionLabel: primaryActionLabel ?? "Contact Me",
    primaryActionUrl: primaryActionUrl ?? null,
    featuredTitle: featuredTitle ?? null,
    featuredDescription: featuredDescription ?? null,
    featuredUrl: featuredUrl ?? null,
    featuredType: featuredType ?? "highlight",
    moodPreset: moodPreset ?? "sleek",
    layoutTemplate: layoutTemplate ?? "portfolio",
    fontPreset: fontPreset ?? "modern",
    enabledModules: Array.isArray(enabledModules) ? enabledModules : ["featured", "about", "media", "posts", "events", "contact"],
    moduleOrder: Array.isArray(moduleOrder) ? moduleOrder : ["featured", "about", "media", "posts", "events", "contact"],
    pinnedPostId: pinnedPostId ?? null,
  }).onConflictDoUpdate({
    target: creatorProfileSettingsTable.userId,
    set: {
      primaryActionType: primaryActionType ?? "contact",
      primaryActionLabel: primaryActionLabel ?? "Contact Me",
      primaryActionUrl: primaryActionUrl ?? null,
      featuredTitle: featuredTitle ?? null,
      featuredDescription: featuredDescription ?? null,
      featuredUrl: featuredUrl ?? null,
      featuredType: featuredType ?? "highlight",
      moodPreset: moodPreset ?? "sleek",
      layoutTemplate: layoutTemplate ?? "portfolio",
      fontPreset: fontPreset ?? "modern",
      enabledModules: Array.isArray(enabledModules) ? enabledModules : ["featured", "about", "media", "posts", "events", "contact"],
      moduleOrder: Array.isArray(moduleOrder) ? moduleOrder : ["featured", "about", "media", "posts", "events", "contact"],
      pinnedPostId: pinnedPostId ?? null,
      updatedAt: new Date(),
    },
  });

  res.json({ success: true, message: "Creator settings updated" });
});

router.get("/:userId/media", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const posts = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.userId, userId));
  const postIds = posts.map((post) => post.id);
  if (postIds.length === 0) {
    res.json([]);
    return;
  }

  const media = await db.select().from(postMediaTable).where(inArray(postMediaTable.postId, postIds)).orderBy(desc(postMediaTable.createdAt));
  res.json(media);
});

router.get("/:userId/custom-feeds", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(await getCustomFeeds(userId));
});

router.get("/:userId/gallery", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [profile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);
  if (!profile) {
    res.json([]);
    return;
  }
  const gallery = await db.select().from(galleryItemsTable).where(eq(galleryItemsTable.artistId, profile.id)).orderBy(desc(galleryItemsTable.createdAt));
  res.json(gallery);
});

export default router;
