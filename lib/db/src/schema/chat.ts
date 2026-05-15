import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  portalScope: text("portal_scope").notNull().default("global"),
  userId: integer("user_id").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("member"),
  photoUrl: text("photo_url"),
  message: text("message").notNull(),
  replyToId: integer("reply_to_id"),
  replyToText: text("reply_to_text"),
  replyToName: text("reply_to_name"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChatMessage = typeof chatMessagesTable.$inferSelect;

export const chatReactionsTable = pgTable("chat_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  userId: integer("user_id").notNull(),
  displayName: text("display_name").notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChatReaction = typeof chatReactionsTable.$inferSelect;

export const privateMessagesTable = pgTable("private_messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  fromName: text("from_name").notNull(),
  toName: text("to_name").notNull(),
  fromPhotoUrl: text("from_photo_url"),
  message: text("message").notNull(),
  replyToId: integer("reply_to_id"),
  replyToText: text("reply_to_text"),
  isRead: boolean("is_read").notNull().default(false),
  isPrivateMode: boolean("is_private_mode").notNull().default(false),
  autoDeleteAt: timestamp("auto_delete_at", { withTimezone: true }),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PrivateMessage = typeof privateMessagesTable.$inferSelect;

export const userStatusTable = pgTable("user_status", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  photoUrl: text("photo_url"),
  status: text("status").notNull().default("offline"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserStatus = typeof userStatusTable.$inferSelect;
