import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, userProfileDetailsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";
import { formatUser } from "./helpers.js";

const router = Router();

router.post("/register", async (req, res) => {
  const parseResult = RegisterBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid input", message: parseResult.error.message });
    return;
  }
  const { username, email, password } = parseResult.data;

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
    profileType: "user",
  }).returning();

  await db.insert(userProfileDetailsTable).values({
    userId: user.id,
    themeName: "nocturne",
    accentColor: "#8b5cf6",
    onboardingCompleted: false,
    onboardingStep: "profile",
    links: [],
  }).onConflictDoNothing();

  req.session.userId = user.id;
  res.status(201).json({
    user: await formatUser(user),
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
  res.json({
    user: await formatUser(user),
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

  res.json(await formatUser(user));
});
export default router;
