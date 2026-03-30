import { db, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { createNotification } from "./notifications.js";

const MENTION_PATTERN = /(^|\s)@([a-zA-Z0-9_]+)/g;

export function extractMentionUsernames(input: string) {
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = MENTION_PATTERN.exec(input)) !== null) {
    const username = match[2]?.trim().toLowerCase();
    if (username) {
      matches.add(username);
    }
  }
  return [...matches];
}

export async function notifyMentionedUsers(input: {
  actorUserId: number;
  content: string;
  href: string;
  title: string;
  body: string;
  entityType: string;
  entityId: number;
}) {
  const usernames = extractMentionUsernames(input.content);
  if (usernames.length === 0) return;

  const candidates = await db.select().from(usersTable).where(inArray(usersTable.username, usernames));
  for (const user of candidates) {
    if (user.id === input.actorUserId) continue;
    await createNotification({
      userId: user.id,
      actorUserId: input.actorUserId,
      type: "mention",
      title: input.title,
      body: input.body,
      href: input.href,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  }
}
