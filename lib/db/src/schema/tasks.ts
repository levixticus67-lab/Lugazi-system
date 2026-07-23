import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assignedToUserId: integer("assigned_to_user_id"),
  assignedToName: text("assigned_to_name"),
  assignedByUserId: integer("assigned_by_user_id"),
  assignedByName: text("assigned_by_name"),
  dueDate: text("due_date"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  category: text("category"),
  notes: text("notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("tasks_assigned_to_user_id_idx").on(table.assignedToUserId),
  index("tasks_status_idx").on(table.status),
  index("tasks_due_date_idx").on(table.dueDate),
  index("tasks_priority_idx").on(table.priority),
]);

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
