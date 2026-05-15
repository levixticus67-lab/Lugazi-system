import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const prayerRequestsTable = pgTable("prayer_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  displayName: text("display_name").notNull(),
  subject: text("subject").notNull(),
  request: text("request").notNull(),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PrayerRequest = typeof prayerRequestsTable.$inferSelect;
