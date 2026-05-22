import path from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  db,
  groupPostsTable,
  postCommentsTable,
  postMediaTable,
  postReactionsTable,
  postsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, inArray, like } from "drizzle-orm";

function getWorkspaceRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function getUploadRoot() {
  return process.env.LOCAL_UPLOAD_ROOT
    || process.env.UPLOAD_ROOT
    || path.join(getWorkspaceRoot(), ".local", "uploads");
}

function getPublicBaseUrl() {
  return (process.env.LOCAL_UPLOAD_PUBLIC_BASE_URL || process.env.UPLOAD_PUBLIC_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
}

async function findUserByUsername(username: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  return user ?? null;
}

async function ensureLocalFeedImageUrl(fileName: string) {
  const sourcePath = path.join(getWorkspaceRoot(), "feed images", fileName);
  const uploadDir = path.join(getUploadRoot(), "post");
  await mkdir(uploadDir, { recursive: true });
  const targetFileName = `feed-${fileName}`;
  const targetPath = path.join(uploadDir, targetFileName);
  await copyFile(sourcePath, targetPath);
  return `${getPublicBaseUrl()}/uploads/post/${targetFileName}`;
}

async function upsertImagePost(userId: number, content: string, imageUrls: string[]) {
  const media = imageUrls.map((url, index) => ({
    type: "image",
    url,
    title: `Feed image ${index + 1}`,
    thumbnailUrl: null,
  }));

  const [existing] = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.userId, userId), eq(postsTable.content, content)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(postsTable)
      .set({
        content,
        imageUrl: imageUrls[0] || null,
        updatedAt: new Date(),
      })
      .where(eq(postsTable.id, existing.id))
      .returning();

    await db.delete(postMediaTable).where(eq(postMediaTable.postId, existing.id));
    if (media.length) {
      await db.insert(postMediaTable).values(
        media.map((item) => ({
          postId: existing.id,
          type: item.type,
          url: item.url,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
        })),
      );
    }
    return updated;
  }

  const [created] = await db
    .insert(postsTable)
    .values({
      userId,
      actorSurface: "artist",
      content,
      imageUrl: imageUrls[0] || null,
      visibility: "public",
    })
    .returning();

  if (media.length) {
    await db.insert(postMediaTable).values(
      media.map((item) => ({
        postId: created.id,
        type: item.type,
        url: item.url,
        title: item.title,
        thumbnailUrl: item.thumbnailUrl,
      })),
    );
  }

  return created;
}

async function removeLocalPlaceholderPosts() {
  const removableUsers = (await Promise.all([
    findUserByUsername("admin"),
    findUserByUsername("brandon"),
  ])).filter(Boolean);

  if (!removableUsers.length) return 0;

  const removableUserIds = removableUsers.map((user) => user!.id);
  const candidatePosts = await db
    .select({ id: postsTable.id, userId: postsTable.userId, content: postsTable.content })
    .from(postsTable)
    .where(inArray(postsTable.userId, removableUserIds));

  const removableExactContent = new Set([
    "",
    "hello",
    "testing",
    "ok",
    "cool cool",
    "pics",
    "Valid8",
    "new art coming out",
    "new images",
    "https://www.youtube.com/live/_L9z1xyUykg?si=WznT-6du-Id6qIyy",
  ]);

  const postIds = candidatePosts
    .filter((post) => post.content == null
      || removableExactContent.has(post.content.trim())
      || post.content.startsWith("Signal boost ")
      || post.content.startsWith("<iframe ")
      || post.content.startsWith("So  it appears artist hub is coming along quite nicely"))
    .map((post) => post.id);

  if (!postIds.length) return 0;

  await db.delete(postMediaTable).where(inArray(postMediaTable.postId, postIds));
  await db.delete(postCommentsTable).where(inArray(postCommentsTable.postId, postIds));
  await db.delete(postReactionsTable).where(inArray(postReactionsTable.postId, postIds));
  await db.delete(groupPostsTable).where(inArray(groupPostsTable.postId, postIds));
  await db.delete(postsTable).where(inArray(postsTable.id, postIds));
  return postIds.length;
}

async function main() {
  console.log("Refreshing local feed imagery...");

  const removed = await removeLocalPlaceholderPosts();

  const imageFiles = [
    "3342ef7f-bbcd-4694-aad7-05de37d3db63.jpg",
    "56a8f024-a314-4b35-a4a0-3739fa5fd5e7.jpg",
    "577a33eb-f21c-4a11-a437-11729167fe8e.jpg",
    "5c68ba7f-c3fa-421b-ba93-9d2fd3395d11.jpg",
    "6ad659ab-2c23-49d5-8ecc-85e37462687f.jpg",
    "774fcbcd-2edd-48a5-adcd-8405d8ae6b63.jpg",
    "903bfa4b-31d1-487e-8fba-5064d268e701.jpg",
    "b0de2c92-ca01-4f68-aa16-20e3f3c3687d.jpg",
  ];

  const uploadedUrls = [];
  for (const fileName of imageFiles) {
    uploadedUrls.push(await ensureLocalFeedImageUrl(fileName));
  }

  const brandon = await findUserByUsername("brandon");
  const promoter = await findUserByUsername("blackula_events");
  const photographer = await findUserByUsername("luna_frames");
  const dj = await findUserByUsername("dj_cipher");

  const primaryArtist = brandon || photographer || promoter || dj;
  if (!primaryArtist || !promoter || !photographer || !dj) {
    throw new Error("Expected local users were not found. Make sure the local database is seeded first.");
  }

  await upsertImagePost(primaryArtist.id, "A few frames from the night.", uploadedUrls.slice(0, 4));
  await upsertImagePost(photographer.id, "Low light, reflective surfaces, and the last hour before sunrise.", uploadedUrls.slice(4, 6));
  await upsertImagePost(promoter.id, "Flyers, bodies, and the room right before doors.", uploadedUrls.slice(6, 8));
  await upsertImagePost(dj.id, "Afterhours atmosphere, no caption needed.", [uploadedUrls[2]]);

  console.log(`Removed ${removed} admin placeholder posts.`);
  console.log("Local feed image refresh complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
