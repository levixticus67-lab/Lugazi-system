import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  audience: text("audience").notNull().default("all"),
  sentBy: text("sent_by").notNull().default("Admin"),
  sentByUserId: integer("sent_by_user_id"),
  // Hero banner fields
  type: text("type").notNull().default("broadcast"),   // 'broadcast' | 'hero'
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),                        // 'image' | 'video'
  bgGradient: text("bg_gradient").default("violet"),   // rose|blue|amber|green|violet|cyan
  linkUrl: text("link_url"),
  linkLabel: text("link_label"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Announcement = typeof announcementsTable.$inferSelect;
