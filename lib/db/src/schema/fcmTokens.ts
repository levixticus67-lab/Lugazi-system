import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const fcmTokensTable = pgTable("fcm_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull().default("android"), // android | ios
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("fcm_tokens_user_id_idx").on(table.userId),
]);

export type FcmToken = typeof fcmTokensTable.$inferSelect;
