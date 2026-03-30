import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInsertChain, createThenableChain } from "./support/db";
import { createTestApp } from "./support/http";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

const formatUser = vi.fn(async (user: any) => ({
  id: user.id,
  username: user.username,
  email: user.email,
}));

vi.mock("@workspace/db", () => ({
  db: mockDb,
  usersTable: { id: "users.id", email: "users.email", username: "users.username" },
  userProfileDetailsTable: { userId: "profile.userId" },
}));

vi.mock("../src/routes/helpers.js", () => ({
  formatUser,
}));

describe("auth routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects duplicate registration email", async () => {
    mockDb.select
      .mockReturnValueOnce(createThenableChain([{ id: 1, email: "existing@example.com" }]));

    const { default: authRouter } = await import("../src/routes/auth.js");
    const app = createTestApp(authRouter);

    const response = await request(app)
      .post("/register")
      .send({ username: "newuser", email: "existing@example.com", password: "password123" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Email already in use");
  });

  it("creates a user and session on successful registration", async () => {
    mockDb.select
      .mockReturnValueOnce(createThenableChain([]))
      .mockReturnValueOnce(createThenableChain([]));
    mockDb.insert
      .mockReturnValueOnce(createInsertChain([{ id: 25, username: "newuser", email: "new@example.com" }]))
      .mockReturnValueOnce(createInsertChain(undefined));

    const { default: authRouter } = await import("../src/routes/auth.js");
    const app = createTestApp(authRouter);

    const response = await request(app)
      .post("/register")
      .send({ username: "newuser", email: "new@example.com", password: "password123" });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ id: 25, username: "newuser", email: "new@example.com" });
    expect(formatUser).toHaveBeenCalled();
  });

  it("rejects duplicate usernames", async () => {
    mockDb.select
      .mockReturnValueOnce(createThenableChain([]))
      .mockReturnValueOnce(createThenableChain([{ id: 2, username: "takenname" }]));

    const { default: authRouter } = await import("../src/routes/auth.js");
    const app = createTestApp(authRouter);

    const response = await request(app)
      .post("/register")
      .send({ username: "takenname", email: "fresh@example.com", password: "password123" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Username taken");
  });

  it("rejects invalid login credentials", async () => {
    mockDb.select.mockReturnValueOnce(createThenableChain([]));

    const { default: authRouter } = await import("../src/routes/auth.js");
    const app = createTestApp(authRouter);

    const response = await request(app)
      .post("/login")
      .send({ email: "missing@example.com", password: "password123" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid credentials");
  });

  it("rejects login for banned accounts", async () => {
    mockDb.select.mockReturnValueOnce(createThenableChain([{
      id: 5,
      email: "banned@example.com",
      username: "banneduser",
      passwordHash: "irrelevant",
      isBanned: true,
    }]));

    const { default: authRouter } = await import("../src/routes/auth.js");
    const app = createTestApp(authRouter);

    const response = await request(app)
      .post("/login")
      .send({ email: "banned@example.com", password: "password123" });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Account banned");
  });

  it("returns the current user for authenticated /me", async () => {
    mockDb.select.mockReturnValueOnce(createThenableChain([{
      id: 7,
      username: "admin",
      email: "admin@socialhub.local",
      isBanned: false,
    }]));

    const { default: authRouter } = await import("../src/routes/auth.js");
    const app = createTestApp(authRouter, 7);

    const response = await request(app).get("/me");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 7, username: "admin" });
  });

  it("logs out the current session", async () => {
    const { default: authRouter } = await import("../src/routes/auth.js");
    const app = createTestApp(authRouter, 7);

    const response = await request(app).post("/logout");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("returns 401 for unauthenticated /me", async () => {
    const { default: authRouter } = await import("../src/routes/auth.js");
    const app = createTestApp(authRouter);

    const response = await request(app).get("/me");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });
});
