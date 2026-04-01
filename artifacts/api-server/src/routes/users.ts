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
  userBlocksTable,
  userPhotoItemsTable,
  userProfileDetailsTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  enrichPost,
  getBlockState,
  canUsersInteract,
  canViewPost,
  formatArtistProfile,
  formatCreatorSettingsRecord,
  formatUser,
  getCustomFeeds,
  getAcceptedFriendIds,
  getFriendshipState,
  getProfileReactionSummary,
  getBlockedUserIds,
  getUserPostsPage,
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
  const blockState = await getBlockState(req.session.userId, userId);
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
  const visiblePinnedPost = pinnedPost[0] && await canViewPost(pinnedPost[0], req.session.userId)
    ? pinnedPost[0]
    : null;

  res.json({
    user: await formatUser(user),
    isFollowing,
    friendship,
    blockState,
    canInteract: !blockState.isBlockedEitherWay,
    profileReactions,
    details: details ?? null,
    artistProfile: artistProfile ? await formatArtistProfile(artistProfile, user, req.session.userId) : null,
    creatorSettings: formatCreatorSettingsRecord(
      creatorSettings,
      visiblePinnedPost ? await enrichPost(visiblePinnedPost, req.session.userId) : null,
    ),
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
    onboardingCompleted,
    onboardingStep,
    links,
    featuredContent,
  } = req.body;
  const [existingDetails] = await db.select().from(userProfileDetailsTable).where(eq(userProfileDetailsTable.userId, userId)).limit(1);

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
    onboardingCompleted: typeof onboardingCompleted === "boolean" ? onboardingCompleted : (existingDetails?.onboardingCompleted ?? false),
    onboardingStep: typeof onboardingStep === "string" ? onboardingStep : (existingDetails?.onboardingStep ?? "profile"),
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
      onboardingCompleted: typeof onboardingCompleted === "boolean" ? onboardingCompleted : (existingDetails?.onboardingCompleted ?? false),
      onboardingStep: typeof onboardingStep === "string" ? onboardingStep : (existingDetails?.onboardingStep ?? "profile"),
      links: Array.isArray(links) ? links : [],
      featuredContent: featuredContent ?? null,
      updatedAt: new Date(),
    },
  });

  res.json(await formatUser(updated));
});

router.get("/:userId/suggested-creators", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const limit = Math.min(Math.max(Number(req.query.limit || 6), 1), 12);
  const [details] = await db.select().from(userProfileDetailsTable).where(eq(userProfileDetailsTable.userId, userId)).limit(1);
  const blockedUserIds = await getBlockedUserIds(userId);
  const interestTerms = (details?.interests || []).map((item) => item.trim()).filter(Boolean);
  const locationTerm = details?.city || details?.location || "";

  const scoreParts = [
    sql<number>`case when ${artistProfilesTable.userId} = ${userId} then -1000 else 0 end`,
    locationTerm
      ? sql<number>`case when coalesce(${artistProfilesTable.location}, '') ilike ${`%${locationTerm}%`} then 5 else 0 end`
      : sql<number>`0`,
    interestTerms.length > 0
      ? sql<number>`cardinality(array(select unnest(coalesce(${artistProfilesTable.tags}, '{}')) intersect select unnest(ARRAY[${sql.join(interestTerms.map((term) => sql`${term}`), sql`, `)}]::text[]))) * 3`
      : sql<number>`0`,
    interestTerms.length > 0
      ? sql<number>`case when ${artistProfilesTable.category} ilike any(ARRAY[${sql.join(interestTerms.map((term) => sql`${`%${term}%`}`), sql`, `)}]::text[]) then 2 else 0 end`
      : sql<number>`0`,
  ];

  const results = await db.select().from(artistProfilesTable)
    .innerJoin(usersTable, eq(artistProfilesTable.userId, usersTable.id))
    .where(and(
      blockedUserIds.length ? notInArray(artistProfilesTable.userId, blockedUserIds) : undefined,
      sql`${artistProfilesTable.userId} <> ${userId}`,
    ))
    .orderBy(desc(sql.join(scoreParts, sql` + `)), desc(artistProfilesTable.updatedAt))
    .limit(limit);

  const followRows = results.length > 0
    ? await db.select({ followingId: followsTable.followingId }).from(followsTable).where(and(
      eq(followsTable.followerId, userId),
      inArray(followsTable.followingId, results.map((row) => row.artist_profiles.userId)),
    ))
    : [];
  const followingSet = new Set(followRows.map((row) => row.followingId));

  const artists = await Promise.all(
    results.map(async (row) => ({
      ...(await formatArtistProfile(row.artist_profiles, row.users, req.session.userId)),
      isFollowing: followingSet.has(row.artist_profiles.userId),
    })),
  );

  res.json({ artists, total: artists.length });
});

router.get("/:userId/suggested-people", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const limit = Math.min(Math.max(Number(req.query.limit || 6), 1), 12);
  const [details] = await db.select().from(userProfileDetailsTable).where(eq(userProfileDetailsTable.userId, userId)).limit(1);
  const blockedUserIds = await getBlockedUserIds(userId);
  const currentFriendIds = await getAcceptedFriendIds(userId);
  const currentFriendSet = new Set(currentFriendIds);
  const interestTerms = (details?.interests || []).map((item) => item.trim().toLowerCase()).filter(Boolean);
  const locationTerms = [details?.city, details?.location].map((item) => item?.trim().toLowerCase()).filter(Boolean) as string[];

  const excludedIds = [...new Set([userId, ...blockedUserIds, ...currentFriendIds])];
  const candidates = await db.select().from(usersTable).where(
    excludedIds.length ? notInArray(usersTable.id, excludedIds) : undefined,
  ).limit(40);

  const candidateIds = candidates.map((candidate) => candidate.id);
  const candidateDetails = candidateIds.length > 0
    ? await db.select().from(userProfileDetailsTable).where(inArray(userProfileDetailsTable.userId, candidateIds))
    : [];
  const candidateDetailsMap = new Map(candidateDetails.map((row) => [row.userId, row]));

  const acceptedFriendships = candidateIds.length > 0
    ? await db.select().from(friendshipsTable).where(
      and(
        eq(friendshipsTable.status, "accepted"),
        or(
          inArray(friendshipsTable.requesterUserId, candidateIds),
          inArray(friendshipsTable.addresseeUserId, candidateIds),
        ),
      ),
    )
    : [];

  const candidateFriendMap = new Map<number, Set<number>>();
  for (const candidateId of candidateIds) {
    candidateFriendMap.set(candidateId, new Set<number>());
  }
  for (const friendship of acceptedFriendships) {
    if (candidateFriendMap.has(friendship.requesterUserId)) {
      candidateFriendMap.get(friendship.requesterUserId)!.add(friendship.addresseeUserId);
    }
    if (candidateFriendMap.has(friendship.addresseeUserId)) {
      candidateFriendMap.get(friendship.addresseeUserId)!.add(friendship.requesterUserId);
    }
  }

  const followRows = candidateIds.length > 0
    ? await db.select({ followingId: followsTable.followingId }).from(followsTable).where(and(
      eq(followsTable.followerId, userId),
      inArray(followsTable.followingId, candidateIds),
    ))
    : [];
  const followingSet = new Set(followRows.map((row) => row.followingId));

  const scoredCandidates = await Promise.all(
    candidates.map(async (candidate) => {
      const candidateProfile = candidateDetailsMap.get(candidate.id);
      const mutualFriendCount = Array.from(candidateFriendMap.get(candidate.id) ?? []).filter((friendId) => currentFriendSet.has(friendId)).length;
      const candidateLocation = [candidateProfile?.city, candidateProfile?.location].map((item) => item?.trim().toLowerCase()).filter(Boolean).join(" ");
      const locationScore = locationTerms.some((term) => candidateLocation.includes(term)) ? 4 : 0;
      const candidateInterests = (candidateProfile?.interests || []).map((item) => item.trim().toLowerCase()).filter(Boolean);
      const sharedInterestCount = candidateInterests.filter((interest) => interestTerms.includes(interest)).length;

      return {
        summary: await getUserSummary(candidate, userId),
        friendship: await getFriendshipState(userId, candidate.id),
        isFollowing: followingSet.has(candidate.id),
        mutualFriendCount,
        score: mutualFriendCount * 5 + sharedInterestCount * 3 + locationScore,
      };
    }),
  );

  const users = scoredCandidates
    .sort((a, b) => b.score - a.score || b.mutualFriendCount - a.mutualFriendCount || a.summary.username.localeCompare(b.summary.username))
    .slice(0, limit)
    .map((item) => ({
      ...item.summary,
      friendship: item.friendship,
      isFollowing: item.isFollowing,
      mutualFriendCount: item.mutualFriendCount,
    }));

  res.json({ users, total: users.length });
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
  if (!(await canUsersInteract(req.session.userId, userId))) {
    res.status(403).json({ error: "Blocked users cannot follow each other" });
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
  if (!(await canUsersInteract(req.session.userId, userId))) {
    res.status(403).json({ error: "Blocked users cannot friend each other" });
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
  if (!(await canUsersInteract(req.session.userId, userId))) {
    res.status(403).json({ error: "Blocked users cannot react to each other" });
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
  const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const surface = req.query.surface === "artist" ? "artist" : req.query.surface === "personal" ? "personal" : undefined;
  const page = await getUserPostsPage(userId, req.session.userId, { cursor, limit, surface });

  res.json({
    posts: page.posts,
    total: page.posts.length,
    limit: Math.min(Math.max(limit ?? 12, 1), 30),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  });
});

router.get("/:userId/photos", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const blockState = await getBlockState(req.session.userId, userId);
  if (blockState.isBlockedEitherWay && req.session.userId !== userId) {
    res.json([]);
    return;
  }

  const photos = await db.select().from(userPhotoItemsTable)
    .where(eq(userPhotoItemsTable.userId, userId))
    .orderBy(desc(userPhotoItemsTable.createdAt));

  res.json(photos);
});

router.post("/:userId/block", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  if (userId === req.session.userId) {
    res.status(400).json({ error: "Cannot block yourself" });
    return;
  }

  await db.insert(userBlocksTable).values({
    blockerUserId: req.session.userId!,
    blockedUserId: userId,
  }).onConflictDoNothing();

  await db.delete(followsTable).where(
    or(
      and(eq(followsTable.followerId, req.session.userId!), eq(followsTable.followingId, userId)),
      and(eq(followsTable.followerId, userId), eq(followsTable.followingId, req.session.userId!)),
    ),
  );
  await db.delete(friendshipsTable).where(
    or(
      and(eq(friendshipsTable.requesterUserId, req.session.userId!), eq(friendshipsTable.addresseeUserId, userId)),
      and(eq(friendshipsTable.requesterUserId, userId), eq(friendshipsTable.addresseeUserId, req.session.userId!)),
    ),
  );

  res.json({ success: true, message: "User blocked" });
});

router.post("/:userId/unblock", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(userBlocksTable).where(
    and(
      eq(userBlocksTable.blockerUserId, req.session.userId!),
      eq(userBlocksTable.blockedUserId, userId),
    ),
  );

  res.json({ success: true, message: "User unblocked" });
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
    pageType,
    pageArchetype,
    pageStatus,
    primaryActionType,
    primaryActionLabel,
    primaryActionUrl,
    featuredTitle,
    featuredDescription,
    featuredUrl,
    featuredType,
    featuredContent,
    linkItems,
    serviceItems,
    pricingSummary,
    turnaroundInfo,
    moodPreset,
    layoutTemplate,
    fontPreset,
    accentColor,
    backgroundStyle,
    lightThemeVariant,
    enabledModules,
    moduleOrder,
    sectionConfigs,
    pinnedPostId,
  } = req.body;

  await db.insert(creatorProfileSettingsTable).values({
    userId,
    pageType: pageType ?? "creator",
    pageArchetype: pageArchetype ?? "business",
    pageStatus: pageStatus ?? "published",
    primaryActionType: primaryActionType ?? "contact",
    primaryActionLabel: primaryActionLabel ?? "Contact Me",
    primaryActionUrl: primaryActionUrl ?? null,
    featuredTitle: featuredTitle ?? null,
    featuredDescription: featuredDescription ?? null,
    featuredUrl: featuredUrl ?? null,
    featuredType: featuredType ?? "highlight",
    featuredContent: featuredContent ?? null,
    linkItems: Array.isArray(linkItems) ? linkItems : [],
    serviceItems: Array.isArray(serviceItems) ? serviceItems : [],
    pricingSummary: pricingSummary ?? null,
    turnaroundInfo: turnaroundInfo ?? null,
    moodPreset: moodPreset ?? "sleek",
    layoutTemplate: layoutTemplate ?? "portfolio",
    fontPreset: fontPreset ?? "modern",
    accentColor: accentColor ?? "#8b5cf6",
    backgroundStyle: backgroundStyle ?? "soft-glow",
    lightThemeVariant: lightThemeVariant ?? "studio",
    enabledModules: Array.isArray(enabledModules) ? enabledModules : ["featured", "about", "media", "posts", "events", "contact"],
    moduleOrder: Array.isArray(moduleOrder) ? moduleOrder : ["featured", "about", "media", "posts", "events", "contact"],
    sectionConfigs: sectionConfigs && typeof sectionConfigs === "object" ? sectionConfigs : {},
    pinnedPostId: pinnedPostId ?? null,
  }).onConflictDoUpdate({
    target: creatorProfileSettingsTable.userId,
    set: {
      pageType: pageType ?? "creator",
      pageArchetype: pageArchetype ?? "business",
      pageStatus: pageStatus ?? "published",
      primaryActionType: primaryActionType ?? "contact",
      primaryActionLabel: primaryActionLabel ?? "Contact Me",
      primaryActionUrl: primaryActionUrl ?? null,
      featuredTitle: featuredTitle ?? null,
      featuredDescription: featuredDescription ?? null,
      featuredUrl: featuredUrl ?? null,
      featuredType: featuredType ?? "highlight",
      featuredContent: featuredContent ?? null,
      linkItems: Array.isArray(linkItems) ? linkItems : [],
      serviceItems: Array.isArray(serviceItems) ? serviceItems : [],
      pricingSummary: pricingSummary ?? null,
      turnaroundInfo: turnaroundInfo ?? null,
      moodPreset: moodPreset ?? "sleek",
      layoutTemplate: layoutTemplate ?? "portfolio",
      fontPreset: fontPreset ?? "modern",
      accentColor: accentColor ?? "#8b5cf6",
      backgroundStyle: backgroundStyle ?? "soft-glow",
      lightThemeVariant: lightThemeVariant ?? "studio",
      enabledModules: Array.isArray(enabledModules) ? enabledModules : ["featured", "about", "media", "posts", "events", "contact"],
      moduleOrder: Array.isArray(moduleOrder) ? moduleOrder : ["featured", "about", "media", "posts", "events", "contact"],
      sectionConfigs: sectionConfigs && typeof sectionConfigs === "object" ? sectionConfigs : {},
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
