import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// DB-backed rate limit store — survives server restarts and works across
// multiple Render instances. Replaces the in-memory Maps in auth.ts / chat.ts.
export const rateLimitsTable = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
