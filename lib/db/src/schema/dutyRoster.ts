import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
  import { createInsertSchema } from "drizzle-zod";
  import { z } from "zod/v4";

  export const dutyRosterTable = pgTable("duty_roster", {
    id: serial("id").primaryKey(),
    assignedToUserId: integer("assigned_to_user_id"),
    assignedToName: text("assigned_to_name").notNull(),
    serviceDate: text("service_date").notNull(),
    serviceType: text("service_type").notNull(),
    dutyRole: text("duty_role").notNull(),
    location: text("location"),
    notes: text("notes"),
    createdByUserId: integer("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  });

  export const insertDutyRosterSchema = createInsertSchema(dutyRosterTable).omit({ id: true, createdAt: true });
  export type InsertDutyRoster = z.infer<typeof insertDutyRosterSchema>;
  export type DutyRoster = typeof dutyRosterTable.$inferSelect;
  