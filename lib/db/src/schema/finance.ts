import { pgTable, serial, text, numeric, integer, timestamp, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("UGX"),
  memberId: integer("member_id"),
  memberName: text("member_name"),
  description: text("description").notNull(),
  category: text("category").notNull(),
  branchId: integer("branch_id"),
  recordedBy: integer("recorded_by"),
  // H4: changed from text to date — enables proper date ordering and index use
  date: date("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("transactions_member_id_idx").on(table.memberId),
  index("transactions_date_idx").on(table.date),
  index("transactions_type_idx").on(table.type),
  index("transactions_branch_id_idx").on(table.branchId),
  index("transactions_category_idx").on(table.category),
]);

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
