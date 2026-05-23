import crypto from "node:crypto";
import { Router } from "express";
import { db, invitesTable, usersTable } from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getUserSummary } from "./helpers.js";

const router = Router();

function makeInviteCode() {
  return crypto.randomBytes(12).toString("base64url");
}

async function generateUniqueInviteCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeInviteCode();
    const [existing] = await db.select({ id: invitesTable.id }).from(invitesTable).where(eq(invitesTable.code, code)).limit(1);
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique invite code");
}

function serializeInvite(
  invite: typeof invitesTable.$inferSelect,
  acceptedUser?: Awaited<ReturnType<typeof getUserSummary>> | null,
) {
  return {
    id: invite.id,
    label: invite.label,
    code: invite.code,
    status: invite.status,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
    createdAt: invite.createdAt,
    updatedAt: invite.updatedAt,
    acceptedUser: acceptedUser ?? null,
  };
}

router.get("/invites", requireAuth, async (req, res) => {
  const invites = await db.select().from(invitesTable)
    .where(eq(invitesTable.inviterUserId, req.session.userId!))
    .orderBy(desc(invitesTable.createdAt));

  const acceptedUserIds = invites.map((invite) => invite.acceptedUserId).filter((value): value is number => typeof value === "number");
  const acceptedUsers = acceptedUserIds.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, acceptedUserIds))
    : [];
  const acceptedUserMap = new Map<number, Awaited<ReturnType<typeof getUserSummary>>>();
  for (const user of acceptedUsers) {
    acceptedUserMap.set(user.id, await getUserSummary(user, req.session.userId));
  }

  res.json({
    invites: invites.map((invite) => serializeInvite(invite, invite.acceptedUserId ? acceptedUserMap.get(invite.acceptedUserId) ?? null : null)),
  });
});

router.post("/invites", requireAuth, async (req, res) => {
  const label = typeof req.body?.label === "string" ? req.body.label.trim().slice(0, 120) : "";

  const code = await generateUniqueInviteCode();
  const [invite] = await db.insert(invitesTable).values({
    inviterUserId: req.session.userId!,
    label: label || null,
    code,
    status: "pending",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  }).returning();

  res.status(201).json({
    invite: serializeInvite(invite),
  });
});

router.post("/invites/:inviteId/revoke", requireAuth, async (req, res) => {
  const inviteId = Number(req.params.inviteId);
  if (!Number.isFinite(inviteId)) {
    res.status(400).json({ error: "Invalid invite", message: "Invite id must be a number." });
    return;
  }

  const [invite] = await db.select().from(invitesTable).where(
    and(
      eq(invitesTable.id, inviteId),
      eq(invitesTable.inviterUserId, req.session.userId!),
    ),
  ).limit(1);

  if (!invite) {
    res.status(404).json({ error: "Invite not found", message: "That invite could not be found." });
    return;
  }

  if (invite.status !== "pending") {
    res.status(400).json({ error: "Invite already closed", message: "Only pending invites can be revoked." });
    return;
  }

  const [updatedInvite] = await db.update(invitesTable).set({
    status: "revoked",
    updatedAt: new Date(),
  }).where(eq(invitesTable.id, invite.id)).returning();

  res.json({
    invite: serializeInvite(updatedInvite),
  });
});

router.get("/invites/by-code/:code", async (req, res) => {
  const code = req.params.code?.trim();
  if (!code) {
    res.status(400).json({ error: "Invalid invite", message: "Invite code is required." });
    return;
  }

  const [invite] = await db.select().from(invitesTable).where(eq(invitesTable.code, code)).limit(1);
  if (!invite) {
    res.status(404).json({ error: "Invite not found", message: "This invite link does not exist." });
    return;
  }

  const [inviter] = await db.select().from(usersTable).where(eq(usersTable.id, invite.inviterUserId)).limit(1);
  const isExpired = !!invite.expiresAt && invite.expiresAt.getTime() < Date.now();
  if (isExpired && invite.status === "pending") {
    await db.update(invitesTable).set({ status: "expired", updatedAt: new Date() }).where(eq(invitesTable.id, invite.id));
    invite.status = "expired";
  }

  res.json({
    invite: {
      id: invite.id,
      label: invite.label,
      code: invite.code,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      inviter: inviter ? await getUserSummary(inviter) : null,
      isValid: invite.status === "pending" && !isExpired,
    },
  });
});

export default router;
