import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  audience: text("audience").notNull().default("all"),
  sentBy: text("sent_by").notNull().default("Admin"),
  sentByUserId: integer("sent_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Announcement = typeof announcementsTable.$inferSelect;
