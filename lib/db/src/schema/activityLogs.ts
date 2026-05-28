import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  displayName: text("display_name").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  entityName: text("entity_name"),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityLog = typeof activityLogsTable.$inferSelect;
