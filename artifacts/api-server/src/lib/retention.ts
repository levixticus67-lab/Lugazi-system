import { and, eq, isNotNull, isNull, lt, notInArray, or } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";
import {
  db,
  usersTable,
  chatMessagesTable,
  chatReactionsTable,
  privateMessagesTable,
  inAppNotificationsTable,
  activityLogsTable,
  announcementsTable,
  mediaTable,
} from "@workspace/db";
import { logger } from "./logger";
import { purgeExpiredRateLimits } from "./rateLimiter";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Extract a Cloudinary public_id from a res.cloudinary.com URL.
 *  Handles versioned paths: /upload/v1234567890/folder/file.jpg → folder/file
 *  Returns null for non-Cloudinary URLs or null input. */
function cloudinaryPublicId(url: string | null | undefined): string | null {
  if (!url?.includes("res.cloudinary.com")) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
  return match?.[1] ?? null;
}

let cloudinaryReady = false;
function initCloudinary(): boolean {
  if (cloudinaryReady) return true;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return false;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  cloudinaryReady = true;
  return true;
}

async function destroyCloudinaryAsset(url: string | null | undefined, label: string): Promise<void> {
  const publicId = cloudinaryPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.warn({ err, publicId, label }, "Cloudinary: destroy failed — skipping");
  }
}

// ─── individual cleanup tasks ─────────────────────────────────────────────────

/** Null out password-reset and email-verification tokens that are past expiry.
 *  The token columns act as a session credential — leaving them in the DB after
 *  expiry is unnecessary exposure. */
async function purgeExpiredAuthTokens(): Promise<void> {
  const now = new Date();
  await db
    .update(usersTable)
    .set({ passwordResetToken: null, passwordResetTokenExpiry: null })
    .where(and(isNotNull(usersTable.passwordResetToken), lt(usersTable.passwordResetTokenExpiry!, now)));

  await db
    .update(usersTable)
    .set({ emailVerificationToken: null, emailVerificationTokenExpiry: null })
    .where(and(isNotNull(usersTable.emailVerificationToken), lt(usersTable.emailVerificationTokenExpiry!, now)));
}

/** Hard-delete in-app notifications that are no longer useful:
 *  - Read ones whose readAt is > 2 days ago
 *  - Unread ones older than 90 days (safety net — should not normally happen) */
async function purgeOldNotifications(): Promise<void> {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  await db
    .delete(inAppNotificationsTable)
    .where(
      or(
        and(isNotNull(inAppNotificationsTable.readAt), lt(inAppNotificationsTable.readAt!, twoDaysAgo)),
        lt(inAppNotificationsTable.createdAt, ninetyDaysAgo),
      )!,
    );
}

/** Trim activity logs older than 90 days.  Keeps the log table from becoming
 *  the largest table in the DB — 90 days is enough audit history for a church. */
async function trimActivityLogs(): Promise<void> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await db.delete(activityLogsTable).where(lt(activityLogsTable.createdAt, ninetyDaysAgo));
}

/** Hard-delete announcements whose expiresAt has passed.
 *  The front-end already filters them out on read, but they accumulate in the DB. */
async function purgeExpiredAnnouncements(): Promise<void> {
  await db
    .delete(announcementsTable)
    .where(and(isNotNull(announcementsTable.expiresAt), lt(announcementsTable.expiresAt!, new Date())));
}

/** Hard-delete soft-deleted private messages older than 30 days.
 *  Mirrors the existing chat-message rule so DMs get the same treatment. */
async function purgeDeletedPrivateMessages(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await db
    .delete(privateMessagesTable)
    .where(and(eq(privateMessagesTable.isDeleted, true), lt(privateMessagesTable.createdAt, thirtyDaysAgo)));
}

/** Delete chat reactions whose parent message has been hard-deleted.
 *  The message purge in the existing worker leaves orphaned reactions behind. */
async function purgeOrphanedChatReactions(): Promise<void> {
  // Fetch every message ID that still exists
  const existing = await db.select({ id: chatMessagesTable.id }).from(chatMessagesTable);
  if (existing.length === 0) {
    // No messages at all — wipe all reactions
    await db.delete(chatReactionsTable);
    return;
  }
  const ids = existing.map((r) => r.id);
  await db.delete(chatReactionsTable).where(notInArray(chatReactionsTable.messageId, ids));
}

/** Destroy Cloudinary photos for soft-deleted user accounts, then null the column.
 *  Only runs when all three CLOUDINARY_* env vars are present. */
async function purgeDeletedUserPhotos(): Promise<void> {
  if (!initCloudinary()) return;

  const deletedWithPhoto = await db
    .select({ id: usersTable.id, photoUrl: usersTable.photoUrl })
    .from(usersTable)
    .where(and(isNotNull(usersTable.deletedAt), isNotNull(usersTable.photoUrl)));

  for (const user of deletedWithPhoto) {
    await destroyCloudinaryAsset(user.photoUrl, `user #${user.id}`);
    await db.update(usersTable).set({ photoUrl: null }).where(eq(usersTable.id, user.id));
  }

  if (deletedWithPhoto.length > 0) {
    logger.info({ count: deletedWithPhoto.length }, "Cloudinary: purged photos for deleted users");
  }
}

/** Destroy Cloudinary assets for media rows that have been explicitly flagged
 *  by having their uploadedBy user deleted.  This catches sermon covers,
 *  gallery images, etc. uploaded by accounts that no longer exist.
 *  After deletion the media row itself is removed from the DB. */
async function purgeOrphanedMedia(): Promise<void> {
  if (!initCloudinary()) return;

  // Media rows whose uploader's account has been soft-deleted
  const orphaned = await db
    .select({ id: mediaTable.id, url: mediaTable.url, cloudinaryId: mediaTable.cloudinaryId })
    .from(mediaTable)
    .innerJoin(usersTable, eq(mediaTable.uploadedBy, usersTable.id))
    .where(isNotNull(usersTable.deletedAt));

  for (const asset of orphaned) {
    // Prefer the stored cloudinaryId; fall back to extracting from URL
    const publicId = asset.cloudinaryId ?? cloudinaryPublicId(asset.url);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        logger.warn({ err, publicId }, "Cloudinary: destroy media asset failed — skipping");
      }
    }
    await db.delete(mediaTable).where(eq(mediaTable.id, asset.id));
  }

  if (orphaned.length > 0) {
    logger.info({ count: orphaned.length }, "Cloudinary: purged orphaned media assets");
  }
}

// ─── main worker ──────────────────────────────────────────────────────────────

async function runRetentionCleanup(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ── 1. Soft-deleted chat messages older than 30 days ───────────────────
    await db
      .delete(chatMessagesTable)
      .where(and(eq(chatMessagesTable.isDeleted, true), lt(chatMessagesTable.createdAt, thirtyDaysAgo)));

    // ── 2. Private DMs whose auto-delete timer has fired ───────────────────
    await db
      .delete(privateMessagesTable)
      .where(and(isNotNull(privateMessagesTable.autoDeleteAt), lt(privateMessagesTable.autoDeleteAt!, new Date())));

    // ── 3. Rate-limit table bloat ──────────────────────────────────────────
    await purgeExpiredRateLimits();

    // ── 4. Expired auth tokens (password-reset + email-verify) ────────────
    await purgeExpiredAuthTokens();

    // ── 5. Old in-app notifications ────────────────────────────────────────
    await purgeOldNotifications();

    // ── 6. Activity log retention (90 days) ───────────────────────────────
    await trimActivityLogs();

    // ── 7. Expired announcements ───────────────────────────────────────────
    await purgeExpiredAnnouncements();

    // ── 8. Soft-deleted private messages (30-day grace period) ────────────
    await purgeDeletedPrivateMessages();

    // ── 9. Orphaned chat reactions ─────────────────────────────────────────
    await purgeOrphanedChatReactions();

    // ── 10. Cloudinary: deleted-user profile photos ────────────────────────
    await purgeDeletedUserPhotos();

    // ── 11. Cloudinary: media uploaded by deleted users ────────────────────
    await purgeOrphanedMedia();

    logger.info("Retention cleanup complete");
  } catch (err) {
    logger.error({ err }, "Retention cleanup failed");
  }
}

export function startRetentionWorker(): void {
  // Offset by 5 minutes so startup DB activity settles first
  const initial = setTimeout(() => {
    void runRetentionCleanup();
    setInterval(() => void runRetentionCleanup(), 24 * 60 * 60 * 1000).unref();
  }, 5 * 60 * 1000);
  initial.unref();
}
