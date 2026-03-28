import { Router } from "express";
import { db, usersTable, artistProfilesTable } from "@workspace/db";
import { ilike, eq, or, and, sql } from "drizzle-orm";
import { getUserSummary } from "./users.js";

const router = Router();

router.get("/search", async (req, res) => {
  const { q, type = "all", location, category, tags } = req.query as Record<string, string>;

  const userResults: ReturnType<typeof getUserSummary> extends Promise<infer T> ? T[] : never[] = [];
  const artistResults: any[] = [];

  if (type === "all" || type === "users") {
    const conditions = [];
    if (q) {
      conditions.push(or(
        ilike(usersTable.username, `%${q}%`),
        ilike(usersTable.bio!, `%${q}%`)
      ));
    }

    const users = await db.select().from(usersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(20);

    const summaries = await Promise.all(users.map(u => getUserSummary(u)));
    userResults.push(...summaries as any[]);
  }

  if (type === "all" || type === "artists") {
    const conditions = [];
    if (q) {
      conditions.push(or(
        ilike(usersTable.username, `%${q}%`),
        ilike(artistProfilesTable.category, `%${q}%`),
        ilike(artistProfilesTable.location!, `%${q}%`)
      ));
    }
    if (location) conditions.push(ilike(artistProfilesTable.location!, `%${location}%`));
    if (category) conditions.push(ilike(artistProfilesTable.category, `%${category}%`));
    if (tags) {
      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        conditions.push(sql`${artistProfilesTable.tags} && ARRAY[${sql.join(tagList.map(t => sql`${t}`), sql`, `)}]::text[]`);
      }
    }

    const results = await db.select().from(artistProfilesTable)
      .innerJoin(usersTable, eq(artistProfilesTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(20);

    const { galleryItemsTable } = await import("@workspace/db");
    const { desc } = await import("drizzle-orm");
    const formatted = await Promise.all(results.map(async r => {
      const gallery = await db.select().from(galleryItemsTable).where(eq(galleryItemsTable.artistId, r.artist_profiles.id)).orderBy(desc(galleryItemsTable.createdAt));
      const userSummary = await getUserSummary(r.users);
      return { ...r.artist_profiles, gallery, user: userSummary };
    }));
    artistResults.push(...formatted);
  }

  const total = userResults.length + artistResults.length;
  res.json({ users: userResults, artists: artistResults, total });
});

export default router;
