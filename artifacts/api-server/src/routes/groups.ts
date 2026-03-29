import { Router } from "express";
import { db, groupMembersTable, groupPostsTable, groupsTable, postsTable } from "@workspace/db";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { enrichPost, formatGroup, normalizeSlug } from "./helpers.js";

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

  const groupPosts = await db.select().from(groupPostsTable)
    .where(eq(groupPostsTable.groupId, groupId))
    .orderBy(desc(groupPostsTable.createdAt));
  const postIds = groupPosts.map((entry) => entry.postId);
  const posts = postIds.length
    ? await db.select().from(postsTable).where(or(...postIds.map((id) => eq(postsTable.id, id))))
    : [];

  res.json({
    group: await formatGroup(group, req.session.userId),
    posts: await Promise.all(posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((post) => enrichPost(post, req.session.userId))),
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
