import { db, usersTable, artistProfilesTable, postsTable, followsTable, galleryItemsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const adminHash = await bcrypt.hash("admin123", 10);
  const [admin] = await db.insert(usersTable).values({
    username: "admin",
    email: "admin@artisthub.com",
    passwordHash: adminHash,
    profileType: "user",
    isAdmin: true,
    bio: "Platform administrator",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
  }).onConflictDoNothing().returning();

  // Create regular users
  const userHash = await bcrypt.hash("password123", 10);

  const [user1] = await db.insert(usersTable).values({
    username: "jazzfan99",
    email: "jazzfan@example.com",
    passwordHash: userHash,
    profileType: "user",
    bio: "Music lover, event promoter",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=jazzfan99",
  }).onConflictDoNothing().returning();

  const [user2] = await db.insert(usersTable).values({
    username: "nightowl_promo",
    email: "promoter@example.com",
    passwordHash: userHash,
    profileType: "user",
    bio: "NYC nightlife promoter. DM for bookings",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=nightowl",
  }).onConflictDoNothing().returning();

  // Create artist users
  const [dj1] = await db.insert(usersTable).values({
    username: "dj_cipher",
    email: "djcipher@example.com",
    passwordHash: userHash,
    profileType: "artist",
    bio: "Underground techno DJ. Residency at Club Voltage every Friday",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=djcipher",
  }).onConflictDoNothing().returning();

  const [artist2] = await db.insert(usersTable).values({
    username: "luna_photography",
    email: "luna@example.com",
    passwordHash: userHash,
    profileType: "artist",
    bio: "Nightlife & event photographer based in LA",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=luna",
  }).onConflictDoNothing().returning();

  const [artist3] = await db.insert(usersTable).values({
    username: "mxbeats",
    email: "mxbeats@example.com",
    passwordHash: userHash,
    profileType: "artist",
    bio: "Producer & beatmaker. Hip-hop, trap, lo-fi",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mxbeats",
  }).onConflictDoNothing().returning();

  const [artist4] = await db.insert(usersTable).values({
    username: "neon_model",
    email: "neon@example.com",
    passwordHash: userHash,
    profileType: "artist",
    bio: "Editorial & commercial model. Based in Miami",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=neonmodel",
  }).onConflictDoNothing().returning();

  // Create artist profiles
  if (dj1) {
    await db.insert(artistProfilesTable).values({
      userId: dj1.id,
      category: "DJ",
      location: "New York, NY",
      tags: ["techno", "underground", "electronic", "house"],
      bio: "10+ years in the underground techno scene. Specializing in dark techno, industrial and experimental sounds.",
      bookingEmail: "djcipher.bookings@example.com",
    }).onConflictDoNothing();

    const [djProfile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, dj1.id)).limit(1);
    if (djProfile) {
      await db.insert(galleryItemsTable).values([
        {
          artistId: djProfile.id,
          type: "video",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          caption: "Live set at Voltage NYC - 2024",
        },
        {
          artistId: djProfile.id,
          type: "audio",
          url: "https://soundcloud.com/djcipher/live-mix-2024",
          caption: "Techno mix tape Vol. 3",
        },
        {
          artistId: djProfile.id,
          type: "image",
          url: "https://images.unsplash.com/photo-1571266028243-d220c6191fce?w=800",
          caption: "Club Voltage - Residency Night",
        },
      ]).onConflictDoNothing();
    }
  }

  if (artist2) {
    await db.insert(artistProfilesTable).values({
      userId: artist2.id,
      category: "Photographer",
      location: "Los Angeles, CA",
      tags: ["nightlife", "events", "editorial", "portrait"],
      bio: "Available for events, shows, and editorial shoots. Fast turnaround on deliverables.",
      bookingEmail: "luna.photo@example.com",
    }).onConflictDoNothing();

    const [photoProfile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, artist2.id)).limit(1);
    if (photoProfile) {
      await db.insert(galleryItemsTable).values([
        {
          artistId: photoProfile.id,
          type: "image",
          url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
          caption: "Club night - LA 2024",
        },
        {
          artistId: photoProfile.id,
          type: "image",
          url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
          caption: "Artist portrait session",
        },
      ]).onConflictDoNothing();
    }
  }

  if (artist3) {
    await db.insert(artistProfilesTable).values({
      userId: artist3.id,
      category: "Producer",
      location: "Atlanta, GA",
      tags: ["hip-hop", "trap", "lo-fi", "beats"],
      bio: "Crafting beats since 2015. Worked with independent artists across the US.",
      bookingEmail: "mxbeats@example.com",
    }).onConflictDoNothing();
  }

  if (artist4) {
    await db.insert(artistProfilesTable).values({
      userId: artist4.id,
      category: "Model",
      location: "Miami, FL",
      tags: ["editorial", "commercial", "fashion", "print"],
      bio: "Signed with Next Models. Available for editorial, commercial, and brand campaigns.",
      bookingEmail: "neon.model@example.com",
    }).onConflictDoNothing();

    const [modelProfile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, artist4.id)).limit(1);
    if (modelProfile) {
      await db.insert(galleryItemsTable).values([
        {
          artistId: modelProfile.id,
          type: "image",
          url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800",
          caption: "Editorial shoot - Vogue",
        },
      ]).onConflictDoNothing();
    }
  }

  // Create some posts
  const postUsers = [dj1, artist2, artist3, user1, user2].filter(Boolean);
  const samplePosts = [
    { userId: dj1?.id, content: "Residency night was absolutely electric! Thank you NYC for showing up 🔥 Next Friday we go again at Club Voltage.", imageUrl: "https://images.unsplash.com/photo-1571266028243-d220c6191fce?w=800" },
    { userId: artist2?.id, content: "New gallery drop from last weekend's show. Catch the full album on my profile." },
    { userId: artist3?.id, content: "New pack dropping this Friday. 30 samples, 10 one-shots, 5 bonus loops. Stay tuned 🎧" },
    { userId: user1?.id, content: "Just discovered @dj_cipher last night - genuinely one of the most talented selectors in the underground scene right now. Book them for your next event!" },
    { userId: user2?.id, content: "Looking for a photographer for an event next month in Brooklyn. Hit my DMs!" },
    { userId: dj1?.id, content: "The silence between the tracks is where the magic lives. 🌑" },
  ];

  for (const post of samplePosts) {
    if (post.userId) {
      await db.insert(postsTable).values({
        userId: post.userId,
        content: post.content,
        imageUrl: post.imageUrl || null,
      }).onConflictDoNothing();
    }
  }

  // Create follows
  const followPairs = [
    [user1?.id, dj1?.id],
    [user1?.id, artist2?.id],
    [user2?.id, dj1?.id],
    [user2?.id, artist3?.id],
    [dj1?.id, artist3?.id],
    [artist2?.id, dj1?.id],
  ];

  for (const [followerId, followingId] of followPairs) {
    if (followerId && followingId) {
      await db.insert(followsTable).values({ followerId, followingId }).onConflictDoNothing();
    }
  }

  console.log("✅ Seed complete!");
}

seed().catch(console.error).finally(() => process.exit());
