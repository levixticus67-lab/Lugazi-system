import { pgTable, serial, integer, text, date, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cellAttendanceSessionsTable = pgTable("cell_attendance_sessions", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  meetingDate: date("meeting_date").notNull(),
  meetingTime: text("meeting_time"),
  recordedBy: integer("recorded_by").notNull(),
  // These are additional attendees who were not identified individually.
  // Named attendees are stored in cellAttendanceRecordsTable.
  adultManualCount: integer("adult_manual_count").notNull().default(0),
  childManualCount: integer("child_manual_count").notNull().default(0),
  countMode: text("count_mode").notNull().default("summary"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("cell_attendance_sessions_group_date_unique").on(table.groupId, table.meetingDate),
  index("cell_attendance_sessions_group_id_idx").on(table.groupId),
  index("cell_attendance_sessions_meeting_date_idx").on(table.meetingDate),
]);

export const cellAttendanceRecordsTable = pgTable("cell_attendance_records", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  memberId: integer("member_id").notNull(),
  memberName: text("member_name").notNull(),
  ageGroup: text("age_group").notNull().default("adult"),
  method: text("method").notNull().default("manual"),
  checkedInBy: integer("checked_in_by").notNull(),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("cell_attendance_records_session_member_unique").on(table.sessionId, table.memberId),
  index("cell_attendance_records_session_id_idx").on(table.sessionId),
  index("cell_attendance_records_member_id_idx").on(table.memberId),
]);

export const insertCellAttendanceSessionSchema = createInsertSchema(cellAttendanceSessionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCellAttendanceRecordSchema = createInsertSchema(cellAttendanceRecordsTable).omit({
  id: true,
  checkedInAt: true,
});

export type InsertCellAttendanceSession = z.infer<typeof insertCellAttendanceSessionSchema>;
export type CellAttendanceSession = typeof cellAttendanceSessionsTable.$inferSelect;
export type InsertCellAttendanceRecord = z.infer<typeof insertCellAttendanceRecordSchema>;
export type CellAttendanceRecord = typeof cellAttendanceRecordsTable.$inferSelect;