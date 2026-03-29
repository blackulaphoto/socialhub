import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";
import { messagesTable } from "./messages";
import { conversationsTable } from "./messages";

export const userProfileDetailsTable = pgTable("user_profile_details", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  bannerUrl: text("banner_url"),
  location: text("location"),
  city: text("city"),
  age: integer("age"),
  work: text("work"),
  school: text("school"),
  about: text("about"),
  interests: text("interests").array().notNull().default([]),
  accentColor: text("accent_color"),
  themeName: text("theme_name"),
  links: jsonb("links").$type<Array<{ label: string; url: string }>>().notNull().default([]),
  featuredContent: text("featured_content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const creatorProfileSettingsTable = pgTable("creator_profile_settings", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  primaryActionType: text("primary_action_type").notNull().default("contact"),
  primaryActionLabel: text("primary_action_label").notNull().default("Contact Me"),
  primaryActionUrl: text("primary_action_url"),
  featuredTitle: text("featured_title"),
  featuredDescription: text("featured_description"),
  featuredUrl: text("featured_url"),
  featuredType: text("featured_type").notNull().default("highlight"),
  moodPreset: text("mood_preset").notNull().default("sleek"),
  layoutTemplate: text("layout_template").notNull().default("portfolio"),
  fontPreset: text("font_preset").notNull().default("modern"),
  enabledModules: text("enabled_modules").array().notNull().default(["featured", "about", "media", "posts", "events", "contact"]),
  moduleOrder: text("module_order").array().notNull().default(["featured", "about", "media", "posts", "events", "contact"]),
  pinnedPostId: integer("pinned_post_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const postMediaTable = pgTable("post_media", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userPhotoItemsTable = pgTable("user_photo_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customFeedsTable = pgTable("custom_feeds", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  includedUserIds: integer("included_user_ids").array().notNull().default([]),
  categories: text("categories").array().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  locations: text("locations").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupsTable = pgTable("groups", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  coverImageUrl: text("cover_image_url"),
  visibility: text("visibility").notNull().default("public"),
  category: text("category"),
  location: text("location"),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [unique().on(table.groupId, table.userId)]);

export const groupPostsTable = pgTable("group_posts", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [unique().on(table.groupId, table.postId)]);

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  hostUserId: integer("host_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  location: text("location").notNull(),
  city: text("city"),
  imageUrl: text("image_url"),
  lineupTags: text("lineup_tags").array().notNull().default([]),
  visibility: text("visibility").notNull().default("public"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const eventArtistsTable = pgTable("event_artists", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  isHeadliner: boolean("is_headliner").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [unique().on(table.eventId, table.userId)]);

export const messageInquiriesTable = pgTable("message_inquiries", {
  messageId: integer("message_id").primaryKey().references(() => messagesTable.id, { onDelete: "cascade" }),
  inquiryType: text("inquiry_type").notNull().default("contact"),
  budget: text("budget"),
  eventDate: text("event_date"),
  eventType: text("event_type"),
  projectDetails: text("project_details"),
  externalUrl: text("external_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  actorUserId: integer("actor_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  conversationId: integer("conversation_id").references(() => conversationsTable.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const profileReactionsTable = pgTable("profile_reactions", {
  id: serial("id").primaryKey(),
  targetUserId: integer("target_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reactorUserId: integer("reactor_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reactionType: text("reaction_type").notNull().default("like"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [unique().on(table.targetUserId, table.reactorUserId)]);

export const friendshipsTable = pgTable("friendships", {
  id: serial("id").primaryKey(),
  requesterUserId: integer("requester_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  addresseeUserId: integer("addressee_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [unique().on(table.requesterUserId, table.addresseeUserId)]);

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterUserId: integer("reporter_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("open"),
  adminNote: text("admin_note"),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pageViewsTable = pgTable("page_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  path: text("path").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
