import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  portalScope: text("portal_scope").notNull().default("general"),
  userId: integer("user_id").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("member"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
