import { pgTable, serial, text, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";

export const inAppNotificationsTable = pgTable("in_app_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),       // recipient user ID
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),        // set when marked read; notification persists 2 days after this
  relatedEntityType: text("related_entity_type"),              // e.g. "task", "event", "meeting"
  relatedEntityId: integer("related_entity_id"),
  eventDate: timestamp("event_date", { withTimezone: true }),  // for events/meetings: the scheduled date; notification deleted 2 days after this
  fcmSentAt: timestamp("fcm_sent_at", { withTimezone: true }), // null = not yet sent via FCM push
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("in_app_notifications_user_id_idx").on(table.userId),
  index("in_app_notifications_created_at_idx").on(table.createdAt),
]);

export type InAppNotification = typeof inAppNotificationsTable.$inferSelect;
