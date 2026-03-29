import { Router } from "express";
import { db, eventArtistsTable, eventsTable } from "@workspace/db";
import { desc, eq, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { formatEvent } from "./helpers.js";

const router = Router();

router.get("/events", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const city = typeof req.query.city === "string" ? req.query.city : undefined;
  const events = await db.select().from(eventsTable)
    .where(q || city ? or(
      q ? ilike(eventsTable.title, `%${q}%`) : undefined,
      q ? ilike(eventsTable.description, `%${q}%`) : undefined,
      city ? ilike(eventsTable.city, `%${city}%`) : undefined,
    ) : undefined)
    .orderBy(eventsTable.startsAt);
  res.json(await Promise.all(events.map((event) => formatEvent(event))));
});

router.post("/events", requireAuth, async (req, res) => {
  const { title, description, startsAt, location, city, imageUrl, lineupArtistIds, lineupTags } = req.body;
  if (!title || !description || !startsAt || !location) {
    res.status(400).json({ error: "title, description, startsAt, and location are required" });
    return;
  }

  const [event] = await db.insert(eventsTable).values({
    hostUserId: req.session.userId!,
    title,
    description,
    startsAt: new Date(startsAt),
    location,
    city: city || null,
    imageUrl: imageUrl || null,
    lineupTags: Array.isArray(lineupTags) ? lineupTags : [],
  }).returning();

  const artistIds = Array.isArray(lineupArtistIds) ? lineupArtistIds.map(Number).filter(Boolean) : [];
  if (artistIds.length > 0) {
    await db.insert(eventArtistsTable).values(
      artistIds.map((userId, index) => ({
        eventId: event.id,
        userId,
        isHeadliner: index === 0,
      })),
    ).onConflictDoNothing();
  }

  res.status(201).json(await formatEvent(event));
});

router.get("/events/:eventId", async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (Number.isNaN(eventId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await formatEvent(event));
});

export default router;
