/**
 * Google Sheets activity-log archiver.
 *
 * Appends rows to a Google Sheet before the retention worker deletes old logs.
 * Fully automated — runs inside the daily retention job on Render.
 *
 * Required Render environment variables (set once, never changes):
 *   GOOGLE_SHEET_ID               — the long ID from the sheet URL
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — service account email from Google Cloud
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY — private key (include the -----BEGIN ... END----- lines)
 *
 * If any of the three vars are missing the function logs a warning and returns
 * without throwing — the retention worker continues normally.
 */

import { google } from "googleapis";
import { logger } from "./logger";
import type { ActivityLog } from "@workspace/db";

const SHEET_NAME = "Activity Log Archive";
const HEADER_ROW = ["Date", "User", "Action", "Entity Type", "Entity", "Details", "IP Address", "Log ID"];

function getClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !key || !sheetId) return null;

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

/** Ensure the archive sheet tab exists and has a header row.
 *  Safe to call repeatedly — exits early when the tab already exists. */
async function ensureSheet(
  sheets: ReturnType<typeof google.sheets>,
  sheetId: string,
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const exists = meta.data.sheets?.some(
    (s) => s.properties?.title === SHEET_NAME,
  );

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    });
    // Write header
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER_ROW] },
    });
  }
}

function toRow(log: ActivityLog): string[] {
  return [
    log.createdAt.toISOString().replace("T", " ").slice(0, 19), // readable date
    log.displayName,
    log.action,
    log.entityType  ?? "",
    log.entityName  ?? (log.entityId != null ? String(log.entityId) : ""),
    log.details     ?? "",
    log.ipAddress   ?? "",
    String(log.id),
  ];
}

/**
 * Append a batch of activity logs to the Google Sheet archive.
 * Returns true on success, false if Sheets is not configured or the write fails.
 */
export async function archiveLogsToSheets(logs: ActivityLog[]): Promise<boolean> {
  if (logs.length === 0) return true;

  const client = getClient();
  if (!client) {
    logger.warn(
      "Google Sheets archive skipped — GOOGLE_SHEET_ID / GOOGLE_SERVICE_ACCOUNT_EMAIL / " +
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not set in environment.",
    );
    return false;
  }

  const { sheets, sheetId } = client;

  try {
    await ensureSheet(sheets, sheetId);

    // Append in batches of 500 to stay well inside Sheets API rate limits
    const BATCH = 500;
    for (let i = 0; i < logs.length; i += BATCH) {
      const batch = logs.slice(i, i + BATCH);
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: batch.map(toRow) },
      });
    }

    logger.info({ count: logs.length }, "Google Sheets: archived activity logs");
    return true;
  } catch (err) {
    logger.error({ err }, "Google Sheets: archive failed — logs will NOT be deleted this cycle");
    return false;
  }
}
