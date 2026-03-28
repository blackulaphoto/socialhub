import { Router } from "express";
import { db, usersTable, artistProfilesTable, galleryItemsTable } from "@workspace/db";
import { eq, and, ilike, desc, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getUserSummary } from "./users.js";

const router = Router();

async function formatArtistProfile(profile: typeof artistProfilesTable.$inferSelect, user: typeof usersTable.$inferSelect) {
  const gallery = await db.select().from(galleryItemsTable)
    .where(eq(galleryItemsTable.artistId, profile.id))
    .orderBy(desc(galleryItemsTable.createdAt));
  const userSummary = await getUserSummary(user);
  return { ...profile, gallery, user: userSummary };
}

router.get("/artists", async (req, res) => {
  const { location, category, tags, page: pageStr, limit: limitStr } = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(pageStr) || 1);
  const limit = Math.min(50, parseInt(limitStr) || 20);
  const offset = (page - 1) * limit;

  let query = db.select().from(artistProfilesTable).innerJoin(usersTable, eq(artistProfilesTable.userId, usersTable.id));

  const conditions = [];
  if (location) conditions.push(ilike(artistProfilesTable.location!, `%${location}%`));
  if (category) conditions.push(ilike(artistProfilesTable.category, `%${category}%`));
  if (tags) {
    const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      conditions.push(sql`${artistProfilesTable.tags} && ARRAY[${sql.join(tagList.map(t => sql`${t}`), sql`, `)}]::text[]`);
    }
  }

  const allResults = await db.select().from(artistProfilesTable)
    .innerJoin(usersTable, eq(artistProfilesTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = allResults.length;

  const results = await db.select().from(artistProfilesTable)
    .innerJoin(usersTable, eq(artistProfilesTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limit).offset(offset);

  const artists = await Promise.all(results.map(r => formatArtistProfile(r.artist_profiles, r.users)));

  res.json({ artists, total, page, totalPages: Math.ceil(total / limit) });
});

router.get("/artists/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found", message: "User not found" }); return; }

  const [profile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);
  if (!profile) { res.status(404).json({ error: "Not found", message: "Artist profile not found" }); return; }

  const formatted = await formatArtistProfile(profile, user);
  res.json(formatted);
});

router.post("/artists/:userId/update", requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  if (userId !== req.session.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { category, location, tags, bio, bookingEmail } = req.body;

  let [profile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);
  if (!profile) {
    [profile] = await db.insert(artistProfilesTable).values({
      userId,
      category: category || "DJ",
      location: location || null,
      tags: tags || [],
      bio: bio || null,
      bookingEmail: bookingEmail || null,
    }).returning();
  } else {
    [profile] = await db.update(artistProfilesTable).set({
      category: category ?? profile.category,
      location: location ?? null,
      tags: tags ?? profile.tags,
      bio: bio ?? null,
      bookingEmail: bookingEmail ?? null,
      updatedAt: new Date(),
    }).where(eq(artistProfilesTable.userId, userId)).returning();
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const formatted = await formatArtistProfile(profile, user!);
  res.json(formatted);
});

router.post("/artists/:userId/gallery", requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId) || userId !== req.session.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [profile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);
  if (!profile) { res.status(404).json({ error: "Artist profile not found" }); return; }

  const { type, url, caption } = req.body;
  if (!type || !url) { res.status(400).json({ error: "type and url are required" }); return; }

  const [item] = await db.insert(galleryItemsTable).values({
    artistId: profile.id,
    type: type as "image" | "video" | "audio",
    url,
    caption: caption || null,
  }).returning();

  res.status(201).json(item);
});

router.delete("/artists/:userId/gallery/:itemId", requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const itemId = parseInt(req.params.itemId);
  if (isNaN(userId) || isNaN(itemId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  if (userId !== req.session.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(galleryItemsTable).where(eq(galleryItemsTable.id, itemId));
  res.json({ success: true, message: "Gallery item deleted" });
});

export default router;
