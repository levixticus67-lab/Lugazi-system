import { eq } from "drizzle-orm";
import { db, activityLogsTable, usersTable } from "@workspace/db";
import { logger } from "./logger";

interface LogActivityParams {
  userId?: number;
  displayName?: string;
  action: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  details?: string;
  ipAddress?: string;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    let displayName = params.displayName;
    if (!displayName && params.userId) {
      const [user] = await db
        .select({ displayName: usersTable.displayName })
        .from(usersTable)
        .where(eq(usersTable.id, params.userId))
        .limit(1);
      displayName = user?.displayName ?? `User #${params.userId}`;
    }
    displayName = displayName ?? "Unknown";

    await db.insert(activityLogsTable).values({
      userId: params.userId,
      displayName,
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      entityName: params.entityName ?? null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write activity log — non-fatal");
  }
}
