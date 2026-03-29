import {
  artistProfilesTable,
  creatorProfileSettingsTable,
  customFeedsTable,
  db,
  eventArtistsTable,
  eventsTable,
  followsTable,
  friendshipsTable,
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
import { and, count, desc, eq, inArray, or } from "drizzle-orm";

const REACTION_TYPES = ["like", "heart", "wow", "angry"] as const;

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

export async function getUserSummary(user: typeof usersTable.$inferSelect) {
  const [followerResult] = await db.select({ count: count() }).from(followsTable).where(eq(followsTable.followingId, user.id));
  const [details] = await db.select().from(userProfileDetailsTable).where(eq(userProfileDetailsTable.userId, user.id)).limit(1);
  const [artistProfile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, user.id)).limit(1);
  const friendCount = await getFriendCount(user.id);

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
    links: details?.links ?? [],
    category: artistProfile?.category ?? null,
    tags: artistProfile?.tags ?? [],
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
      links: details?.links ?? [],
    featuredContent: details?.featuredContent ?? null,
  };
}

export async function formatArtistProfile(profile: typeof artistProfilesTable.$inferSelect, user: typeof usersTable.$inferSelect) {
  const gallery = await db.select().from(galleryItemsTable)
    .where(eq(galleryItemsTable.artistId, profile.id))
    .orderBy(desc(galleryItemsTable.createdAt));
  const summary = await getUserSummary(user);
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

async function formatPostComment(comment: typeof postCommentsTable.$inferSelect) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, comment.userId)).limit(1);
  return {
    ...comment,
    author: author ? await getUserSummary(author) : null,
  };
}

async function enrichPostInternal(post: typeof postsTable.$inferSelect, currentUserId: number | undefined, depth: number): Promise<any> {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.userId)).limit(1);
  const [likeCountResult] = await db.select({ count: count() }).from(postLikesTable).where(eq(postLikesTable.postId, post.id));
  const media = await db.select().from(postMediaTable).where(eq(postMediaTable.postId, post.id)).orderBy(desc(postMediaTable.createdAt));
  let isLiked = false;
  if (currentUserId) {
    const [liked] = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, currentUserId))).limit(1);
    isLiked = !!liked;
  }
  const reactions = await db.select().from(postReactionsTable).where(eq(postReactionsTable.postId, post.id));
  const reactionCounts = Object.fromEntries(REACTION_TYPES.map((type) => [type, 0])) as Record<(typeof REACTION_TYPES)[number], number>;
  let currentUserReaction: string | null = null;
  for (const reaction of reactions) {
    if (reaction.reactionType in reactionCounts) {
      reactionCounts[reaction.reactionType as keyof typeof reactionCounts] += 1;
    }
    if (currentUserId && reaction.userId === currentUserId) {
      currentUserReaction = reaction.reactionType;
    }
  }
  const [repostCountResult] = await db.select({ count: count() }).from(postsTable).where(eq(postsTable.repostOfPostId, post.id));
  const [commentCountResult] = await db.select({ count: count() }).from(postCommentsTable).where(eq(postCommentsTable.postId, post.id));
  const recentComments = await db.select().from(postCommentsTable)
    .where(eq(postCommentsTable.postId, post.id))
    .orderBy(desc(postCommentsTable.createdAt))
    .limit(8);
  const authorSummary = author ? await getUserSummary(author) : null;
  const originalPost: any = post.repostOfPostId && depth < 1 ? await enrichPostById(post.repostOfPostId, currentUserId, depth + 1) : null;
  return {
    ...post,
    likeCount: Number(likeCountResult?.count ?? 0),
    isLiked,
    reactionCounts,
    totalReactionCount: reactions.length,
    currentUserReaction,
    repostCount: Number(repostCountResult?.count ?? 0),
    commentCount: Number(commentCountResult?.count ?? 0),
    comments: await Promise.all(recentComments.reverse().map((comment) => formatPostComment(comment))),
    originalPost,
    author: authorSummary,
    media,
  };
}

export async function enrichPostById(postId: number, currentUserId?: number, depth = 0): Promise<any> {
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) return null;
  return enrichPostInternal(post, currentUserId, depth);
}

export async function formatConversationForUser(conversationId: number, currentUserId: number, otherUserId: number) {
  const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);
  if (!otherUser) return null;

  const otherUserSummary = await getUserSummary(otherUser);
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
  const previews = await Promise.all(memberUsers.map((member) => getUserSummary(member)));
  const [membership] = currentUserId
    ? await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, group.id), eq(groupMembersTable.userId, currentUserId))).limit(1)
    : [undefined];

  return {
    ...group,
    owner: owner ? await getUserSummary(owner) : null,
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

export async function getPostsForUserIds(userIds: number[], currentUserId?: number) {
  if (userIds.length === 0) return [];
  const posts = await db.select().from(postsTable).where(inArray(postsTable.userId, userIds)).orderBy(desc(postsTable.createdAt));
  return Promise.all(posts.map((post) => enrichPost(post, currentUserId)));
}

export function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
