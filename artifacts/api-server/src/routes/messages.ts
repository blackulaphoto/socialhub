import { Router } from "express";
import { db, messagesTable, conversationsTable, usersTable, artistProfilesTable } from "@workspace/db";
import { eq, or, and, desc, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getUserSummary } from "./users.js";

const router = Router();

async function getOrCreateConversation(user1Id: number, user2Id: number) {
  const [minId, maxId] = [Math.min(user1Id, user2Id), Math.max(user1Id, user2Id)];
  const [existing] = await db.select().from(conversationsTable)
    .where(and(eq(conversationsTable.user1Id, minId), eq(conversationsTable.user2Id, maxId)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(conversationsTable).values({
    user1Id: minId,
    user2Id: maxId,
  }).returning();
  return created;
}

router.get("/conversations", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const conversations = await db.select().from(conversationsTable)
    .where(or(eq(conversationsTable.user1Id, userId), eq(conversationsTable.user2Id, userId)))
    .orderBy(desc(conversationsTable.lastMessageAt));

  const enriched = await Promise.all(conversations.map(async (conv) => {
    const otherUserId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
    const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);
    if (!otherUser) return null;

    const otherUserSummary = await getUserSummary(otherUser);

    const [lastMsg] = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conv.id))
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);

    const [unreadResult] = await db.select({ count: count() }).from(messagesTable)
      .where(and(
        eq(messagesTable.conversationId, conv.id),
        eq(messagesTable.isRead, false),
      ));

    const unreadCount = Number(unreadResult?.count ?? 0);

    return {
      id: conv.id,
      otherUser: otherUserSummary,
      lastMessage: lastMsg?.content ?? null,
      lastMessageAt: lastMsg?.createdAt ?? null,
      unreadCount,
    };
  }));

  res.json(enriched.filter(Boolean));
});

router.get("/conversations/:conversationId", requireAuth, async (req, res) => {
  const convId = parseInt(req.params.conversationId);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const userId = req.session.userId!;
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.user1Id !== userId && conv.user2Id !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;

  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit).offset(offset);

  // Mark messages as read
  await db.update(messagesTable).set({ isRead: true })
    .where(and(eq(messagesTable.conversationId, convId), eq(messagesTable.isRead, false)));

  res.json(messages.reverse());
});

router.post("/send", requireAuth, async (req, res) => {
  const { recipientId, content } = req.body;
  if (!recipientId || !content) { res.status(400).json({ error: "recipientId and content are required" }); return; }

  const conv = await getOrCreateConversation(req.session.userId!, recipientId);

  const [msg] = await db.insert(messagesTable).values({
    conversationId: conv.id,
    senderId: req.session.userId!,
    content,
    isBookingInquiry: false,
  }).returning();

  await db.update(conversationsTable).set({ lastMessageAt: new Date() }).where(eq(conversationsTable.id, conv.id));

  res.status(201).json(msg);
});

router.post("/book/:artistId", requireAuth, async (req, res) => {
  const artistId = parseInt(req.params.artistId);
  if (isNaN(artistId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { message, eventDate, eventLocation, eventType } = req.body;
  if (!message) { res.status(400).json({ error: "Message is required" }); return; }

  const inquiryText = [
    "🎵 BOOKING INQUIRY",
    eventType ? `Event Type: ${eventType}` : null,
    eventDate ? `Date: ${eventDate}` : null,
    eventLocation ? `Location: ${eventLocation}` : null,
    `\n${message}`,
  ].filter(Boolean).join("\n");

  const conv = await getOrCreateConversation(req.session.userId!, artistId);

  const [msg] = await db.insert(messagesTable).values({
    conversationId: conv.id,
    senderId: req.session.userId!,
    content: inquiryText,
    isBookingInquiry: true,
  }).returning();

  await db.update(conversationsTable).set({ lastMessageAt: new Date() }).where(eq(conversationsTable.id, conv.id));

  res.status(201).json(msg);
});

export default router;
