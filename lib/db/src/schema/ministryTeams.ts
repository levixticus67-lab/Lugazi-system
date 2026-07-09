import { pgTable, serial, text, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";
  import { createInsertSchema } from "drizzle-zod";
  import { z } from "zod/v4";

  export const ministryTeamsTable = pgTable("ministry_teams", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    leaderId: integer("leader_id"),
    leaderName: text("leader_name"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  });

  export const ministryTeamMembersTable = pgTable("ministry_team_members", {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull(),
    userId: integer("user_id").notNull(),
    memberName: text("member_name").notNull(),
    role: text("role").default("Member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  }, (table) => [
    index("ministry_team_members_team_id_idx").on(table.teamId),
    index("ministry_team_members_user_id_idx").on(table.userId),
  ]);

  export const insertMinistryTeamSchema = createInsertSchema(ministryTeamsTable).omit({ id: true, createdAt: true });
  export type InsertMinistryTeam = z.infer<typeof insertMinistryTeamSchema>;
  export type MinistryTeam = typeof ministryTeamsTable.$inferSelect;
  