import { pgTable, serial, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  audience: text("audience").notNull().default("all"),
  sentBy: text("sent_by").notNull().default("Admin"),
  sentByUserId: integer("sent_by_user_id"),
  type: text("type").notNull().default("broadcast"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  bgGradient: text("bg_gradient").default("violet"),
  linkUrl: text("link_url"),
  linkLabel: text("link_label"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("announcements_audience_idx").on(table.audience),
  index("announcements_type_idx").on(table.type),
  index("announcements_created_at_idx").on(table.createdAt),
  index("announcements_expires_at_idx").on(table.expiresAt),
]);

export type Announcement = typeof announcementsTable.$inferSelect;
