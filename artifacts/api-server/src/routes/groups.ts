import { Router } from "express";
import { db, groupMembersTable, groupPostsTable, groupsTable, postsTable } from "@workspace/db";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { formatGroup, getGroupPostsPage, normalizeSlug } from "./helpers.js";

const router = Router();

router.get("/groups", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const location = typeof req.query.location === "string" ? req.query.location : undefined;
  const conditions = [];
  if (q) {
    conditions.push(or(ilike(groupsTable.name, `%${q}%`), ilike(groupsTable.description, `%${q}%`)));
  }
  if (location) {
    conditions.push(ilike(groupsTable.location, `%${location}%`));
  }

  const groups = await db.select().from(groupsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(groupsTable.updatedAt));
  res.json(await Promise.all(groups.map((group) => formatGroup(group, req.session.userId))));
});

router.get("/groups/:groupId", async (req, res) => {
  const groupId = Number(req.params.groupId);
  if (Number.isNaN(groupId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const page = await getGroupPostsPage(groupId, req.session.userId, { limit: 10 });

  res.json({
    group: await formatGroup(group, req.session.userId),
    posts: page.posts,
  });
});

router.get("/groups/:groupId/posts", async (req, res) => {
  const groupId = Number(req.params.groupId);
  if (Number.isNaN(groupId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const page = await getGroupPostsPage(groupId, req.session.userId, { cursor, limit });

  res.json({
    posts: page.posts,
    total: page.posts.length,
    limit: Math.min(Math.max(limit ?? 12, 1), 30),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  });
});

router.post("/groups", requireAuth, async (req, res) => {
  const { name, description, coverImageUrl, visibility, category, location, tags } = req.body;
  if (!name || !description) {
    res.status(400).json({ error: "name and description are required" });
    return;
  }

  const slugBase = normalizeSlug(name);
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
  const [group] = await db.insert(groupsTable).values({
    ownerId: req.session.userId!,
    name,
    slug,
    description,
    coverImageUrl: coverImageUrl || null,
    visibility: visibility || "public",
    category: category || null,
    location: location || null,
    tags: Array.isArray(tags) ? tags : [],
  }).returning();

  await db.insert(groupMembersTable).values({
    groupId: group.id,
    userId: req.session.userId!,
    role: "owner",
  }).onConflictDoNothing();

  res.status(201).json(await formatGroup(group, req.session.userId));
});

router.post("/groups/:groupId/join", requireAuth, async (req, res) => {
  const groupId = Number(req.params.groupId);
  if (Number.isNaN(groupId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.insert(groupMembersTable).values({
    groupId,
    userId: req.session.userId!,
    role: "member",
  }).onConflictDoNothing();
  res.json({ success: true, message: "Joined group" });
});

router.post("/groups/:groupId/leave", requireAuth, async (req, res) => {
  const groupId = Number(req.params.groupId);
  if (Number.isNaN(groupId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.delete(groupMembersTable).where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, req.session.userId!)));
  res.json({ success: true, message: "Left group" });
});

export default router;
