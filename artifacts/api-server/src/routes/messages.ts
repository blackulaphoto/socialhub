import { Router } from "express";
import {
  conversationsTable,
  db,
  messageInquiriesTable,
  messagesTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { formatConversationForUser } from "./helpers.js";
import { createNotification, markConversationNotificationsRead } from "../lib/notifications.js";

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

async function createInquiryMessage(
  senderId: number,
  recipientId: number,
  payload: {
    inquiryType?: string;
    message: string;
    eventDate?: string;
    eventType?: string;
    budget?: string;
    projectDetails?: string;
    externalUrl?: string;
  },
) {
  const {
    inquiryType,
    message,
    eventDate,
    eventType,
    budget,
    projectDetails,
    externalUrl,
  } = payload;

  const header = String(inquiryType || "contact").toUpperCase().replace(/_/g, " ");
  const lines = [
    `INQUIRY: ${header}`,
    eventType ? `Type: ${eventType}` : null,
    eventDate ? `Date: ${eventDate}` : null,
    budget ? `Budget: ${budget}` : null,
    externalUrl ? `Link: ${externalUrl}` : null,
    projectDetails ? `Details: ${projectDetails}` : null,
    "",
    message,
  ].filter(Boolean);

  const conversation = await getOrCreateConversation(senderId, recipientId);
  const [created] = await db.insert(messagesTable).values({
    conversationId: conversation.id,
    senderId,
    content: lines.join("\n"),
    isBookingInquiry: true,
  }).returning();

  await db.insert(messageInquiriesTable).values({
    messageId: created.id,
    inquiryType: inquiryType || "contact",
    budget: budget || null,
    eventDate: eventDate || null,
    eventType: eventType || null,
    projectDetails: projectDetails || null,
    externalUrl: externalUrl || null,
  });

  await db.update(conversationsTable).set({ lastMessageAt: new Date() }).where(eq(conversationsTable.id, conversation.id));
  const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, senderId)).limit(1);
  if (actor) {
    await createNotification({
      userId: recipientId,
      actorUserId: actor.id,
      type: inquiryType === "book" ? "inquiry" : "inquiry",
      title: "New inquiry",
      body: `${actor.username} sent you an inquiry.`,
      href: `/messages/${conversation.id}`,
      entityType: "message",
      entityId: created.id,
      conversationId: conversation.id,
    });
  }
  return { ...created, inquiry: payload };
}

router.get("/conversations", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const conversations = await db.select().from(conversationsTable)
    .where(or(eq(conversationsTable.user1Id, userId), eq(conversationsTable.user2Id, userId)))
    .orderBy(desc(conversationsTable.lastMessageAt));

  const enriched = await Promise.all(
    conversations.map((conversation) =>
      formatConversationForUser(
        conversation.id,
        userId,
        conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id,
      ),
    ),
  );

  res.json(enriched.filter(Boolean));
});

router.get("/conversations/:conversationId", requireAuth, async (req, res) => {
  const conversationId = Number(req.params.conversationId);
  if (Number.isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const userId = req.session.userId!;
  const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId)).limit(1);
  if (!conversation) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(desc(messagesTable.createdAt));

  await db.update(messagesTable).set({ isRead: true })
    .where(and(
      eq(messagesTable.conversationId, conversationId),
      eq(messagesTable.isRead, false),
      eq(messagesTable.senderId, conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id),
    ));
  await markConversationNotificationsRead(userId, conversationId);

  const messageIds = messages.map((message) => message.id);
  const inquiries = messageIds.length > 0
    ? await db.select().from(messageInquiriesTable)
      .where(or(...messageIds.map((id) => eq(messageInquiriesTable.messageId, id))))
    : [];
  const inquiryMap = new Map(inquiries.map((inquiry) => [inquiry.messageId, inquiry]));

  res.json(messages.reverse().map((message) => ({
    ...message,
    inquiry: inquiryMap.get(message.id) ?? null,
  })));
});

router.post("/send", requireAuth, async (req, res) => {
  const { recipientId, content } = req.body;
  if (!recipientId || !content) {
    res.status(400).json({ error: "recipientId and content are required" });
    return;
  }

  const conversation = await getOrCreateConversation(req.session.userId!, Number(recipientId));
  const [message] = await db.insert(messagesTable).values({
    conversationId: conversation.id,
    senderId: req.session.userId!,
    content,
    isBookingInquiry: false,
  }).returning();

  await db.update(conversationsTable).set({ lastMessageAt: new Date() }).where(eq(conversationsTable.id, conversation.id));
  const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (actor) {
    await createNotification({
      userId: Number(recipientId),
      actorUserId: actor.id,
      type: "message",
      title: "New message",
      body: `${actor.username}: ${content}`,
      href: `/messages/${conversation.id}`,
      entityType: "message",
      entityId: message.id,
      conversationId: conversation.id,
    });
  }
  res.status(201).json(message);
});

router.post("/inquiries/:recipientId", requireAuth, async (req, res) => {
  const recipientId = Number(req.params.recipientId);
  if (Number.isNaN(recipientId)) {
    res.status(400).json({ error: "Invalid recipient" });
    return;
  }

  const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, recipientId)).limit(1);
  if (!recipient) {
    res.status(404).json({ error: "Recipient not found" });
    return;
  }

  const {
    inquiryType,
    message,
    eventDate,
    eventType,
    budget,
    projectDetails,
    externalUrl,
  } = req.body;

  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }
  res.status(201).json(await createInquiryMessage(req.session.userId!, recipientId, {
    inquiryType,
    message,
    eventDate,
    eventType,
    budget,
    projectDetails,
    externalUrl,
  }));
});

router.post("/book/:artistId", requireAuth, async (req, res) => {
  const artistId = Number(req.params.artistId);
  if (Number.isNaN(artistId) || !req.body?.message) {
    res.status(400).json({ error: "Invalid booking request" });
    return;
  }
  res.status(201).json(await createInquiryMessage(req.session.userId!, artistId, {
    inquiryType: "book",
    message: req.body.message,
    eventDate: req.body.eventDate,
    eventType: req.body.eventType,
    budget: req.body.budget,
    projectDetails: req.body.projectDetails,
    externalUrl: req.body.externalUrl ?? req.body.eventLocation,
  }));
});

export default router;
