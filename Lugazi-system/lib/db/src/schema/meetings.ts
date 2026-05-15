import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const meetingsTable = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  agenda: text("agenda"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  location: text("location").notNull().default("Church Hall"),
  portalTarget: text("portal_target").notNull().default("leadership"),
  createdBy: integer("created_by"),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  attendees: text("attendees"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMeetingSchema = createInsertSchema(meetingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetingsTable.$inferSelect;
