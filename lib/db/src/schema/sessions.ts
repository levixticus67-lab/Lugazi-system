import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";

// ── Active sessions whitelist ─────────────────────────────────────────────────
// Only tokens whose hash appears here are accepted by requireAuth.
// On logout (or token refresh) the row is deleted — the server forgets the
// token completely, so a recycled copy is rejected immediately.
// Expired rows are cleaned up lazily on each login (non-blocking).
export const sessionsTable = pgTable("sessions", {
  id:         serial("id").primaryKey(),
  userId:     integer("user_id").notNull(),
  tokenHash:  text("token_hash").notNull().unique(),
  expiresAt:  timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
  index("sessions_token_hash_idx").on(table.tokenHash),
  index("sessions_expires_at_idx").on(table.expiresAt),
]);

export type Session = typeof sessionsTable.$inferSelect;
