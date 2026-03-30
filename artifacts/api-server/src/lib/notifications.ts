import { db, eventArtistsTable, eventsTable, notificationsTable, usersTable } from "@workspace/db";
import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { getUserSummary } from "../routes/helpers.js";

function truncateBody(body: string, maxLength = 220) {
  return body.length > maxLength ? `${body.slice(0, maxLength - 1)}...` : body;
}

export async function createNotification(input: {
  userId: number;
  actorUserId?: number | null;
  type: string;
  title: string;
  body: string;
  href: string;
  entityType?: string | null;
  entityId?: number | null;
  conversationId?: number | null;
}) {
  const [notification] = await db.insert(notificationsTable).values({
    userId: input.userId,
    actorUserId: input.actorUserId ?? null,
    type: input.type,
    title: input.title,
    body: truncateBody(input.body),
    href: input.href,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    conversationId: input.conversationId ?? null,
  }).returning();

  return notification;
}

export async function createNotificationIfMissing(input: {
  userId: number;
  actorUserId?: number | null;
  type: string;
  title: string;
  body: string;
  href: string;
  entityType?: string | null;
  entityId?: number | null;
  conversationId?: number | null;
}) {
  if (input.entityType && input.entityId != null) {
    const [existing] = await db.select().from(notificationsTable).where(
      and(
        eq(notificationsTable.userId, input.userId),
        eq(notificationsTable.type, input.type),
        eq(notificationsTable.entityType, input.entityType),
        eq(notificationsTable.entityId, input.entityId),
      ),
    ).limit(1);
    if (existing) {
      return existing;
    }
  }

  return createNotification(input);
}

export async function formatNotification(notification: typeof notificationsTable.$inferSelect) {
  const [actor] = notification.actorUserId
    ? await db.select().from(usersTable).where(eq(usersTable.id, notification.actorUserId)).limit(1)
    : [undefined];

  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    createdAt: notification.createdAt,
    isUnread: !notification.isRead,
    readAt: notification.readAt,
    actor: actor ? await getUserSummary(actor) : null,
  };
}

export async function getNotificationsForUser(userId: number, limit?: number) {
  await ensureEventReminderNotifications(userId);
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit ?? 50);

  return Promise.all(notifications.map((notification) => formatNotification(notification)));
}

export async function getActivitySummaryForUser(userId: number) {
  await ensureEventReminderNotifications(userId);
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(12);

  const [unreadMessageResult] = await db.select({ count: sql<number>`count(*)` }).from(notificationsTable)
    .where(and(
      eq(notificationsTable.userId, userId),
      eq(notificationsTable.isRead, false),
      inArray(notificationsTable.type, ["message", "inquiry"]),
    ));

  const [unreadResult] = await db.select({ count: sql<number>`count(*)` }).from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

  return {
    unreadMessages: Number(unreadMessageResult?.count ?? 0),
    unreadNotifications: Number(unreadResult?.count ?? 0),
    recentItems: await Promise.all(notifications.map((notification) => formatNotification(notification))),
  };
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const [notification] = await db.update(notificationsTable)
    .set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, userId)))
    .returning();

  return notification ?? null;
}

export async function markAllNotificationsRead(userId: number) {
  await db.update(notificationsTable)
    .set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
}

export async function markConversationNotificationsRead(userId: number, conversationId: number) {
  await db.update(notificationsTable)
    .set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(notificationsTable.userId, userId),
      eq(notificationsTable.conversationId, conversationId),
      eq(notificationsTable.isRead, false),
    ));
}

async function ensureEventReminderNotifications(userId: number) {
  const now = new Date();
  const upcomingWindowEnd = new Date(now.getTime() + 1000 * 60 * 60 * 72);

  const hostedEvents = await db.select().from(eventsTable).where(
    and(
      eq(eventsTable.hostUserId, userId),
      gte(eventsTable.startsAt, now),
      lte(eventsTable.startsAt, upcomingWindowEnd),
    ),
  );

  const linkedArtistEvents = await db.select({
    event: eventsTable,
  }).from(eventArtistsTable)
    .innerJoin(eventsTable, eq(eventArtistsTable.eventId, eventsTable.id))
    .where(and(
      eq(eventArtistsTable.userId, userId),
      gte(eventsTable.startsAt, now),
      lte(eventsTable.startsAt, upcomingWindowEnd),
    ));

  const events = [
    ...hostedEvents,
    ...linkedArtistEvents.map((row) => row.event),
  ];

  const uniqueEvents = new Map(events.map((event) => [event.id, event]));
  for (const event of uniqueEvents.values()) {
    const isHost = event.hostUserId === userId;
    await createNotificationIfMissing({
      userId,
      actorUserId: isHost ? null : event.hostUserId,
      type: "event_reminder",
      title: isHost ? "Upcoming event to host" : "Upcoming appearance",
      body: `${event.title} starts ${event.startsAt.toLocaleString()}.`,
      href: `/events/${event.id}`,
      entityType: "event",
      entityId: event.id,
    });
  }
}
