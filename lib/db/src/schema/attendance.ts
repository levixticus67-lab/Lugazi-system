import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  memberName: text("member_name").notNull(),
  eventId: integer("event_id"),
  eventName: text("event_name").notNull(),
  branchId: integer("branch_id"),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
  checkedInBy: integer("checked_in_by"),
  method: text("method").notNull().default("manual"),
}, (table) => [
  index("attendance_member_id_idx").on(table.memberId),
  index("attendance_event_id_idx").on(table.eventId),
  index("attendance_branch_id_idx").on(table.branchId),
  index("attendance_checked_in_at_idx").on(table.checkedInAt),
]);

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, checkedInAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
