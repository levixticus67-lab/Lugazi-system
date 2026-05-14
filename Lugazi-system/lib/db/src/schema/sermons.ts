import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const sermonsTable = pgTable("sermons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  preacher: text("preacher").notNull(),
  sermonDate: text("sermon_date").notNull(),
  series: text("series"),
  description: text("description"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type").default("audio"),
  thumbnailUrl: text("thumbnail_url"),
  scriptureRef: text("scripture_ref"),
  branchId: integer("branch_id"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Sermon = typeof sermonsTable.$inferSelect;
