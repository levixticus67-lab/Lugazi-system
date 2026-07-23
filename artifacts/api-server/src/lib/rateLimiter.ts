import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * DB-backed rate limiter using Neon PostgreSQL.
 *
 * Atomic upsert: if the key is new or the window has expired, start a fresh
 * counter. Otherwise increment. A single round-trip, no race conditions.
 *
 * Falls back to allowing the request on DB errors so a database hiccup never
 * locks out all users.
 */
export async function checkDbRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<boolean> {
  const resetAt = new Date(Date.now() + windowMs);
  try {
    const result = await db.execute<{ count: number }>(sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.reset_at < NOW() THEN 1
          ELSE rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at < NOW() THEN ${resetAt}
          ELSE rate_limits.reset_at
        END
      RETURNING count
    `);
    const count = Number((result.rows[0] as { count: number } | undefined)?.count ?? 1);
    return count <= maxAttempts;
  } catch (err) {
    // If the rate_limits table doesn't exist yet (pre-migration) or the DB is
    // temporarily unavailable, fail open so users aren't blocked.
    logger.warn({ err, key }, "DB rate limit check failed — failing open");
    return true;
  }
}

/** Clear a rate limit bucket on successful auth so the IP isn't penalised. */
export async function clearDbRateLimit(key: string): Promise<void> {
  try {
    await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key}`);
  } catch (err) {
    logger.warn({ err, key }, "DB rate limit clear failed");
  }
}

/** Remove expired rows — call this periodically to prevent table bloat. */
export async function purgeExpiredRateLimits(): Promise<void> {
  try {
    await db.execute(sql`DELETE FROM rate_limits WHERE reset_at < NOW()`);
  } catch (err) {
    logger.warn({ err }, "Rate limit purge failed");
  }
}
