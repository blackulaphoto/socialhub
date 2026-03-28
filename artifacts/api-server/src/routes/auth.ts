import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, artistProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function formatUser(user: typeof usersTable.$inferSelect, counts: { followerCount: number; followingCount: number; postCount: number }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    profileType: user.profileType,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
    postCount: counts.postCount,
    createdAt: user.createdAt,
  };
}

router.post("/register", async (req, res) => {
  const parseResult = RegisterBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid input", message: parseResult.error.message });
    return;
  }
  const { username, email, password, profileType } = parseResult.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use", message: "An account with this email already exists" });
    return;
  }

  const usernameCheck = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (usernameCheck.length > 0) {
    res.status(400).json({ error: "Username taken", message: "This username is already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    username,
    email,
    passwordHash,
    profileType: profileType as "user" | "artist",
  }).returning();

  if (profileType === "artist") {
    await db.insert(artistProfilesTable).values({
      userId: user.id,
      category: "DJ",
      tags: [],
    });
  }

  req.session.userId = user.id;
  res.status(201).json({
    user: formatUser(user, { followerCount: 0, followingCount: 0, postCount: 0 }),
    message: "Account created successfully",
  });
});

router.post("/login", async (req, res) => {
  const parseResult = LoginBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid input", message: parseResult.error.message });
    return;
  }
  const { email, password } = parseResult.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials", message: "Email or password is incorrect" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "Account banned", message: "Your account has been banned" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials", message: "Email or password is incorrect" });
    return;
  }

  req.session.userId = user.id;

  const { followerCount, followingCount, postCount } = await getUserCounts(user.id);
  res.json({
    user: formatUser(user, { followerCount, followingCount, postCount }),
    message: "Logged in successfully",
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out" });
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Not found", message: "User not found" });
    return;
  }

  const { followerCount, followingCount, postCount } = await getUserCounts(user.id);
  res.json(formatUser(user, { followerCount, followingCount, postCount }));
});

async function getUserCounts(userId: number) {
  const { followsTable, postsTable } = await import("@workspace/db");
  const { count } = await import("drizzle-orm");
  const [followerResult] = await db.select({ count: count() }).from(followsTable).where(eq(followsTable.followingId, userId));
  const [followingResult] = await db.select({ count: count() }).from(followsTable).where(eq(followsTable.followerId, userId));
  const [postResult] = await db.select({ count: count() }).from(postsTable).where(eq(postsTable.userId, userId));
  return {
    followerCount: Number(followerResult?.count ?? 0),
    followingCount: Number(followingResult?.count ?? 0),
    postCount: Number(postResult?.count ?? 0),
  };
}

export { getUserCounts, formatUser };
export default router;
