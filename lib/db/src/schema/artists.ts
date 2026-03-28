import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const galleryItemTypeEnum = pgEnum("gallery_item_type", ["image", "video", "audio"]);

export const artistProfilesTable = pgTable("artist_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  category: text("category").notNull(),
  location: text("location"),
  tags: text("tags").array().notNull().default([]),
  bio: text("bio"),
  bookingEmail: text("booking_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const galleryItemsTable = pgTable("gallery_items", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").notNull().references(() => artistProfilesTable.id, { onDelete: "cascade" }),
  type: galleryItemTypeEnum("type").notNull(),
  url: text("url").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertArtistProfileSchema = createInsertSchema(artistProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGalleryItemSchema = createInsertSchema(galleryItemsTable).omit({ id: true, createdAt: true });

export type InsertArtistProfile = z.infer<typeof insertArtistProfileSchema>;
export type InsertGalleryItem = z.infer<typeof insertGalleryItemSchema>;
export type ArtistProfile = typeof artistProfilesTable.$inferSelect;
export type GalleryItem = typeof galleryItemsTable.$inferSelect;
