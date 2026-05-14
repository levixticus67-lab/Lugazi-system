import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
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
});

export const insertPipelineSchema = createInsertSchema(pipelineTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;
export type Pipeline = typeof pipelineTable.$inferSelect;
