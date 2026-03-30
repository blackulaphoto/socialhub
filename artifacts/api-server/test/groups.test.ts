import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDeleteChain, createInsertChain, createThenableChain } from "./support/db";
import { createTestApp } from "./support/http";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
};

const formatGroup = vi.fn(async (group: any) => ({
  id: group.id,
  name: group.name,
  slug: group.slug,
}));

const getGroupPostsPage = vi.fn(async () => ({
  posts: [{ id: 91, content: "group post" }],
  nextCursor: null,
  hasMore: false,
}));

const normalizeSlug = vi.fn((value: string) => value.toLowerCase().replace(/\s+/g, "-"));

vi.mock("@workspace/db", () => ({
  db: mockDb,
  groupsTable: { id: "groups.id", name: "groups.name", description: "groups.description", location: "groups.location", updatedAt: "groups.updatedAt" },
  groupMembersTable: { groupId: "group_members.groupId", userId: "group_members.userId" },
  groupPostsTable: {},
  postsTable: {},
}));

vi.mock("../src/routes/helpers.js", () => ({
  formatGroup,
  getGroupPostsPage,
  normalizeSlug,
}));

describe("group routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 400 for invalid group id", async () => {
    const { default: groupsRouter } = await import("../src/routes/groups.js");
    const app = createTestApp(groupsRouter);

    const response = await request(app).get("/groups/not-a-number");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid ID");
  });

  it("returns group detail with posts", async () => {
    mockDb.select.mockReturnValueOnce(createThenableChain([{ id: 2, name: "Darkwave Artists", slug: "darkwave-artists" }]));

    const { default: groupsRouter } = await import("../src/routes/groups.js");
    const app = createTestApp(groupsRouter, 3);

    const response = await request(app).get("/groups/2");

    expect(response.status).toBe(200);
    expect(response.body.group).toMatchObject({ id: 2, name: "Darkwave Artists" });
    expect(response.body.posts).toHaveLength(1);
    expect(getGroupPostsPage).toHaveBeenCalledWith(2, 3, { limit: 10 });
  });

  it("lists groups with formatted results", async () => {
    mockDb.select.mockReturnValueOnce(createThenableChain([
      { id: 1, name: "Darkwave Artists", slug: "darkwave-artists" },
      { id: 2, name: "Gallery Openings", slug: "gallery-openings" },
    ]));

    const { default: groupsRouter } = await import("../src/routes/groups.js");
    const app = createTestApp(groupsRouter, 9);

    const response = await request(app).get("/groups?q=darkwave");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(formatGroup).toHaveBeenCalledTimes(2);
  });

  it("returns paginated group posts", async () => {
    getGroupPostsPage.mockResolvedValueOnce({
      posts: [{ id: 51, content: "late set times" }],
      nextCursor: 51,
      hasMore: true,
    });

    const { default: groupsRouter } = await import("../src/routes/groups.js");
    const app = createTestApp(groupsRouter, 4);

    const response = await request(app).get("/groups/2/posts?limit=5&cursor=99");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      total: 1,
      limit: 5,
      nextCursor: 51,
      hasMore: true,
    });
    expect(getGroupPostsPage).toHaveBeenCalledWith(2, 4, { cursor: 99, limit: 5 });
  });

  it("creates a group for the authenticated user", async () => {
    mockDb.insert
      .mockReturnValueOnce(createInsertChain([{ id: 10, name: "Gallery Openings", slug: "gallery-openings-ab12" }]))
      .mockReturnValueOnce(createInsertChain(undefined));

    const { default: groupsRouter } = await import("../src/routes/groups.js");
    const app = createTestApp(groupsRouter, 12);

    const response = await request(app)
      .post("/groups")
      .send({
        name: "Gallery Openings",
        description: "Announcements for gallery nights",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: 10, name: "Gallery Openings" });
    expect(normalizeSlug).toHaveBeenCalledWith("Gallery Openings");
  });

  it("joins and leaves a group", async () => {
    mockDb.insert.mockReturnValue(createInsertChain(undefined));
    mockDb.delete.mockReturnValue(createDeleteChain(undefined));

    const { default: groupsRouter } = await import("../src/routes/groups.js");
    const app = createTestApp(groupsRouter, 7);

    const joinResponse = await request(app).post("/groups/4/join");
    const leaveResponse = await request(app).post("/groups/4/leave");

    expect(joinResponse.status).toBe(200);
    expect(joinResponse.body.success).toBe(true);
    expect(leaveResponse.status).toBe(200);
    expect(leaveResponse.body.success).toBe(true);
  });
});
