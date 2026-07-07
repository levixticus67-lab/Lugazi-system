import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const inAppNotificationsTable = pgTable("in_app_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),       // recipient user ID
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  relatedEntityType: text("related_entity_type"), // e.g. "family_member"
  relatedEntityId: integer("related_entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InAppNotification = typeof inAppNotificationsTable.$inferSelect;
