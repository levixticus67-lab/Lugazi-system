import { pgTable, serial, text, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contributionsTable = pgTable("contributions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id"),
  memberName: text("member_name").notNull(),
  email: text("email"),
  type: text("type").notNull().default("offering"),
  // H5: changed from integer to numeric(12,2) — supports fractional amounts
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("UGX"),
  reference: text("reference"),
  notes: text("notes"),
  recordedBy: integer("recorded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("contributions_member_id_idx").on(table.memberId),
  index("contributions_type_idx").on(table.type),
  index("contributions_created_at_idx").on(table.createdAt),
]);

export const insertContributionSchema = createInsertSchema(contributionsTable).omit({ id: true, createdAt: true });
export type InsertContribution = z.infer<typeof insertContributionSchema>;
export type Contribution = typeof contributionsTable.$inferSelect;
