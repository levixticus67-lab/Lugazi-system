import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contributionsTable = pgTable("contributions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id"),
  memberName: text("member_name").notNull(),
  email: text("email"),
  type: text("type").notNull().default("offering"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("UGX"),
  reference: text("reference"),
  notes: text("notes"),
  recordedBy: integer("recorded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContributionSchema = createInsertSchema(contributionsTable).omit({ id: true, createdAt: true });
export type InsertContribution = z.infer<typeof insertContributionSchema>;
export type Contribution = typeof contributionsTable.$inferSelect;
