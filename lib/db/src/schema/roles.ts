import { pgEnum } from "drizzle-orm/pg-core";

export const ROLES = ["admin", "pastor", "leadership", "workforce", "member"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Shared PostgreSQL enum for user roles.
 * Used in both usersTable and membersTable so the DB enforces valid role
 * values at the constraint level — invalid strings are rejected before they
 * reach application code.
 */
export const roleEnum = pgEnum("role", ROLES);
