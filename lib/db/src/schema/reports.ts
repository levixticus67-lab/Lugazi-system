import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  submittedBy: integer("submitted_by").notNull(),
  submittedByName: text("submitted_by_name"),
  branchId: integer("branch_id"),
  cellGroupId: integer("cell_group_id"),
  cellAttendanceSessionId: integer("cell_attendance_session_id"),
  content: text("content"),
  attendance: integer("attendance"),
  soulWinning: integer("soul_winning"),
  period: text("period").notNull(),
  status: text("status").notNull().default("draft"),
  fileUrl: text("file_url"),
  fileType: text("file_type"),
  fileSize: text("file_size"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("reports_cell_group_id_idx").on(table.cellGroupId),
  index("reports_cell_attendance_session_id_idx").on(table.cellAttendanceSessionId),
]);

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
