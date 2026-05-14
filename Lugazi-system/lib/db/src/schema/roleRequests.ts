import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleRequestsTable = pgTable("role_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  requestedRole: text("requested_role").notNull(),
  currentRole: text("current_role").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoleRequestSchema = createInsertSchema(roleRequestsTable).omit({ id: true, createdAt: true });
export type InsertRoleRequest = z.infer<typeof insertRoleRequestSchema>;
export type RoleRequest = typeof roleRequestsTable.$inferSelect;
