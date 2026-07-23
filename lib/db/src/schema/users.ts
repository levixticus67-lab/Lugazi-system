import { pgTable, serial, text, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { roleEnum } from "./roles";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: roleEnum("role").notNull().default("member"),
  photoUrl: text("photo_url"),
  phone: text("phone"),
  birthday: text("birthday"),
  branchId: integer("branch_id"),
  isActive: boolean("is_active").notNull().default(true),
  // Email verification — default true so existing users are not locked out
  emailVerified: boolean("email_verified").notNull().default(true),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationTokenExpiry: timestamp("email_verification_token_expiry", { withTimezone: true }),
  // Password reset — stored in DB so tokens survive server restarts
  passwordResetToken: text("password_reset_token"),
  passwordResetTokenExpiry: timestamp("password_reset_token_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("users_branch_id_idx").on(table.branchId),
  index("users_is_active_idx").on(table.isActive),
  index("users_role_idx").on(table.role),
  index("users_email_verification_token_idx").on(table.emailVerificationToken),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
