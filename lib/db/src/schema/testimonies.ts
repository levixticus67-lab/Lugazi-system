import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const testimoniesTable = pgTable("testimonies", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id"),
  memberName: text("member_name").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("other"),
  isApproved: boolean("is_approved").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTestimonySchema = createInsertSchema(testimoniesTable).omit({ id: true, createdAt: true });
export type InsertTestimony = z.infer<typeof insertTestimonySchema>;
export type Testimony = typeof testimoniesTable.$inferSelect;
