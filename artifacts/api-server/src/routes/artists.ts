import { Router } from "express";
import { artistProfilesTable, creatorProfileSettingsTable, db, followsTable, galleryItemCommentsTable, galleryItemLikesTable, galleryItemsTable, userProfileDetailsTable, usersTable } from "@workspace/db";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { canUsersInteract, ensureArtistProfileRecord, formatArtistProfile, getBlockState, getBlockedUserIds, getUserSummary } from "./helpers.js";
import { expandLocationTerms } from "../lib/locations.js";

const router = Router();

function getYouTubeThumbnailUrl(rawUrl?: string | null) {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId: string | null = null;

    if (host.includes("youtu.be")) {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host.includes("youtube.com") || host.includes("youtube-nocookie.com") || host.includes("music.youtube.com")) {
      videoId = parsed.searchParams.get("v");
      if (!videoId) {
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) {
          videoId = parts[1];
        }
      }
    }

    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}

async function getVimeoThumbnailUrl(rawUrl?: string | null) {
  if (!rawUrl) return null;
  try {
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(rawUrl)}`);
    if (!response.ok) return null;
    const data = await response.json() as { thumbnail_url?: string };
    return data.thumbnail_url || null;
  } catch {
    return null;
  }
}

async function resolveVideoThumbnailUrl(rawUrl?: string | null) {
  return getYouTubeThumbnailUrl(rawUrl) || await getVimeoThumbnailUrl(rawUrl);
}

async function resolveContributorUserIds(input: unknown) {
  if (!Array.isArray(input) || input.length === 0) return [];

  const contributorUsernames = [...new Set(
    input
      .map((value) => typeof value === "string" ? value.trim().replace(/^@/, "") : "")
      .filter(Boolean),
  )];

  if (contributorUsernames.length === 0) return [];

  const rows = await db.select({ id: usersTable.id, username: usersTable.username })
    .from(usersTable)
    .where(inArray(usersTable.username, contributorUsernames));

  return rows.map((row) => row.id);
}

router.get("/artists", async (req, res) => {
  const { location, category, tags, q } = req.query as Record<string, string>;
  const blockedUserIds = await getBlockedUserIds(req.session.userId);
  const conditions = [];
  const locationTerms = expandLocationTerms(location);

  if (q) {
    conditions.push(or(
      ilike(usersTable.username, `%${q}%`),
      ilike(artistProfilesTable.displayName, `%${q}%`),
      ilike(artistProfilesTable.category, `%${q}%`),
      ilike(artistProfilesTable.location, `%${q}%`),
      ilike(userProfileDetailsTable.city, `%${q}%`),
      ilike(userProfileDetailsTable.location, `%${q}%`),
    ));
  }
  if (locationTerms.length > 0) {
    conditions.push(or(
      ...locationTerms.flatMap((term) => [
        ilike(artistProfilesTable.location, `%${term}%`),
        ilike(userProfileDetailsTable.city, `%${term}%`),
        ilike(userProfileDetailsTable.location, `%${term}%`),
      ]),
    ));
  }
  if (category) conditions.push(ilike(artistProfilesTable.category, `%${category}%`));
  if (tags) {
    const tagList = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (tagList.length > 0) {
      conditions.push(sql`${artistProfilesTable.tags} && ARRAY[${sql.join(tagList.map((tag) => sql`${tag}`), sql`, `)}]::text[]`);
    }
  }

  const results = await db.select().from(artistProfilesTable)
    .innerJoin(usersTable, eq(artistProfilesTable.userId, usersTable.id))
    .leftJoin(userProfileDetailsTable, eq(userProfileDetailsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(artistProfilesTable.updatedAt));

  const visibleResults = results.filter((row) => !blockedUserIds.includes(row.users.id));
  const followRows = req.session.userId && visibleResults.length > 0
    ? await db.select({ followingId: followsTable.followingId }).from(followsTable).where(and(
      eq(followsTable.followerId, req.session.userId),
      inArray(followsTable.followingId, visibleResults.map((row) => row.artist_profiles.userId)),
    ))
    : [];
  const followingSet = new Set(followRows.map((row) => row.followingId));

  const artists = await Promise.all(
    visibleResults.map(async (row) => ({
      ...(await formatArtistProfile(row.artist_profiles, row.users, req.session.userId)),
      isFollowing: followingSet.has(row.artist_profiles.userId),
    })),
  );
  res.json({ artists, total: artists.length, page: 1, totalPages: 1 });
});

router.get("/artists/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [details] = await db.select().from(userProfileDetailsTable).where(eq(userProfileDetailsTable.userId, userId)).limit(1);
  const profile = user ? await ensureArtistProfileRecord(user, details) : null;

  if (!user || !profile) {
    res.status(404).json({ error: "Not found", message: "Artist profile not found" });
    return;
  }
  const blockState = await getBlockState(req.session.userId, userId);
  if (blockState.isBlockedEitherWay && req.session.userId !== userId) {
    res.status(403).json({ error: "Artist page unavailable" });
    return;
  }

  res.json(await formatArtistProfile(profile, user, req.session.userId));
});

router.post("/artists/:userId/update", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const {
    displayName,
    avatarUrl,
    bannerUrl,
    category,
    location,
    tagline,
    tags,
    bio,
    influences,
    availabilityStatus,
    pronouns,
    yearsActive,
    representedBy,
    openForCommissions,
    touring,
    acceptsCollaborations,
    customFields,
    bookingEmail,
    primaryActionType,
    primaryActionLabel,
    primaryActionUrl,
    featuredTitle,
    featuredDescription,
    featuredUrl,
    featuredType,
    featuredContent,
    pageType,
    pageArchetype,
    pageStatus,
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

  let [profile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);
  if (!profile) {
    [profile] = await db.insert(artistProfilesTable).values({
      userId,
      displayName: displayName || null,
      avatarUrl: avatarUrl || null,
      bannerUrl: bannerUrl || null,
      category: category || "General Creator",
      location: location || null,
      tagline: tagline || null,
      tags: Array.isArray(tags) ? tags : [],
      bio: bio || null,
      influences: influences || null,
      availabilityStatus: availabilityStatus || null,
      pronouns: pronouns || null,
      yearsActive: yearsActive || null,
      representedBy: representedBy || null,
      openForCommissions: Boolean(openForCommissions),
      touring: Boolean(touring),
      acceptsCollaborations: acceptsCollaborations ?? true,
      customFields: Array.isArray(customFields) ? customFields : [],
      bookingEmail: bookingEmail || null,
    }).returning();
  } else {
    [profile] = await db.update(artistProfilesTable).set({
      displayName: displayName ?? null,
      avatarUrl: avatarUrl ?? null,
      bannerUrl: bannerUrl ?? null,
      category: category ?? profile.category,
      location: location ?? null,
      tagline: tagline ?? null,
      tags: Array.isArray(tags) ? tags : profile.tags,
      bio: bio ?? null,
      influences: influences ?? null,
      availabilityStatus: availabilityStatus ?? null,
      pronouns: pronouns ?? null,
      yearsActive: yearsActive ?? null,
      representedBy: representedBy ?? null,
      openForCommissions: openForCommissions ?? profile.openForCommissions,
      touring: touring ?? profile.touring,
      acceptsCollaborations: acceptsCollaborations ?? profile.acceptsCollaborations,
      customFields: Array.isArray(customFields) ? customFields : profile.customFields,
      bookingEmail: bookingEmail ?? null,
      updatedAt: new Date(),
    }).where(eq(artistProfilesTable.userId, userId)).returning();
  }

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

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.json(await formatArtistProfile(profile, user!, req.session.userId));
});

router.post("/artists/:userId/gallery", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [details] = await db.select().from(userProfileDetailsTable).where(eq(userProfileDetailsTable.userId, userId)).limit(1);
  const profile = await ensureArtistProfileRecord(user, details);

  const { type, url, caption, thumbnailUrl, contributorUsernames } = req.body;
  if (!type || !url) {
    res.status(400).json({ error: "type and url are required" });
    return;
  }

  const contributorUserIds = await resolveContributorUserIds(contributorUsernames);

  const resolvedThumbnailUrl = type === "video"
    ? (typeof thumbnailUrl === "string" && thumbnailUrl.trim()
      ? thumbnailUrl.trim()
      : await resolveVideoThumbnailUrl(url))
    : (typeof thumbnailUrl === "string" && thumbnailUrl.trim() ? thumbnailUrl.trim() : null);

  const [item] = await db.insert(galleryItemsTable).values({
    artistId: profile.id,
    type,
    url,
    thumbnailUrl: resolvedThumbnailUrl,
    caption: caption || null,
    contributorUserIds,
  } as any).returning();

  res.status(201).json(item);
});

router.delete("/artists/:userId/gallery/:itemId", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  const itemId = Number(req.params.itemId);
  if (Number.isNaN(userId) || Number.isNaN(itemId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(galleryItemsTable).where(eq(galleryItemsTable.id, itemId));
  res.json({ success: true, message: "Gallery item deleted" });
});

router.get("/artists/:userId/gallery/:itemId/comments", async (req, res) => {
  const userId = Number(req.params.userId);
  const itemId = Number(req.params.itemId);
  if (Number.isNaN(userId) || Number.isNaN(itemId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [item] = await db.select().from(galleryItemsTable)
    .innerJoin(artistProfilesTable, eq(galleryItemsTable.artistId, artistProfilesTable.id))
    .where(and(eq(galleryItemsTable.id, itemId), eq(artistProfilesTable.userId, userId)))
    .limit(1);

  if (!item) {
    res.status(404).json({ error: "Gallery item not found" });
    return;
  }

  if (!(await canUsersInteract(req.session.userId, userId))) {
    res.status(403).json({ error: "You cannot view this gallery item" });
    return;
  }

  const comments = await db.select().from(galleryItemCommentsTable)
    .where(eq(galleryItemCommentsTable.galleryItemId, itemId))
    .orderBy(asc(galleryItemCommentsTable.createdAt));

  const authorIds = [...new Set(comments.map((comment) => comment.userId))];
  const authors = authorIds.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
    : [];
  const authorMap = new Map<number, any>();
  for (const author of authors) {
    authorMap.set(author.id, await getUserSummary(author, req.session.userId));
  }

  res.json(comments.map((comment) => ({
    ...comment,
    author: authorMap.get(comment.userId) ?? null,
  })));
});

router.post("/artists/:userId/gallery/:itemId/comments", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  const itemId = Number(req.params.itemId);
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

  if (Number.isNaN(userId) || Number.isNaN(itemId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  if (!content) {
    res.status(400).json({ error: "Comment content is required" });
    return;
  }

  const [item] = await db.select().from(galleryItemsTable)
    .innerJoin(artistProfilesTable, eq(galleryItemsTable.artistId, artistProfilesTable.id))
    .where(and(eq(galleryItemsTable.id, itemId), eq(artistProfilesTable.userId, userId)))
    .limit(1);

  if (!item) {
    res.status(404).json({ error: "Gallery item not found" });
    return;
  }
  if (!(await canUsersInteract(req.session.userId, userId))) {
    res.status(403).json({ error: "You cannot comment on this gallery item" });
    return;
  }

  const [comment] = await db.insert(galleryItemCommentsTable).values({
    galleryItemId: itemId,
    userId: req.session.userId!,
    content,
  }).returning();

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);

  res.status(201).json({
    ...comment,
    author: author ? await getUserSummary(author, req.session.userId) : null,
  });
});

router.post("/artists/:userId/gallery/:itemId/like", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  const itemId = Number(req.params.itemId);

  if (Number.isNaN(userId) || Number.isNaN(itemId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [item] = await db.select().from(galleryItemsTable)
    .innerJoin(artistProfilesTable, eq(galleryItemsTable.artistId, artistProfilesTable.id))
    .where(and(eq(galleryItemsTable.id, itemId), eq(artistProfilesTable.userId, userId)))
    .limit(1);

  if (!item) {
    res.status(404).json({ error: "Gallery item not found" });
    return;
  }
  if (!(await canUsersInteract(req.session.userId, userId))) {
    res.status(403).json({ error: "You cannot like this gallery item" });
    return;
  }

  await db.insert(galleryItemLikesTable).values({
    galleryItemId: itemId,
    userId: req.session.userId!,
  }).onConflictDoNothing();

  res.json({ success: true, message: "Liked" });
});

router.post("/artists/:userId/gallery/:itemId/unlike", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  const itemId = Number(req.params.itemId);

  if (Number.isNaN(userId) || Number.isNaN(itemId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(galleryItemLikesTable).where(and(
    eq(galleryItemLikesTable.galleryItemId, itemId),
    eq(galleryItemLikesTable.userId, req.session.userId!),
  ));

  res.json({ success: true, message: "Unliked" });
});

export default router;
