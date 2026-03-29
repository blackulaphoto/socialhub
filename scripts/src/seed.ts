import bcrypt from "bcryptjs";
import {
  artistProfilesTable,
  conversationsTable,
  creatorProfileSettingsTable,
  customFeedsTable,
  db,
  eventArtistsTable,
  eventsTable,
  followsTable,
  friendshipsTable,
  galleryItemsTable,
  groupMembersTable,
  groupPostsTable,
  groupsTable,
  messagesTable,
  postCommentsTable,
  postReactionsTable,
  postMediaTable,
  postsTable,
  profileReactionsTable,
  userPhotoItemsTable,
  userProfileDetailsTable,
  usersTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

async function findUserByEmail(email: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  return user;
}

async function ensureUser(values: typeof usersTable.$inferInsert) {
  let user = await findUserByEmail(values.email);
  if (user) {
    const [updated] = await db.update(usersTable)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();
    return updated;
  }
  [user] = await db.insert(usersTable).values(values).returning();
  return user;
}

async function ensureArtistProfile(userId: number, values: Omit<typeof artistProfilesTable.$inferInsert, "userId">) {
  const [existing] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);
  if (existing) {
    const [updated] = await db.update(artistProfilesTable)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(artistProfilesTable.userId, userId))
      .returning();
    return updated;
  }
  const [created] = await db.insert(artistProfilesTable).values({ userId, ...values }).returning();
  return created;
}

async function ensureUserDetails(userId: number, values: Omit<typeof userProfileDetailsTable.$inferInsert, "userId">) {
  await db.insert(userProfileDetailsTable).values({ userId, ...values }).onConflictDoUpdate({
    target: userProfileDetailsTable.userId,
    set: { ...values, updatedAt: new Date() },
  });
}

async function ensureCreatorSettings(userId: number, values: Omit<typeof creatorProfileSettingsTable.$inferInsert, "userId">) {
  await db.insert(creatorProfileSettingsTable).values({ userId, ...values }).onConflictDoUpdate({
    target: creatorProfileSettingsTable.userId,
    set: { ...values, updatedAt: new Date() },
  });
}

async function ensurePost(userId: number, content: string, imageUrl?: string | null, media?: Array<{ type: string; url: string; title?: string; thumbnailUrl?: string }>) {
  const [existing] = await db.select().from(postsTable).where(and(eq(postsTable.userId, userId), eq(postsTable.content, content))).limit(1);
  if (existing) return existing;
  const [post] = await db.insert(postsTable).values({ userId, content, imageUrl: imageUrl || null }).returning();
  if (media?.length) {
    await db.insert(postMediaTable).values(media.map((item) => ({
      postId: post.id,
      type: item.type,
      url: item.url,
      title: item.title || null,
      thumbnailUrl: item.thumbnailUrl || null,
    })));
  }
  return post;
}

async function ensureConversation(userA: number, userB: number) {
  const [user1Id, user2Id] = [Math.min(userA, userB), Math.max(userA, userB)];
  const [existing] = await db.select().from(conversationsTable).where(and(eq(conversationsTable.user1Id, user1Id), eq(conversationsTable.user2Id, user2Id))).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(conversationsTable).values({ user1Id, user2Id, lastMessageAt: new Date() }).returning();
  return created;
}

async function main() {
  console.log("Seeding upgraded Social Hub data...");

  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("password123", 10);

  const admin = await ensureUser({
    username: "admin",
    email: "admin@socialhub.local",
    passwordHash: adminHash,
    profileType: "user",
    isAdmin: true,
    bio: "Social Hub administrator",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin-socialhub",
  });

  const promoter = await ensureUser({
    username: "blackula_events",
    email: "promoter@socialhub.local",
    passwordHash: userHash,
    profileType: "user",
    bio: "Booking underground nights, fashion/editorial shoots, and cross-scene collabs.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=blackula",
  });

  const fan = await ensureUser({
    username: "nightcity_fan",
    email: "fan@socialhub.local",
    passwordHash: userHash,
    profileType: "user",
    bio: "Following local DJs, photographers, and darkwave events.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=nightcity",
  });

  const dj = await ensureUser({
    username: "dj_cipher",
    email: "djcipher@socialhub.local",
    passwordHash: userHash,
    profileType: "user",
    bio: "Industrial techno DJ and late-night selector.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=djcipher",
  });

  const photographer = await ensureUser({
    username: "luna_frames",
    email: "luna@socialhub.local",
    passwordHash: userHash,
    profileType: "user",
    bio: "Photographer covering nightlife, portraits, and fashion shoots in LA.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=lunaframes",
  });

  const designer = await ensureUser({
    username: "velvet_markup",
    email: "velvet@socialhub.local",
    passwordHash: userHash,
    profileType: "user",
    bio: "Designer building flyers, merch, and visual systems for music projects.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=velvet",
  });

  await ensureUserDetails(admin.id, {
    bannerUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600",
    location: "Platform Ops",
    city: "San Diego",
    age: 33,
    work: "Community and platform administration",
    school: "UC San Diego",
    about: "Keeping Social Hub usable, safe, and creator-friendly while the platform takes shape.",
    interests: ["creator tools", "community moderation", "music culture"],
    accentColor: "#a855f7",
    themeName: "nocturne",
    links: [{ label: "Support", url: "https://socialhub.local/support" }],
    featuredContent: "Moderation and platform management",
  });

  await ensureUserDetails(promoter.id, {
    bannerUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600",
    location: "Los Angeles, CA",
    city: "Los Angeles",
    age: 29,
    work: "Independent event promoter",
    school: "FIDM",
    about: "Building darkwave, techno, and fashion-linked events with people who actually show up and make things happen.",
    interests: ["techno", "fashion shoots", "gallery nights", "event production"],
    accentColor: "#f97316",
    themeName: "nocturne",
    links: [{ label: "Booking Form", url: "https://socialhub.local/bookings" }],
    featuredContent: "Curating darkwave, techno, and fashion-linked live events.",
  });

  await ensureUserDetails(fan.id, {
    bannerUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1600",
    location: "Long Beach, CA",
    city: "Long Beach",
    age: 25,
    work: "Freelance stylist assistant",
    school: "Long Beach City College",
    about: "Mostly here to follow local artists, save custom feeds, and keep track of what is actually happening in the scene.",
    interests: ["darkwave", "photography", "local shows", "styling"],
    accentColor: "#06b6d4",
    themeName: "nocturne",
    links: [{ label: "Favorites Feed", url: "https://socialhub.local/favorites" }],
    featuredContent: "Tracking upcoming appearances and local creators.",
  });

  await ensureUserDetails(dj.id, {
    bannerUrl: "https://images.unsplash.com/photo-1571266028243-d220c6191fce?w=1600",
    location: "Los Angeles, CA",
    city: "Los Angeles",
    age: 31,
    work: "DJ and event curator",
    school: "Self-taught",
    about: "I build hard, late-night sets for warehouse rooms and clubs that want something darker than the default.",
    interests: ["industrial techno", "modular synths", "warehouse culture", "visual collaborations"],
    accentColor: "#8b5cf6",
    themeName: "nocturne",
    links: [{ label: "SoundCloud", url: "https://soundcloud.com/djcipher" }],
    featuredContent: "Friday residency and warehouse bookings.",
  });

  await ensureUserDetails(photographer.id, {
    bannerUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600",
    location: "Los Angeles, CA",
    city: "Los Angeles",
    age: 28,
    work: "Photographer",
    school: "ArtCenter extension",
    about: "Covering nightlife, portraits, and fashion shoots with fast selects and moody low-light edits.",
    interests: ["portraiture", "editorial fashion", "nightlife documentation", "film photography"],
    accentColor: "#ec4899",
    themeName: "nocturne",
    links: [{ label: "Portfolio", url: "https://lunaframes.example.com" }],
    featuredContent: "Fast-turn nightlife galleries and artist promo kits.",
  });

  await ensureUserDetails(designer.id, {
    bannerUrl: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=1600",
    location: "San Francisco, CA",
    city: "San Francisco",
    age: 34,
    work: "Independent designer",
    school: "CCA",
    about: "Designing flyers, merch systems, and visual identities for artists, parties, and small scene brands.",
    interests: ["poster design", "screenprinting", "merch systems", "brand storytelling"],
    accentColor: "#22c55e",
    themeName: "nocturne",
    links: [{ label: "Store", url: "https://velvetmarkup.example.com/store" }],
    featuredContent: "Merch drops, flyers, and visual identity systems.",
  });

  const djProfile = await ensureArtistProfile(dj.id, {
    category: "Musician / Band / DJ",
    location: "Los Angeles, CA",
    tagline: "Industrial techno for warehouse rooms, afterhours edges, and art-forward lineups.",
    tags: ["techno", "industrial", "warehouse", "dj"],
    bio: "Dark, driving late-night sets for warehouse rooms and art-forward parties.",
    influences: "EBM, industrial techno, coldwave textures, brutalist spaces, and smoke-heavy warehouse systems.",
    availabilityStatus: "Taking June through September bookings",
    pronouns: "she/they",
    yearsActive: "8 years",
    representedBy: "Night Office Bookings",
    openForCommissions: false,
    touring: true,
    acceptsCollaborations: true,
    customFields: [
      { label: "Set formats", value: "Club set, warehouse set, sunrise closer" },
      { label: "Preferred cities", value: "Los Angeles, San Diego, Oakland" },
    ],
    bookingEmail: "bookings@djcipher.local",
  });

  const photoProfile = await ensureArtistProfile(photographer.id, {
    category: "Photographer",
    location: "Los Angeles, CA",
    tagline: "Nightlife portraits, fast-turn event selects, and moody editorial coverage.",
    tags: ["photographer", "nightlife", "editorial", "portraits"],
    bio: "Available for clubs, lookbooks, events, and artist campaign shoots.",
    influences: "Club documentary work, fashion editorials, 35mm flash portraits, and backstage candids.",
    availabilityStatus: "Available for shoots and event coverage",
    pronouns: "she/her",
    yearsActive: "6 years",
    representedBy: "Independent",
    openForCommissions: true,
    touring: false,
    acceptsCollaborations: true,
    customFields: [
      { label: "Shoot types", value: "Portraits, lookbooks, live events, BTS" },
      { label: "Turnaround", value: "24h selects, 72h full galleries" },
    ],
    bookingEmail: "hello@lunaframes.local",
  });

  const designProfile = await ensureArtistProfile(designer.id, {
    category: "Designer",
    location: "San Francisco, CA",
    tagline: "Flyers, merch systems, and visual identities for independent scenes.",
    tags: ["designer", "flyers", "merch", "branding"],
    bio: "Visual systems for parties, artist brands, and capsule merch collections.",
    influences: "Club ephemera, screenprint textures, rave flyers, and minimal product systems.",
    availabilityStatus: "Open for freelance commissions",
    pronouns: "they/them",
    yearsActive: "10 years",
    representedBy: "Velvet Markup Studio",
    openForCommissions: true,
    touring: false,
    acceptsCollaborations: true,
    customFields: [
      { label: "Deliverables", value: "Flyers, merch, social kits, visual systems" },
      { label: "Project size", value: "One-off drops to full campaign systems" },
    ],
    bookingEmail: "studio@velvetmarkup.local",
  });

  await ensureCreatorSettings(dj.id, {
    primaryActionType: "book",
    primaryActionLabel: "Book Me",
    primaryActionUrl: null,
    featuredTitle: "Friday Residency",
    featuredDescription: "Weekly industrial and dark techno night in downtown LA.",
    featuredUrl: "https://socialhub.local/events/1",
    featuredType: "event",
    moodPreset: "neon",
    layoutTemplate: "music",
    fontPreset: "editorial",
    enabledModules: ["featured", "about", "media", "events", "posts", "contact"],
    moduleOrder: ["featured", "events", "media", "about", "posts", "contact"],
    pinnedPostId: null,
  });

  await ensureCreatorSettings(photographer.id, {
    primaryActionType: "hire",
    primaryActionLabel: "Hire Me",
    primaryActionUrl: null,
    featuredTitle: "Tour Photo Packs",
    featuredDescription: "Fast delivery event coverage and promo selects.",
    featuredUrl: "https://socialhub.local/portfolio/luna",
    featuredType: "gallery",
    moodPreset: "dreamy",
    layoutTemplate: "editorial",
    fontPreset: "editorial",
    enabledModules: ["featured", "about", "media", "posts", "contact", "events"],
    moduleOrder: ["featured", "media", "about", "posts", "contact", "events"],
    pinnedPostId: null,
  });

  await ensureCreatorSettings(designer.id, {
    primaryActionType: "shop",
    primaryActionLabel: "Shop My Work",
    primaryActionUrl: "https://velvetmarkup.example.com/store",
    featuredTitle: "Merch Capsule",
    featuredDescription: "Limited-run posters, patches, and tees.",
    featuredUrl: "https://velvetmarkup.example.com/store",
    featuredType: "product",
    moodPreset: "luxe",
    layoutTemplate: "shop",
    fontPreset: "modern",
    enabledModules: ["featured", "media", "about", "posts", "contact", "events"],
    moduleOrder: ["featured", "media", "about", "contact", "posts", "events"],
    pinnedPostId: null,
  });

  for (const item of [
    { artistId: djProfile.id, type: "video", url: "https://www.youtube.com/embed/dQw4w9WgXcQ", caption: "Warehouse live set" },
    { artistId: djProfile.id, type: "audio", url: "https://soundcloud.com/djcipher/live-mix-2026", caption: "March mix" },
    { artistId: djProfile.id, type: "image", url: "https://images.unsplash.com/photo-1571266028243-d220c6191fce?w=900", caption: "Residency night crowd" },
    { artistId: photoProfile.id, type: "image", url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900", caption: "Backstage portrait session" },
    { artistId: photoProfile.id, type: "image", url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900", caption: "Event coverage in Hollywood" },
    { artistId: designProfile.id, type: "image", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900", caption: "Poster grid and merch mockups" },
  ]) {
    const [existing] = await db.select().from(galleryItemsTable).where(and(eq(galleryItemsTable.artistId, item.artistId), eq(galleryItemsTable.url, item.url))).limit(1);
    if (!existing) {
      await db.insert(galleryItemsTable).values(item as any);
    }
  }

  for (const photo of [
    { userId: promoter.id, imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900", caption: "Venue walk-through before doors" },
    { userId: promoter.id, imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900", caption: "Flyer wall from the last event" },
    { userId: fan.id, imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900", caption: "Saved from a local photo night" },
    { userId: dj.id, imageUrl: "https://images.unsplash.com/photo-1571266028243-d220c6191fce?w=900", caption: "Afterhours crowd shot" },
  ]) {
    const [existing] = await db.select().from(userPhotoItemsTable)
      .where(and(eq(userPhotoItemsTable.userId, photo.userId), eq(userPhotoItemsTable.imageUrl, photo.imageUrl)))
      .limit(1);
    if (!existing) {
      await db.insert(userPhotoItemsTable).values(photo);
    }
  }

  const post1 = await ensurePost(dj.id, "Friday residency was packed wall-to-wall. Next week I'm opening with a harder industrial run and posting set times tomorrow.", "https://images.unsplash.com/photo-1571266028243-d220c6191fce?w=1200", [
    { type: "image", url: "https://images.unsplash.com/photo-1571266028243-d220c6191fce?w=1200", title: "Residency crowd" },
    { type: "audio", url: "https://soundcloud.com/djcipher/live-mix-2026", title: "Afterhours excerpt" },
  ]);
  const post2 = await ensurePost(photographer.id, "New nightlife gallery is up. Looking for two more editorial collaborators for a low-light portrait concept in LA.", null, [
    { type: "image", url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200", title: "Gallery preview" },
  ]);
  const post3 = await ensurePost(designer.id, "Dropping a new merch capsule for independent event crews. Posters, tees, and promo assets bundled together.", null, [
    { type: "image", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200", title: "Merch capsule preview" },
  ]);
  const post4 = await ensurePost(promoter.id, "Building a June lineup for a darkwave x techno night in LA. Looking for DJs, visual artists, and one event photographer.", null);
  const post5 = await ensurePost(fan.id, "Saved a custom feed just for LA techno and another for local photographers. This is exactly how discovery should work.", null);

  for (const reaction of [
    { postId: post1.id, userId: promoter.id, reactionType: "heart" },
    { postId: post1.id, userId: fan.id, reactionType: "wow" },
    { postId: post2.id, userId: promoter.id, reactionType: "like" },
    { postId: post4.id, userId: dj.id, reactionType: "angry" },
  ]) {
    await db.insert(postReactionsTable).values(reaction).onConflictDoUpdate({
      target: [postReactionsTable.postId, postReactionsTable.userId],
      set: { reactionType: reaction.reactionType, updatedAt: new Date() },
    });
  }

  for (const comment of [
    { postId: post1.id, userId: promoter.id, content: "Need you on the June lineup too. This energy is exactly right." },
    { postId: post1.id, userId: fan.id, content: "This set looked unreal. Posting clips anywhere?" },
    { postId: post4.id, userId: photographer.id, content: "I can cover this if you still need a shooter." },
  ]) {
    const [existing] = await db.select().from(postCommentsTable).where(and(
      eq(postCommentsTable.postId, comment.postId),
      eq(postCommentsTable.userId, comment.userId),
      eq(postCommentsTable.content, comment.content),
    )).limit(1);
    if (!existing) {
      await db.insert(postCommentsTable).values(comment);
    }
  }

  for (const [followerId, followingId] of [
    [promoter.id, dj.id],
    [promoter.id, photographer.id],
    [promoter.id, designer.id],
    [fan.id, dj.id],
    [fan.id, photographer.id],
    [dj.id, designer.id],
  ]) {
    await db.insert(followsTable).values({ followerId, followingId }).onConflictDoNothing();
  }

  for (const friendship of [
    { requesterUserId: promoter.id, addresseeUserId: fan.id, status: "accepted" },
    { requesterUserId: fan.id, addresseeUserId: photographer.id, status: "pending" },
    { requesterUserId: dj.id, addresseeUserId: promoter.id, status: "accepted" },
  ]) {
    await db.insert(friendshipsTable).values(friendship).onConflictDoUpdate({
      target: [friendshipsTable.requesterUserId, friendshipsTable.addresseeUserId],
      set: { status: friendship.status, updatedAt: new Date() },
    });
  }

  for (const reaction of [
    { targetUserId: dj.id, reactorUserId: promoter.id, reactionType: "heart" },
    { targetUserId: photographer.id, reactorUserId: fan.id, reactionType: "wow" },
    { targetUserId: promoter.id, reactorUserId: dj.id, reactionType: "like" },
  ]) {
    await db.insert(profileReactionsTable).values(reaction).onConflictDoUpdate({
      target: [profileReactionsTable.targetUserId, profileReactionsTable.reactorUserId],
      set: { reactionType: reaction.reactionType, updatedAt: new Date() },
    });
  }

  const [laTechnoFeed] = await db.select().from(customFeedsTable).where(and(eq(customFeedsTable.ownerId, fan.id), eq(customFeedsTable.name, "LA Techno"))).limit(1);
  if (!laTechnoFeed) {
    await db.insert(customFeedsTable).values({
      ownerId: fan.id,
      name: "LA Techno",
      description: "Warehouse DJs, local events, and dark electronic artists in Los Angeles.",
      includedUserIds: [dj.id, promoter.id],
      categories: ["Musician / Band / DJ"],
      tags: ["techno", "warehouse"],
      locations: ["Los Angeles"],
    });
  }

  const [photoFeed] = await db.select().from(customFeedsTable).where(and(eq(customFeedsTable.ownerId, fan.id), eq(customFeedsTable.name, "Local Photographers"))).limit(1);
  if (!photoFeed) {
    await db.insert(customFeedsTable).values({
      ownerId: fan.id,
      name: "Local Photographers",
      description: "Creators covering nightlife and fashion shoots around LA.",
      includedUserIds: [photographer.id],
      categories: ["Photographer"],
      tags: ["photographer", "nightlife"],
      locations: ["Los Angeles"],
    });
  }

  const [groupA] = await db.select().from(groupsTable).where(eq(groupsTable.slug, "la-techno-builders")).limit(1);
  const group1 = groupA || (await db.insert(groupsTable).values({
    ownerId: promoter.id,
    name: "LA Techno Builders",
    slug: "la-techno-builders",
    description: "Promoters, selectors, visual artists, and venue people building darker nights in Los Angeles.",
    coverImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1400",
    visibility: "public",
    category: "Music",
    location: "Los Angeles, CA",
    tags: ["techno", "promoters", "la"],
  }).returning())[0];

  const [groupB] = await db.select().from(groupsTable).where(eq(groupsTable.slug, "editorial-shoot-circle")).limit(1);
  const group2 = groupB || (await db.insert(groupsTable).values({
    ownerId: photographer.id,
    name: "Editorial Shoot Circle",
    slug: "editorial-shoot-circle",
    description: "Photographers, models, MUAs, and designers organizing small creative shoots with real follow-through.",
    coverImageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1400",
    visibility: "public",
    category: "Visual Arts",
    location: "Los Angeles, CA",
    tags: ["photography", "fashion", "editorial"],
  }).returning())[0];

  for (const member of [
    { groupId: group1.id, userId: promoter.id, role: "owner" },
    { groupId: group1.id, userId: dj.id, role: "member" },
    { groupId: group1.id, userId: fan.id, role: "member" },
    { groupId: group2.id, userId: photographer.id, role: "owner" },
    { groupId: group2.id, userId: designer.id, role: "member" },
    { groupId: group2.id, userId: promoter.id, role: "member" },
  ]) {
    await db.insert(groupMembersTable).values(member).onConflictDoNothing();
  }

  for (const mapping of [
    { groupId: group1.id, postId: post1.id },
    { groupId: group1.id, postId: post4.id },
    { groupId: group2.id, postId: post2.id },
    { groupId: group2.id, postId: post3.id },
  ]) {
    await db.insert(groupPostsTable).values(mapping).onConflictDoNothing();
  }

  const [eventA] = await db.select().from(eventsTable).where(eq(eventsTable.title, "Midnight Machinery")).limit(1);
  const event1 = eventA || (await db.insert(eventsTable).values({
    hostUserId: promoter.id,
    title: "Midnight Machinery",
    description: "A warehouse-focused LA night with industrial techno, live visual work, and one featured photo wall.",
    startsAt: new Date("2026-06-12T22:00:00"),
    location: "South LA Warehouse District",
    city: "Los Angeles",
    imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1400",
    lineupTags: ["techno", "industrial", "warehouse"],
    visibility: "public",
  }).returning())[0];

  const [eventB] = await db.select().from(eventsTable).where(eq(eventsTable.title, "After Dark Editorial Session")).limit(1);
  const event2 = eventB || (await db.insert(eventsTable).values({
    hostUserId: photographer.id,
    title: "After Dark Editorial Session",
    description: "Small creative team shoot with nightlife styling, reflective materials, and moody portrait lighting.",
    startsAt: new Date("2026-05-18T19:30:00"),
    location: "DTLA Studio Loft",
    city: "Los Angeles",
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1400",
    lineupTags: ["photography", "fashion", "editorial"],
    visibility: "public",
  }).returning())[0];

  for (const artist of [
    { eventId: event1.id, userId: dj.id, isHeadliner: true },
    { eventId: event1.id, userId: photographer.id, isHeadliner: false },
    { eventId: event2.id, userId: photographer.id, isHeadliner: true },
    { eventId: event2.id, userId: designer.id, isHeadliner: false },
  ]) {
    await db.insert(eventArtistsTable).values(artist).onConflictDoNothing();
  }

  const conversation = await ensureConversation(promoter.id, dj.id);
  const [existingMessage] = await db.select().from(messagesTable).where(and(eq(messagesTable.conversationId, conversation.id), eq(messagesTable.content, "Hey, I want to lock you in for Midnight Machinery. Sending the formal inquiry through your profile too."))).limit(1);
  if (!existingMessage) {
    await db.insert(messagesTable).values([
      {
        conversationId: conversation.id,
        senderId: promoter.id,
        content: "Hey, I want to lock you in for Midnight Machinery. Sending the formal inquiry through your profile too.",
        isBookingInquiry: false,
      },
      {
        conversationId: conversation.id,
        senderId: dj.id,
        content: "Perfect. Send date, budget, and set window and I'll confirm.",
        isBookingInquiry: false,
      },
    ]);
  }

  const [latestDjPost] = await db.select().from(postsTable).where(eq(postsTable.userId, dj.id)).limit(1);
  if (latestDjPost) {
    await ensureCreatorSettings(dj.id, {
      primaryActionType: "book",
      primaryActionLabel: "Book Me",
      primaryActionUrl: null,
      featuredTitle: "Friday Residency",
      featuredDescription: "Weekly industrial and dark techno night in downtown LA.",
      featuredUrl: "https://socialhub.local/events/midnight-machinery",
      featuredType: "event",
      moodPreset: "neon",
      layoutTemplate: "music",
      fontPreset: "editorial",
      enabledModules: ["featured", "about", "media", "events", "posts", "contact"],
      moduleOrder: ["featured", "events", "media", "about", "posts", "contact"],
      pinnedPostId: latestDjPost.id,
    });
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@socialhub.local / admin123");
  console.log("Sample user login: promoter@socialhub.local / password123");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
