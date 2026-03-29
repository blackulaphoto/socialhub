import { Router } from "express";
import { artistProfilesTable, creatorProfileSettingsTable, db, galleryItemsTable, usersTable } from "@workspace/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { formatArtistProfile } from "./helpers.js";

const router = Router();

router.get("/artists", async (req, res) => {
  const { location, category, tags, q } = req.query as Record<string, string>;
  const conditions = [];

  if (q) {
    conditions.push(or(
      ilike(usersTable.username, `%${q}%`),
      ilike(artistProfilesTable.category, `%${q}%`),
      ilike(artistProfilesTable.location, `%${q}%`),
    ));
  }
  if (location) conditions.push(ilike(artistProfilesTable.location, `%${location}%`));
  if (category) conditions.push(ilike(artistProfilesTable.category, `%${category}%`));
  if (tags) {
    const tagList = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (tagList.length > 0) {
      conditions.push(sql`${artistProfilesTable.tags} && ARRAY[${sql.join(tagList.map((tag) => sql`${tag}`), sql`, `)}]::text[]`);
    }
  }

  const results = await db.select().from(artistProfilesTable)
    .innerJoin(usersTable, eq(artistProfilesTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(artistProfilesTable.updatedAt));

  const artists = await Promise.all(results.map((row) => formatArtistProfile(row.artist_profiles, row.users)));
  res.json({ artists, total: artists.length, page: 1, totalPages: 1 });
});

router.get("/artists/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [profile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);

  if (!user || !profile) {
    res.status(404).json({ error: "Not found", message: "Artist profile not found" });
    return;
  }

  res.json(await formatArtistProfile(profile, user));
});

router.post("/artists/:userId/update", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const {
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
    moodPreset,
    layoutTemplate,
    fontPreset,
    enabledModules,
    moduleOrder,
    pinnedPostId,
  } = req.body;

  let [profile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);
  if (!profile) {
    [profile] = await db.insert(artistProfilesTable).values({
      userId,
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

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.json(await formatArtistProfile(profile, user!));
});

router.post("/artists/:userId/gallery", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId) || userId !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [profile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);
  if (!profile) {
    res.status(404).json({ error: "Artist profile not found" });
    return;
  }

  const { type, url, caption } = req.body;
  if (!type || !url) {
    res.status(400).json({ error: "type and url are required" });
    return;
  }

  const [item] = await db.insert(galleryItemsTable).values({
    artistId: profile.id,
    type,
    url,
    caption: caption || null,
  }).returning();

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

export default router;
