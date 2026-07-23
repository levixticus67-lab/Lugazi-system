import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pipelineTable = pgTable("pipeline", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  stage: text("stage").notNull().default("new_contact"),
  assignedTo: integer("assigned_to").notNull(),
  assignedToName: text("assigned_to_name"),
  notes: text("notes"),
  source: text("source").notNull(),
  branchId: integer("branch_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("pipeline_stage_idx").on(table.stage),
  index("pipeline_branch_id_idx").on(table.branchId),
  index("pipeline_assigned_to_idx").on(table.assignedTo),
  index("pipeline_created_at_idx").on(table.createdAt),
]);

export const insertPipelineSchema = createInsertSchema(pipelineTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;
export type Pipeline = typeof pipelineTable.$inferSelect;
