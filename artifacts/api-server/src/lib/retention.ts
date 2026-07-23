import { and, eq, isNotNull, lt } from "drizzle-orm";
import { db, chatMessagesTable, privateMessagesTable } from "@workspace/db";
import { logger } from "./logger";
import { purgeExpiredRateLimits } from "./rateLimiter";

/**
 * L3: Message retention cleanup.
 *
 * Runs once 5 minutes after startup, then every 24 hours.
 *
 * Deletes:
 *   - Soft-deleted global chat messages older than 30 days
 *   - Private-mode DMs whose autoDeleteAt timestamp has passed
 *   - Expired rate-limit rows (prevents table bloat)
 */
async function runRetentionCleanup(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await db
      .delete(chatMessagesTable)
      .where(
        and(
          eq(chatMessagesTable.isDeleted, true),
          lt(chatMessagesTable.createdAt, thirtyDaysAgo),
        ),
      );

    await db
      .delete(privateMessagesTable)
      .where(
        and(
          isNotNull(privateMessagesTable.autoDeleteAt),
          lt(privateMessagesTable.autoDeleteAt, new Date()),
        ),
      );

    await purgeExpiredRateLimits();

    logger.info("Retention cleanup complete");
  } catch (err) {
    logger.error({ err }, "Retention cleanup failed");
  }
}

export function startRetentionWorker(): void {
  // Offset by 5 minutes so startup DB activity settles first
  const initial = setTimeout(() => {
    runRetentionCleanup();
    setInterval(runRetentionCleanup, 24 * 60 * 60 * 1000).unref();
  }, 5 * 60 * 1000);
  initial.unref();
}
