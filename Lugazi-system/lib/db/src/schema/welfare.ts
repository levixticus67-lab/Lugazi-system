import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const welfareTable = pgTable("welfare", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  memberName: text("member_name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amountRequested: numeric("amount_requested", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  reviewedBy: integer("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWelfareSchema = createInsertSchema(welfareTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWelfare = z.infer<typeof insertWelfareSchema>;
export type Welfare = typeof welfareTable.$inferSelect;
