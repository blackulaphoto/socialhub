import {
  artistProfilesTable,
  creatorProfileSettingsTable,
  customFeedsTable,
  db,
  eventArtistsTable,
  eventsTable,
  followsTable,
  friendshipsTable,
  userBlocksTable,
  groupPostsTable,
  galleryItemsTable,
  groupMembersTable,
  groupsTable,
  messageInquiriesTable,
  messagesTable,
  postCommentsTable,
  postLikesTable,
  postReactionsTable,
  postMediaTable,
  postsTable,
  profileReactionsTable,
  userProfileDetailsTable,
  usersTable,
} from "@workspace/db";
import { and, count, desc, eq, inArray, lt, notInArray, or, sql } from "drizzle-orm";

const REACTION_TYPES = ["like", "heart", "wow", "angry"] as const;
const POST_VISIBILITIES = new Set(["public", "friends", "private"]);
const EMPTY_ARRAY_SENTINEL = -1;

type PostRecord = typeof postsTable.$inferSelect;
type PostSurface = "personal" | "artist";

export async function getBlockState(currentUserId: number | undefined, targetUserId: number) {
  if (!currentUserId || currentUserId === targetUserId) {
    return {
      hasBlockedUser: false,
      isBlockedByUser: false,
      isBlockedEitherWay: false,
    };
  }

  const matches = await db.select().from(userBlocksTable).where(
    or(
      and(eq(userBlocksTable.blockerUserId, currentUserId), eq(userBlocksTable.blockedUserId, targetUserId)),
      and(eq(userBlocksTable.blockerUserId, targetUserId), eq(userBlocksTable.blockedUserId, currentUserId)),
    ),
  );

  const hasBlockedUser = matches.some(
    (entry) => entry.blockerUserId === currentUserId && entry.blockedUserId === targetUserId,
  );
  const isBlockedByUser = matches.some(
    (entry) => entry.blockerUserId === targetUserId && entry.blockedUserId === currentUserId,
  );

  return {
    hasBlockedUser,
    isBlockedByUser,
    isBlockedEitherWay: hasBlockedUser || isBlockedByUser,
  };
}

export async function getBlockedUserIds(currentUserId: number | undefined) {
  if (!currentUserId) return [];

  const rows = await db.select().from(userBlocksTable).where(
    or(
      eq(userBlocksTable.blockerUserId, currentUserId),
      eq(userBlocksTable.blockedUserId, currentUserId),
    ),
  );

  return [...new Set(rows.map((row) => (
    row.blockerUserId === currentUserId ? row.blockedUserId : row.blockerUserId
  )))];
}

export async function canUsersInteract(currentUserId: number | undefined, targetUserId: number) {
  if (!currentUserId) return false;
  if (currentUserId === targetUserId) return true;
  const blockState = await getBlockState(currentUserId, targetUserId);
  return !blockState.isBlockedEitherWay;
}

async function getFriendCount(userId: number) {
  const accepted = await db.select().from(friendshipsTable).where(
    and(
      eq(friendshipsTable.status, "accepted"),
      or(
        eq(friendshipsTable.requesterUserId, userId),
        eq(friendshipsTable.addresseeUserId, userId),
      ),
    ),
  );
  return accepted.length;
}

export async function getFriendshipState(currentUserId: number | undefined, targetUserId: number) {
  if (!currentUserId || currentUserId === targetUserId) {
    return { status: "self" as const, isFriend: false };
  }

  const [direct] = await db.select().from(friendshipsTable).where(and(
    eq(friendshipsTable.requesterUserId, currentUserId),
    eq(friendshipsTable.addresseeUserId, targetUserId),
  )).limit(1);
  if (direct) {
    return {
      id: direct.id,
      status: direct.status === "accepted" ? "friends" as const : "outgoing" as const,
      isFriend: direct.status === "accepted",
    };
  }

  const [reverse] = await db.select().from(friendshipsTable).where(and(
    eq(friendshipsTable.requesterUserId, targetUserId),
    eq(friendshipsTable.addresseeUserId, currentUserId),
  )).limit(1);
  if (reverse) {
    return {
      id: reverse.id,
      status: reverse.status === "accepted" ? "friends" as const : "incoming" as const,
      isFriend: reverse.status === "accepted",
    };
  }

  return { status: "none" as const, isFriend: false };
}

export async function areUsersFriends(userAId: number | undefined, userBId: number) {
  if (!userAId || userAId === userBId) return false;
  const state = await getFriendshipState(userAId, userBId);
  return state.isFriend;
}

export async function getAcceptedFriendIds(currentUserId: number | undefined) {
  if (!currentUserId) return [];

  const friendships = await db.select().from(friendshipsTable).where(
    and(
      eq(friendshipsTable.status, "accepted"),
      or(
        eq(friendshipsTable.requesterUserId, currentUserId),
        eq(friendshipsTable.addresseeUserId, currentUserId),
      ),
    ),
  );

  return friendships.map((friendship) => (
    friendship.requesterUserId === currentUserId
      ? friendship.addresseeUserId
      : friendship.requesterUserId
  ));
}

export async function getProfileReactionSummary(targetUserId: number, currentUserId?: number) {
  const reactions = await db.select().from(profileReactionsTable).where(eq(profileReactionsTable.targetUserId, targetUserId));
  const counts = Object.fromEntries(REACTION_TYPES.map((type) => [type, 0])) as Record<(typeof REACTION_TYPES)[number], number>;
  let currentUserReaction: string | null = null;
  for (const reaction of reactions) {
    if (reaction.reactionType in counts) {
      counts[reaction.reactionType as keyof typeof counts] += 1;
    }
    if (currentUserId && reaction.reactorUserId === currentUserId) {
      currentUserReaction = reaction.reactionType;
    }
  }
  return {
    total: reactions.length,
    counts,
    currentUserReaction,
  };
}

export async function getUserCounts(userId: number) {
  const [followerResult] = await db.select({ count: count() }).from(followsTable).where(eq(followsTable.followingId, userId));
  const [followingResult] = await db.select({ count: count() }).from(followsTable).where(eq(followsTable.followerId, userId));
  const [postResult] = await db.select({ count: count() }).from(postsTable).where(eq(postsTable.userId, userId));
  const friendCount = await getFriendCount(userId);
  return {
    followerCount: Number(followerResult?.count ?? 0),
    followingCount: Number(followingResult?.count ?? 0),
    postCount: Number(postResult?.count ?? 0),
    friendCount,
  };
}

export async function getUserSummary(user: typeof usersTable.$inferSelect, currentUserId?: number) {
  const [followerResult] = await db.select({ count: count() }).from(followsTable).where(eq(followsTable.followingId, user.id));
  const [details] = await db.select().from(userProfileDetailsTable).where(eq(userProfileDetailsTable.userId, user.id)).limit(1);
  const [artistProfile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, user.id)).limit(1);
  const friendCount = await getFriendCount(user.id);
  const blockState = await getBlockState(currentUserId, user.id);

  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    profileType: user.profileType,
    followerCount: Number(followerResult?.count ?? 0),
    friendCount,
    bannerUrl: details?.bannerUrl ?? null,
    location: details?.location ?? artistProfile?.location ?? null,
    city: details?.city ?? null,
    age: details?.age ?? null,
    work: details?.work ?? null,
    school: details?.school ?? null,
    about: details?.about ?? null,
    interests: details?.interests ?? [],
    hasArtistPage: !!artistProfile,
      accentColor: details?.accentColor ?? null,
      onboardingCompleted: details?.onboardingCompleted ?? false,
      onboardingStep: details?.onboardingStep ?? "profile",
      links: details?.links ?? [],
    category: artistProfile?.category ?? null,
    artistDisplayName: artistProfile?.displayName ?? null,
    tags: artistProfile?.tags ?? [],
    hasBlockedUser: blockState.hasBlockedUser,
    isBlockedByUser: blockState.isBlockedByUser,
  };
}

export async function formatUser(user: typeof usersTable.$inferSelect) {
  const counts = await getUserCounts(user.id);
  const [details] = await db.select().from(userProfileDetailsTable).where(eq(userProfileDetailsTable.userId, user.id)).limit(1);
  const [artistProfile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, user.id)).limit(1);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    profileType: user.profileType,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
    friendCount: counts.friendCount,
    postCount: counts.postCount,
    createdAt: user.createdAt,
    bannerUrl: details?.bannerUrl ?? null,
      location: details?.location ?? null,
      city: details?.city ?? null,
      age: details?.age ?? null,
      work: details?.work ?? null,
      school: details?.school ?? null,
      about: details?.about ?? null,
      interests: details?.interests ?? [],
      hasArtistPage: !!artistProfile,
      accentColor: details?.accentColor ?? null,
      themeName: details?.themeName ?? "nocturne",
      onboardingCompleted: details?.onboardingCompleted ?? false,
      onboardingStep: details?.onboardingStep ?? "profile",
      links: details?.links ?? [],
    featuredContent: details?.featuredContent ?? null,
  };
}

export async function formatArtistProfile(profile: typeof artistProfilesTable.$inferSelect, user: typeof usersTable.$inferSelect, currentUserId?: number) {
  const gallery = await db.select().from(galleryItemsTable)
    .where(eq(galleryItemsTable.artistId, profile.id))
    .orderBy(desc(galleryItemsTable.createdAt));
  const summary = await getUserSummary(user, currentUserId);
  const [settings] = await db.select().from(creatorProfileSettingsTable).where(eq(creatorProfileSettingsTable.userId, user.id)).limit(1);
  const pinnedPost = settings?.pinnedPostId
    ? await enrichPostById(settings.pinnedPostId)
    : null;

  return {
    ...profile,
    gallery,
    user: summary,
    primaryActionType: settings?.primaryActionType ?? "contact",
    primaryActionLabel: settings?.primaryActionLabel ?? "Contact Me",
    primaryActionUrl: settings?.primaryActionUrl ?? null,
    featuredTitle: settings?.featuredTitle ?? null,
    featuredDescription: settings?.featuredDescription ?? null,
    featuredUrl: settings?.featuredUrl ?? null,
    featuredType: settings?.featuredType ?? "highlight",
    moodPreset: settings?.moodPreset ?? "sleek",
    layoutTemplate: settings?.layoutTemplate ?? "portfolio",
    fontPreset: settings?.fontPreset ?? "modern",
    enabledModules: settings?.enabledModules ?? ["featured", "about", "media", "posts", "events", "contact"],
    moduleOrder: settings?.moduleOrder ?? ["featured", "about", "media", "posts", "events", "contact"],
    pinnedPost,
  };
}

export async function enrichPost(post: typeof postsTable.$inferSelect, currentUserId?: number) {
  return enrichPostInternal(post, currentUserId, 0);
}

export async function canViewPost(post: typeof postsTable.$inferSelect, currentUserId?: number) {
  const visibility = POST_VISIBILITIES.has(post.visibility) ? post.visibility : "public";
  if (currentUserId === post.userId) return true;

  if (currentUserId) {
    const blockState = await getBlockState(currentUserId, post.userId);
    if (blockState.isBlockedEitherWay) {
      return false;
    }
  }

  if (visibility === "private") {
    return false;
  }

  if (visibility === "friends") {
    return areUsersFriends(currentUserId, post.userId);
  }

  return true;
}

async function formatPostComment(comment: typeof postCommentsTable.$inferSelect, currentUserId?: number) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, comment.userId)).limit(1);
  return {
    ...comment,
    author: author ? await getUserSummary(author, currentUserId) : null,
  };
}

async function getUserSummaryMap(userIds: number[], currentUserId?: number) {
  if (userIds.length === 0) return new Map<number, any>();

  const uniqueUserIds = [...new Set(userIds)];
  const [users, details, artistProfiles, followerCounts, acceptedFriendships, blockRows] = await Promise.all([
    db.select().from(usersTable).where(inArray(usersTable.id, uniqueUserIds)),
    db.select().from(userProfileDetailsTable).where(inArray(userProfileDetailsTable.userId, uniqueUserIds)),
    db.select().from(artistProfilesTable).where(inArray(artistProfilesTable.userId, uniqueUserIds)),
    db.select({
      userId: followsTable.followingId,
      count: count(),
    }).from(followsTable)
      .where(inArray(followsTable.followingId, uniqueUserIds))
      .groupBy(followsTable.followingId),
    db.select().from(friendshipsTable).where(
      and(
        eq(friendshipsTable.status, "accepted"),
        or(
          inArray(friendshipsTable.requesterUserId, uniqueUserIds),
          inArray(friendshipsTable.addresseeUserId, uniqueUserIds),
        ),
      ),
    ),
    currentUserId
      ? db.select().from(userBlocksTable).where(
        or(
          and(eq(userBlocksTable.blockerUserId, currentUserId), inArray(userBlocksTable.blockedUserId, uniqueUserIds)),
          and(inArray(userBlocksTable.blockerUserId, uniqueUserIds), eq(userBlocksTable.blockedUserId, currentUserId)),
        ),
      )
      : Promise.resolve([]),
  ]);

  const detailsByUserId = new Map(details.map((item) => [item.userId, item]));
  const artistProfilesByUserId = new Map(artistProfiles.map((item) => [item.userId, item]));
  const followerCountsByUserId = new Map(followerCounts.map((item) => [item.userId, Number(item.count ?? 0)]));
  const friendCountsByUserId = new Map<number, number>();
  const blockStateByUserId = new Map<number, { hasBlockedUser: boolean; isBlockedByUser: boolean }>();

  for (const friendship of acceptedFriendships) {
    friendCountsByUserId.set(friendship.requesterUserId, (friendCountsByUserId.get(friendship.requesterUserId) ?? 0) + 1);
    friendCountsByUserId.set(friendship.addresseeUserId, (friendCountsByUserId.get(friendship.addresseeUserId) ?? 0) + 1);
  }

  for (const block of blockRows) {
    const targetUserId = block.blockerUserId === currentUserId ? block.blockedUserId : block.blockerUserId;
    const current = blockStateByUserId.get(targetUserId) ?? { hasBlockedUser: false, isBlockedByUser: false };
    if (block.blockerUserId === currentUserId) {
      current.hasBlockedUser = true;
    } else {
      current.isBlockedByUser = true;
    }
    blockStateByUserId.set(targetUserId, current);
  }

  const summaries = new Map<number, any>();
  for (const user of users) {
    const detailsRow = detailsByUserId.get(user.id);
    const artistProfile = artistProfilesByUserId.get(user.id);
    const blockState = blockStateByUserId.get(user.id) ?? { hasBlockedUser: false, isBlockedByUser: false };
    summaries.set(user.id, {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      profileType: user.profileType,
      followerCount: followerCountsByUserId.get(user.id) ?? 0,
      friendCount: friendCountsByUserId.get(user.id) ?? 0,
      bannerUrl: detailsRow?.bannerUrl ?? null,
      location: detailsRow?.location ?? artistProfile?.location ?? null,
      city: detailsRow?.city ?? null,
      age: detailsRow?.age ?? null,
      work: detailsRow?.work ?? null,
      school: detailsRow?.school ?? null,
      about: detailsRow?.about ?? null,
      interests: detailsRow?.interests ?? [],
      hasArtistPage: !!artistProfile,
      accentColor: detailsRow?.accentColor ?? null,
      links: detailsRow?.links ?? [],
      category: artistProfile?.category ?? null,
      artistDisplayName: artistProfile?.displayName ?? null,
      tags: artistProfile?.tags ?? [],
      hasBlockedUser: blockState.hasBlockedUser,
      isBlockedByUser: blockState.isBlockedByUser,
    });
  }

  return summaries;
}

async function formatPostCommentsBatch(comments: Array<typeof postCommentsTable.$inferSelect>, currentUserId?: number) {
  const authorMap = await getUserSummaryMap(comments.map((comment) => comment.userId), currentUserId);
  return comments.map((comment) => ({
    ...comment,
    author: authorMap.get(comment.userId) ?? null,
  }));
}

async function enrichPostsBatch(posts: PostRecord[], currentUserId?: number, depth = 0) {
  if (posts.length === 0) return [];

  const postIds = posts.map((post) => post.id);
  const authorIds = [...new Set(posts.map((post) => post.userId))];
  const [authorMap, mediaRows, likeCountRows, likedRows, reactions, repostCountRows, commentCountRows, allComments] = await Promise.all([
    getUserSummaryMap(authorIds, currentUserId),
    db.select().from(postMediaTable).where(inArray(postMediaTable.postId, postIds)).orderBy(desc(postMediaTable.createdAt)),
    db.select({
      postId: postLikesTable.postId,
      count: count(),
    }).from(postLikesTable)
      .where(inArray(postLikesTable.postId, postIds))
      .groupBy(postLikesTable.postId),
    currentUserId
      ? db.select({ postId: postLikesTable.postId }).from(postLikesTable).where(
        and(eq(postLikesTable.userId, currentUserId), inArray(postLikesTable.postId, postIds)),
      )
      : Promise.resolve([]),
    db.select().from(postReactionsTable).where(inArray(postReactionsTable.postId, postIds)),
    db.select({
      originalPostId: postsTable.repostOfPostId,
      count: count(),
    }).from(postsTable)
      .where(inArray(postsTable.repostOfPostId, postIds))
      .groupBy(postsTable.repostOfPostId),
    db.select({
      postId: postCommentsTable.postId,
      count: count(),
    }).from(postCommentsTable)
      .where(inArray(postCommentsTable.postId, postIds))
      .groupBy(postCommentsTable.postId),
    db.select().from(postCommentsTable)
      .where(inArray(postCommentsTable.postId, postIds))
      .orderBy(desc(postCommentsTable.createdAt)),
  ]);

  const mediaByPostId = new Map<number, Array<typeof postMediaTable.$inferSelect>>();
  const likeCountsByPostId = new Map<number, number>();
  const likedPostIds = new Set(likedRows.map((row) => row.postId));
  const reactionCountsByPostId = new Map<number, Record<(typeof REACTION_TYPES)[number], number>>();
  const currentReactionByPostId = new Map<number, string | null>();
  const repostCountsByPostId = new Map<number, number>();
  const commentCountsByPostId = new Map<number, number>();
  const recentCommentsByPostId = new Map<number, Array<typeof postCommentsTable.$inferSelect>>();

  for (const media of mediaRows) {
    const list = mediaByPostId.get(media.postId) ?? [];
    list.push(media);
    mediaByPostId.set(media.postId, list);
  }

  for (const row of likeCountRows) {
    likeCountsByPostId.set(row.postId, Number(row.count ?? 0));
  }

  for (const reaction of reactions) {
    const counts = reactionCountsByPostId.get(reaction.postId) ?? {
      like: 0,
      heart: 0,
      wow: 0,
      angry: 0,
    };
    if (reaction.reactionType in counts) {
      counts[reaction.reactionType as keyof typeof counts] += 1;
    }
    reactionCountsByPostId.set(reaction.postId, counts);
    if (currentUserId && reaction.userId === currentUserId) {
      currentReactionByPostId.set(reaction.postId, reaction.reactionType);
    }
  }

  for (const row of repostCountRows) {
    if (row.originalPostId) {
      repostCountsByPostId.set(row.originalPostId, Number(row.count ?? 0));
    }
  }

  for (const row of commentCountRows) {
    commentCountsByPostId.set(row.postId, Number(row.count ?? 0));
  }

  for (const comment of allComments) {
    const list = recentCommentsByPostId.get(comment.postId) ?? [];
    if (list.length < 8) {
      list.push(comment);
      recentCommentsByPostId.set(comment.postId, list);
    }
  }

  const formattedCommentsByPostId = new Map<number, Awaited<ReturnType<typeof formatPostCommentsBatch>>>();
  for (const [postId, comments] of recentCommentsByPostId.entries()) {
    formattedCommentsByPostId.set(postId, await formatPostCommentsBatch([...comments].reverse(), currentUserId));
  }

  const originalPostIds = depth < 1
    ? [...new Set(posts.map((post) => post.repostOfPostId).filter((postId): postId is number => Number.isFinite(postId)))]
    : [];
  const originalPosts = originalPostIds.length
    ? await db.select().from(postsTable).where(inArray(postsTable.id, originalPostIds))
    : [];
  const originalPostsMap = new Map<number, any>();
  if (originalPosts.length > 0) {
    const enrichedOriginals = await enrichPostsBatch(originalPosts, currentUserId, depth + 1);
    for (const originalPost of enrichedOriginals) {
      originalPostsMap.set(originalPost.id, originalPost);
    }
  }

  return posts.map((post) => {
    const reactionCounts = reactionCountsByPostId.get(post.id) ?? {
      like: 0,
      heart: 0,
      wow: 0,
      angry: 0,
    };
    return {
      ...post,
      actorSurface: post.actorSurface ?? "personal",
      likeCount: likeCountsByPostId.get(post.id) ?? 0,
      isLiked: likedPostIds.has(post.id),
      reactionCounts,
      totalReactionCount: Object.values(reactionCounts).reduce((sum, value) => sum + value, 0),
      currentUserReaction: currentReactionByPostId.get(post.id) ?? null,
      repostCount: repostCountsByPostId.get(post.id) ?? 0,
      commentCount: commentCountsByPostId.get(post.id) ?? 0,
      comments: formattedCommentsByPostId.get(post.id) ?? [],
      originalPost: post.repostOfPostId ? originalPostsMap.get(post.repostOfPostId) ?? null : null,
      author: authorMap.get(post.userId) ?? null,
      media: mediaByPostId.get(post.id) ?? [],
    };
  });
}

async function enrichPostInternal(post: typeof postsTable.$inferSelect, currentUserId: number | undefined, depth: number): Promise<any> {
  const [enriched] = await enrichPostsBatch([post], currentUserId, depth);
  return enriched;
}

export async function enrichPostById(postId: number, currentUserId?: number, depth = 0): Promise<any> {
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) return null;
  return enrichPostInternal(post, currentUserId, depth);
}

export async function formatConversationForUser(conversationId: number, currentUserId: number, otherUserId: number) {
  const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);
  if (!otherUser) return null;

  const otherUserSummary = await getUserSummary(otherUser, currentUserId);
  const [lastMsg] = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(1);

  const [unreadResult] = await db.select({ count: count() }).from(messagesTable)
    .where(and(
      eq(messagesTable.conversationId, conversationId),
      eq(messagesTable.isRead, false),
      eq(messagesTable.senderId, otherUserId),
    ));

  const recentMessages = await db.select({
    id: messagesTable.id,
  }).from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(20);
  const recentInquiries = recentMessages.length > 0
    ? await db.select().from(messageInquiriesTable)
      .where(or(...recentMessages.map((message) => eq(messageInquiriesTable.messageId, message.id))))
    : [];
  const inquiryMap = new Map(recentInquiries.map((inquiry) => [inquiry.messageId, inquiry]));
  const latestInquiry = recentMessages.map((message) => inquiryMap.get(message.id)).find(Boolean) ?? null;

  return {
    id: conversationId,
    otherUser: otherUserSummary,
    lastMessage: lastMsg?.content ?? null,
    lastMessageAt: lastMsg?.createdAt ?? null,
    unreadCount: Number(unreadResult?.count ?? 0),
    inquiryType: latestInquiry?.inquiryType ?? null,
  };
}

export async function formatGroup(group: typeof groupsTable.$inferSelect, currentUserId?: number) {
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, group.ownerId)).limit(1);
  const [memberResult] = await db.select({ count: count() }).from(groupMembersTable).where(eq(groupMembersTable.groupId, group.id));
  const [postResult] = await db.select({ count: count() }).from(groupPostsTable).where(eq(groupPostsTable.groupId, group.id));
  const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, group.id)).limit(6);
  const memberUsers = members.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, members.map((member) => member.userId)))
    : [];
  const previews = await Promise.all(memberUsers.map((member) => getUserSummary(member, currentUserId)));
  const [membership] = currentUserId
    ? await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, group.id), eq(groupMembersTable.userId, currentUserId))).limit(1)
    : [undefined];

  return {
    ...group,
    owner: owner ? await getUserSummary(owner, currentUserId) : null,
    memberCount: Number(memberResult?.count ?? 0),
    postCount: Number(postResult?.count ?? 0),
    isMember: !!membership,
    membersPreview: previews,
  };
}

export async function formatEvent(event: typeof eventsTable.$inferSelect) {
  const [host] = await db.select().from(usersTable).where(eq(usersTable.id, event.hostUserId)).limit(1);
  const linkedArtists = await db.select().from(eventArtistsTable).where(eq(eventArtistsTable.eventId, event.id));
  const artists = linkedArtists.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, linkedArtists.map((item) => item.userId)))
    : [];

  return {
    ...event,
    host: host ? await getUserSummary(host) : null,
    artists: await Promise.all(artists.map((artist) => getUserSummary(artist))),
  };
}

export async function getVisibleArtistUserIds() {
  const artistProfiles = await db.select().from(artistProfilesTable);
  return artistProfiles.map((artist) => artist.userId);
}

export async function searchUsersByIds(userIds: number[]) {
  if (userIds.length === 0) return [];
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, userIds));
  return Promise.all(users.map((user) => getUserSummary(user)));
}

export async function getCustomFeeds(ownerId: number) {
  return db.select().from(customFeedsTable).where(eq(customFeedsTable.ownerId, ownerId)).orderBy(desc(customFeedsTable.updatedAt));
}

function buildPostVisibilityCondition(currentUserId: number | undefined, friendIds: number[]) {
  if (!currentUserId) {
    return eq(postsTable.visibility, "public");
  }

  const friendVisibilityCondition = friendIds.length > 0
    ? and(eq(postsTable.visibility, "friends"), inArray(postsTable.userId, friendIds))
    : and(eq(postsTable.visibility, "friends"), eq(postsTable.userId, EMPTY_ARRAY_SENTINEL));

  return or(
    eq(postsTable.userId, currentUserId),
    eq(postsTable.visibility, "public"),
    friendVisibilityCondition,
  );
}

function decodeCursor(cursor: number | undefined) {
  return cursor && Number.isFinite(cursor) && cursor > 0 ? cursor : undefined;
}

export async function getPostsForUserIds(
  userIds: number[],
  currentUserId?: number,
  options?: { cursor?: number; limit?: number; surface?: PostSurface },
) {
  if (userIds.length === 0) {
    return { posts: [], nextCursor: null, hasMore: false };
  }
  const blockedUserIds = await getBlockedUserIds(currentUserId);
  const visibleUserIds = blockedUserIds.length
    ? userIds.filter((id) => !blockedUserIds.includes(id))
    : userIds;
  if (visibleUserIds.length === 0) {
    return { posts: [], nextCursor: null, hasMore: false };
  }

  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 30);
  const cursor = decodeCursor(options?.cursor);
  const surface = options?.surface;
  const friendIds = await getAcceptedFriendIds(currentUserId);
  const rows = await db.select().from(postsTable).where(and(
    inArray(postsTable.userId, visibleUserIds),
    surface ? eq(postsTable.actorSurface, surface) : undefined,
    buildPostVisibilityCondition(currentUserId, friendIds),
    cursor ? lt(postsTable.id, cursor) : undefined,
  )).orderBy(desc(postsTable.id)).limit(limit + 1);

  const pageRows = rows.slice(0, limit);
  const nextRow = rows[limit];
  return {
    posts: await enrichPostsBatch(pageRows, currentUserId),
    nextCursor: nextRow?.id ?? null,
    hasMore: rows.length > limit,
  };
}

export async function getUserPostsPage(
  userId: number,
  currentUserId?: number,
  options?: { cursor?: number; limit?: number; surface?: PostSurface },
) {
  return getPostsForUserIds([userId], currentUserId, options);
}

export async function getGroupPostsPage(
  groupId: number,
  currentUserId?: number,
  options?: { cursor?: number; limit?: number },
) {
  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 30);
  const cursor = decodeCursor(options?.cursor);
  const blockedUserIds = await getBlockedUserIds(currentUserId);
  const friendIds = await getAcceptedFriendIds(currentUserId);

  const rows = await db.select({
    relationId: groupPostsTable.id,
    post: postsTable,
  }).from(groupPostsTable)
    .innerJoin(postsTable, eq(groupPostsTable.postId, postsTable.id))
    .where(and(
      eq(groupPostsTable.groupId, groupId),
      cursor ? lt(groupPostsTable.id, cursor) : undefined,
      blockedUserIds.length ? notInArray(postsTable.userId, blockedUserIds) : undefined,
      buildPostVisibilityCondition(currentUserId, friendIds),
    ))
    .orderBy(desc(groupPostsTable.id))
    .limit(limit + 1);

  const pageRows = rows.slice(0, limit);
  const nextRow = rows[limit];

  return {
    posts: await enrichPostsBatch(pageRows.map((row) => row.post), currentUserId),
    nextCursor: nextRow?.relationId ?? null,
    hasMore: rows.length > limit,
  };
}

export function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
