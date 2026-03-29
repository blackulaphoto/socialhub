import { Router } from "express";
import { artistProfilesTable, db, userProfileDetailsTable, usersTable } from "@workspace/db";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { formatArtistProfile, getUserSummary } from "./helpers.js";

const router = Router();

router.get("/search", async (req, res) => {
  const { q, type = "all", location, category, tags } = req.query as Record<string, string>;

  const userConditions = [];
  if (q) {
    userConditions.push(or(
      ilike(usersTable.username, `%${q}%`),
      ilike(usersTable.bio, `%${q}%`),
    ));
  }
  if (location) {
    const localDetails = await db.select({ userId: userProfileDetailsTable.userId })
      .from(userProfileDetailsTable)
      .where(or(ilike(userProfileDetailsTable.location, `%${location}%`), ilike(userProfileDetailsTable.city, `%${location}%`)));
    const ids = localDetails.map((entry) => entry.userId);
    if (ids.length > 0) {
      userConditions.push(or(...ids.map((id) => eq(usersTable.id, id))));
    }
  }

  const artistConditions = [];
  if (q) {
    artistConditions.push(or(
      ilike(usersTable.username, `%${q}%`),
      ilike(artistProfilesTable.category, `%${q}%`),
      ilike(artistProfilesTable.location, `%${q}%`),
      sql`${artistProfilesTable.tags} && ARRAY[${sql`${q}`}]::text[]`,
    ));
  }
  if (location) artistConditions.push(ilike(artistProfilesTable.location, `%${location}%`));
  if (category) artistConditions.push(ilike(artistProfilesTable.category, `%${category}%`));
  if (tags) {
    const tagList = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (tagList.length > 0) {
      artistConditions.push(sql`${artistProfilesTable.tags} && ARRAY[${sql.join(tagList.map((tag) => sql`${tag}`), sql`, `)}]::text[]`);
    }
  }

  const users = (type === "all" || type === "users")
    ? await db.select().from(usersTable).where(userConditions.length > 0 ? and(...userConditions) : undefined).limit(24)
    : [];
  const artists = (type === "all" || type === "artists")
    ? await db.select().from(artistProfilesTable)
      .innerJoin(usersTable, eq(artistProfilesTable.userId, usersTable.id))
      .where(artistConditions.length > 0 ? and(...artistConditions) : undefined)
      .limit(24)
    : [];

  res.json({
    users: await Promise.all(users.map((user) => getUserSummary(user))),
    artists: await Promise.all(artists.map((artist) => formatArtistProfile(artist.artist_profiles, artist.users))),
    total: users.length + artists.length,
  });
});

export default router;
