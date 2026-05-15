import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inductionTracksTable = pgTable("induction_tracks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  level: integer("level").notNull().default(1),
  totalSessions: integer("total_sessions").notNull().default(4),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inductionEnrollmentsTable = pgTable("induction_enrollments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  memberName: text("member_name").notNull(),
  trackId: integer("track_id").notNull(),
  trackName: text("track_name").notNull(),
  progress: integer("progress").notNull().default(0),
  status: text("status").notNull().default("enrolled"),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertInductionTrackSchema = createInsertSchema(inductionTracksTable).omit({ id: true, createdAt: true });
export type InsertInductionTrack = z.infer<typeof insertInductionTrackSchema>;
export type InductionTrack = typeof inductionTracksTable.$inferSelect;

export const insertInductionEnrollmentSchema = createInsertSchema(inductionEnrollmentsTable).omit({ id: true, enrolledAt: true });
export type InsertInductionEnrollment = z.infer<typeof insertInductionEnrollmentSchema>;
export type InductionEnrollment = typeof inductionEnrollmentsTable.$inferSelect;
