import { Router } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  cellAttendanceRecordsTable,
  cellAttendanceSessionsTable,
  groupsTable,
  membersTable,
  reportsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

type AgeGroup = "adult" | "child";
type AttendanceMethod = "qr" | "manual";
type CountMode = "summary" | "detailed" | "mixed";

interface AttendeeInput {
  memberId: number;
  ageGroup?: AgeGroup;
  method?: AttendanceMethod;
}

function isAdmin(req: AuthRequest): boolean {
  return req.userRole === "admin";
}

function parseId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseCount(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return 0;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normaliseAgeGroup(value: unknown): AgeGroup | null {
  return value === "child" || value === "adult" ? value : null;
}

function normaliseMethod(value: unknown): AttendanceMethod | null {
  return value === "qr" || value === "manual" ? value : null;
}

function normaliseCountMode(value: unknown, hasRecords: boolean, hasManualCounts: boolean): CountMode {
  if (value === "summary" || value === "detailed" || value === "mixed") return value;
  if (hasRecords && hasManualCounts) return "mixed";
  if (hasRecords) return "detailed";
  return "summary";
}

async function getAccessibleGroup(groupId: number, req: AuthRequest) {
  const [group] = await db
    .select()
    .from(groupsTable)
    .where(and(eq(groupsTable.id, groupId), eq(groupsTable.type, "cell")))
    .limit(1);
  if (!group) return null;
  if (!isAdmin(req) && group.leaderUserId !== req.userId) return null;
  return group;
}

async function getAccessibleSession(sessionId: number, req: AuthRequest) {
  const [session] = await db
    .select()
    .from(cellAttendanceSessionsTable)
    .where(eq(cellAttendanceSessionsTable.id, sessionId))
    .limit(1);
  if (!session) return null;
  const group = await getAccessibleGroup(session.groupId, req);
  return group ? { session, group } : null;
}

function serializeSession(
  session: typeof cellAttendanceSessionsTable.$inferSelect,
  records: typeof cellAttendanceRecordsTable.$inferSelect[],
) {
  const namedAdults = records.filter(record => record.ageGroup === "adult").length;
  const namedChildren = records.filter(record => record.ageGroup === "child").length;
  const adultCount = namedAdults + session.adultManualCount;
  const childCount = namedChildren + session.childManualCount;

  return {
    ...session,
    adultCount,
    childCount,
    totalCount: adultCount + childCount,
    attendees: records.map(record => ({
      ...record,
      checkedInAt: record.checkedInAt.toISOString(),
    })),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

async function readSession(session: typeof cellAttendanceSessionsTable.$inferSelect) {
  const records = await db
    .select()
    .from(cellAttendanceRecordsTable)
    .where(eq(cellAttendanceRecordsTable.sessionId, session.id))
    .orderBy(asc(cellAttendanceRecordsTable.ageGroup), asc(cellAttendanceRecordsTable.memberName));
  return serializeSession(session, records);
}

async function logAttendanceActivity(req: AuthRequest, action: string, sessionId: number, groupName: string, details: string) {
  const [actor] = await db
    .select({ displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);
  await logActivity({
    userId: req.userId!,
    displayName: actor?.displayName ?? "Cell leader",
    action,
    entityType: "cell_attendance",
    entityId: sessionId,
    entityName: groupName,
    details,
    ipAddress: req.ip ?? "unknown",
  });
}

// Returns the signed-in leader's group and the active members available for attendance.
router.get("/cell-attendance/my-group", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [group] = await db
    .select()
    .from(groupsTable)
    .where(and(
      eq(groupsTable.leaderUserId, req.userId!),
      eq(groupsTable.type, "cell"),
      eq(groupsTable.isActive, true),
    ))
    .limit(1);
  if (!group) {
    res.json(null);
    return;
  }

  const members = await db
    .select({
      id: membersTable.id,
      fullName: membersTable.fullName,
      photoUrl: membersTable.photoUrl,
      ageGroup: membersTable.ageGroup,
      cellGroupId: membersTable.cellGroupId,
    })
    .from(membersTable)
    .where(and(eq(membersTable.cellGroupId, group.id), eq(membersTable.isActive, true)))
    .orderBy(membersTable.fullName);

  res.json({ group, members });
});

router.get("/cell-attendance/groups/:groupId/members", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const groupId = parseId(req.params.groupId);
  if (!groupId) {
    res.status(400).json({ error: "Invalid group ID" });
    return;
  }
  const group = await getAccessibleGroup(groupId, req);
  if (!group) {
    res.status(403).json({ error: "You do not have access to this cell group" });
    return;
  }

  const members = await db
    .select({
      id: membersTable.id,
      fullName: membersTable.fullName,
      photoUrl: membersTable.photoUrl,
      ageGroup: membersTable.ageGroup,
      cellGroupId: membersTable.cellGroupId,
    })
    .from(membersTable)
    .where(and(eq(membersTable.cellGroupId, groupId), eq(membersTable.isActive, true)))
    .orderBy(membersTable.fullName);
  res.json(members);
});

router.get("/cell-attendance/groups/:groupId/sessions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const groupId = parseId(req.params.groupId);
  if (!groupId) {
    res.status(400).json({ error: "Invalid group ID" });
    return;
  }
  const group = await getAccessibleGroup(groupId, req);
  if (!group) {
    res.status(403).json({ error: "You do not have access to this cell group" });
    return;
  }

  const sessions = await db
    .select()
    .from(cellAttendanceSessionsTable)
    .where(eq(cellAttendanceSessionsTable.groupId, groupId))
    .orderBy(desc(cellAttendanceSessionsTable.meetingDate), desc(cellAttendanceSessionsTable.createdAt));

  const sessionIds = sessions.map(session => session.id);
  const records = sessionIds.length
    ? await db
      .select({
        sessionId: cellAttendanceRecordsTable.sessionId,
        ageGroup: cellAttendanceRecordsTable.ageGroup,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(cellAttendanceRecordsTable)
      .where(inArray(cellAttendanceRecordsTable.sessionId, sessionIds))
      .groupBy(cellAttendanceRecordsTable.sessionId, cellAttendanceRecordsTable.ageGroup)
    : [];

  const counts = new Map<number, { adult: number; child: number }>();
  for (const row of records) {
    const current = counts.get(row.sessionId) ?? { adult: 0, child: 0 };
    if (row.ageGroup === "child") current.child = Number(row.count);
    else current.adult = Number(row.count);
    counts.set(row.sessionId, current);
  }

  res.json(sessions.map(session => {
    const named = counts.get(session.id) ?? { adult: 0, child: 0 };
    const adultCount = named.adult + session.adultManualCount;
    const childCount = named.child + session.childManualCount;
    return {
      ...session,
      adultCount,
      childCount,
      totalCount: adultCount + childCount,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }));
});

router.get("/cell-attendance/sessions/:sessionId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const sessionId = parseId(req.params.sessionId);
  if (!sessionId) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }
  const accessible = await getAccessibleSession(sessionId, req);
  if (!accessible) {
    res.status(404).json({ error: "Attendance session not found" });
    return;
  }
  res.json(await readSession(accessible.session));
});

router.post("/cell-attendance/sessions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const groupId = Number(req.body.groupId);
  const meetingDate = req.body.meetingDate;
  const adultManualCount = parseCount(req.body.adultManualCount);
  const childManualCount = parseCount(req.body.childManualCount);
  const attendees = Array.isArray(req.body.attendees) ? req.body.attendees as AttendeeInput[] : [];

  if (!Number.isInteger(groupId) || groupId < 1 || !isDateOnly(meetingDate)) {
    res.status(400).json({ error: "groupId and meetingDate (YYYY-MM-DD) are required" });
    return;
  }
  if (adultManualCount === null || childManualCount === null) {
    res.status(400).json({ error: "Manual adult and child counts must be non-negative integers" });
    return;
  }
  const group = await getAccessibleGroup(groupId, req);
  if (!group) {
    res.status(403).json({ error: "You do not have access to this cell group" });
    return;
  }

  const attendeeIds = attendees.map(attendee => Number(attendee.memberId));
  if (attendeeIds.some(id => !Number.isInteger(id) || id < 1) || new Set(attendeeIds).size !== attendeeIds.length) {
    res.status(400).json({ error: "Each attendee must have a unique valid member ID" });
    return;
  }
  const groupMembers = attendeeIds.length
    ? await db
      .select({ id: membersTable.id, fullName: membersTable.fullName, ageGroup: membersTable.ageGroup })
      .from(membersTable)
      .where(and(inArray(membersTable.id, attendeeIds), eq(membersTable.cellGroupId, groupId), eq(membersTable.isActive, true)))
    : [];
  if (groupMembers.length !== attendeeIds.length) {
    res.status(400).json({ error: "Every attendee must be an active member of this cell group" });
    return;
  }

  const memberMap = new Map(groupMembers.map(member => [member.id, member]));
  const hasManualCounts = adultManualCount > 0 || childManualCount > 0;
  const countMode = normaliseCountMode(req.body.countMode, attendees.length > 0, hasManualCounts);
  const meetingTime = typeof req.body.meetingTime === "string" ? req.body.meetingTime : group.meetingTime;
  const notes = typeof req.body.notes === "string" ? req.body.notes.trim().slice(0, 2000) || null : null;

  let sessionId = 0;
  let wasCreated = false;
  await db.transaction(async tx => {
    const [existing] = await tx
      .select()
      .from(cellAttendanceSessionsTable)
      .where(and(eq(cellAttendanceSessionsTable.groupId, groupId), eq(cellAttendanceSessionsTable.meetingDate, meetingDate)))
      .limit(1);

    if (existing) {
      sessionId = existing.id;
      await tx.update(cellAttendanceSessionsTable)
        .set({ meetingTime, recordedBy: req.userId!, adultManualCount, childManualCount, countMode, notes })
        .where(eq(cellAttendanceSessionsTable.id, existing.id));
      // A session can be reopened to update totals or notes. Only replace
      // named attendees when the caller explicitly supplied a non-empty list.
      // This prevents opening an existing session from silently erasing
      // previously scanned or manually recorded members.
      if (attendees.length > 0) {
        await tx.delete(cellAttendanceRecordsTable).where(eq(cellAttendanceRecordsTable.sessionId, existing.id));
      }
    } else {
      const [created] = await tx.insert(cellAttendanceSessionsTable).values({
        groupId,
        meetingDate,
        meetingTime,
        recordedBy: req.userId!,
        adultManualCount,
        childManualCount,
        countMode,
        notes,
      }).returning();
      sessionId = created.id;
      wasCreated = true;
    }

    if (attendees.length > 0) {
      await tx.insert(cellAttendanceRecordsTable).values(attendees.map(attendee => {
        const member = memberMap.get(Number(attendee.memberId))!;
        const ageGroup = normaliseAgeGroup(attendee.ageGroup) ?? (member.ageGroup === "child" ? "child" : "adult");
        const method = normaliseMethod(attendee.method) ?? "manual";
        return {
          sessionId,
          memberId: member.id,
          memberName: member.fullName,
          ageGroup,
          method,
          checkedInBy: req.userId!,
        };
      }));
    }
  });

  const [savedSession] = await db
    .select()
    .from(cellAttendanceSessionsTable)
    .where(eq(cellAttendanceSessionsTable.id, sessionId))
    .limit(1);
  if (!savedSession) {
    res.status(500).json({ error: "Attendance session could not be saved" });
    return;
  }
  await logAttendanceActivity(req, wasCreated ? "cell_attendance_created" : "cell_attendance_updated", sessionId, group.name, `${meetingDate} — ${countMode}`);
  res.status(wasCreated ? 201 : 200).json(await readSession(savedSession));
});

router.post("/cell-attendance/sessions/:sessionId/report", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const sessionId = parseId(req.params.sessionId);
  if (!sessionId) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const accessible = await getAccessibleSession(sessionId, req);
  if (!accessible) {
    res.status(404).json({ error: "Attendance session not found" });
    return;
  }

  const { session, group } = accessible;
  const serialised = await readSession(session);
  const [existing] = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.cellAttendanceSessionId, sessionId))
    .limit(1);

  if (existing) {
    res.json({
      ...existing,
      alreadySubmitted: true,
      createdAt: existing.createdAt.toISOString(),
      updatedAt: existing.updatedAt.toISOString(),
    });
    return;
  }

  const [actor] = await db
    .select({ displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  const [report] = await db.insert(reportsTable).values({
    title: `${group.name} Cell Attendance Report`,
    type: "cell_attendance",
    period: session.meetingDate,
    submittedBy: req.userId!,
    submittedByName: actor?.displayName ?? "Cell leader",
    branchId: group.branchId,
    cellGroupId: group.id,
    cellAttendanceSessionId: session.id,
    content: session.notes ?? `Cell gathering held on ${session.meetingDate}.`,
    attendance: serialised.totalCount,
    status: "submitted",
  }).returning();

  await logAttendanceActivity(
    req,
    "cell_attendance_report_submitted",
    session.id,
    group.name,
    `${session.meetingDate} — ${serialised.totalCount} attendees`,
  );

  res.status(201).json({
    ...report,
    alreadySubmitted: false,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  });
});

router.post("/cell-attendance/sessions/:sessionId/scan", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const sessionId = parseId(req.params.sessionId);
  const qrToken = typeof req.body.qrToken === "string" ? req.body.qrToken.trim() : "";
  if (!sessionId || !qrToken) {
    res.status(400).json({ error: "sessionId and qrToken are required" });
    return;
  }
  const accessible = await getAccessibleSession(sessionId, req);
  if (!accessible) {
    res.status(404).json({ error: "Attendance session not found" });
    return;
  }

  const [member] = await db
    .select({ id: membersTable.id, fullName: membersTable.fullName, ageGroup: membersTable.ageGroup, cellGroupId: membersTable.cellGroupId })
    .from(membersTable)
    .where(and(eq(membersTable.qrToken, qrToken), eq(membersTable.cellGroupId, accessible.group.id), eq(membersTable.isActive, true)))
    .limit(1);
  if (!member) {
    res.status(404).json({ error: "This QR code does not belong to an active member of this cell group" });
    return;
  }

  const [existing] = await db
    .select()
    .from(cellAttendanceRecordsTable)
    .where(and(eq(cellAttendanceRecordsTable.sessionId, sessionId), eq(cellAttendanceRecordsTable.memberId, member.id)))
    .limit(1);
  if (existing) {
    res.json({ alreadyRecorded: true, attendee: { ...existing, checkedInAt: existing.checkedInAt.toISOString() } });
    return;
  }

  const [record] = await db.insert(cellAttendanceRecordsTable).values({
    sessionId,
    memberId: member.id,
    memberName: member.fullName,
    ageGroup: member.ageGroup === "child" ? "child" : "adult",
    method: "qr",
    checkedInBy: req.userId!,
  }).returning();
  await logAttendanceActivity(req, "cell_attendance_qr_scan", sessionId, accessible.group.name, `${member.fullName} — QR`);
  res.status(201).json({ alreadyRecorded: false, attendee: { ...record, checkedInAt: record.checkedInAt.toISOString() } });
});

router.post("/cell-attendance/sessions/:sessionId/attendees", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const sessionId = parseId(req.params.sessionId);
  const memberId = Number(req.body.memberId);
  if (!sessionId || !Number.isInteger(memberId) || memberId < 1) {
    res.status(400).json({ error: "sessionId and memberId are required" });
    return;
  }
  const accessible = await getAccessibleSession(sessionId, req);
  if (!accessible) {
    res.status(404).json({ error: "Attendance session not found" });
    return;
  }
  const [member] = await db
    .select({ id: membersTable.id, fullName: membersTable.fullName, ageGroup: membersTable.ageGroup })
    .from(membersTable)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.cellGroupId, accessible.group.id), eq(membersTable.isActive, true)))
    .limit(1);
  if (!member) {
    res.status(404).json({ error: "Member is not part of this cell group" });
    return;
  }
  const [existing] = await db
    .select()
    .from(cellAttendanceRecordsTable)
    .where(and(eq(cellAttendanceRecordsTable.sessionId, sessionId), eq(cellAttendanceRecordsTable.memberId, memberId)))
    .limit(1);
  if (existing) {
    res.json({ alreadyRecorded: true, attendee: { ...existing, checkedInAt: existing.checkedInAt.toISOString() } });
    return;
  }

  const ageGroup = normaliseAgeGroup(req.body.ageGroup) ?? (member.ageGroup === "child" ? "child" : "adult");
  const [record] = await db.insert(cellAttendanceRecordsTable).values({
    sessionId,
    memberId,
    memberName: member.fullName,
    ageGroup,
    method: "manual",
    checkedInBy: req.userId!,
  }).returning();
  await logAttendanceActivity(req, "cell_attendance_manual_checkin", sessionId, accessible.group.name, `${member.fullName} — manual`);
  res.status(201).json({ alreadyRecorded: false, attendee: { ...record, checkedInAt: record.checkedInAt.toISOString() } });
});

router.delete("/cell-attendance/sessions/:sessionId/attendees/:memberId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const sessionId = parseId(req.params.sessionId);
  const memberId = parseId(req.params.memberId);
  if (!sessionId || !memberId) {
    res.status(400).json({ error: "Invalid session or member ID" });
    return;
  }
  const accessible = await getAccessibleSession(sessionId, req);
  if (!accessible) {
    res.status(404).json({ error: "Attendance session not found" });
    return;
  }
  await db.delete(cellAttendanceRecordsTable).where(and(
    eq(cellAttendanceRecordsTable.sessionId, sessionId),
    eq(cellAttendanceRecordsTable.memberId, memberId),
  ));
  await logAttendanceActivity(req, "cell_attendance_removed", sessionId, accessible.group.name, `Member #${memberId}`);
  res.sendStatus(204);
});

router.patch("/cell-attendance/sessions/:sessionId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const sessionId = parseId(req.params.sessionId);
  if (!sessionId) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }
  const accessible = await getAccessibleSession(sessionId, req);
  if (!accessible) {
    res.status(404).json({ error: "Attendance session not found" });
    return;
  }
  const adultManualCount = req.body.adultManualCount === undefined ? undefined : parseCount(req.body.adultManualCount);
  const childManualCount = req.body.childManualCount === undefined ? undefined : parseCount(req.body.childManualCount);
  if (adultManualCount === null || childManualCount === null) {
    res.status(400).json({ error: "Manual counts must be non-negative integers" });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (adultManualCount !== undefined) updateData.adultManualCount = adultManualCount;
  if (childManualCount !== undefined) updateData.childManualCount = childManualCount;
  if (typeof req.body.notes === "string") updateData.notes = req.body.notes.trim().slice(0, 2000) || null;
  if (typeof req.body.meetingTime === "string") updateData.meetingTime = req.body.meetingTime;
  if (req.body.countMode === "summary" || req.body.countMode === "detailed" || req.body.countMode === "mixed") updateData.countMode = req.body.countMode;
  if (Object.keys(updateData).length > 0) {
    await db.update(cellAttendanceSessionsTable).set(updateData).where(eq(cellAttendanceSessionsTable.id, sessionId));
  }
  const [updated] = await db.select().from(cellAttendanceSessionsTable).where(eq(cellAttendanceSessionsTable.id, sessionId)).limit(1);
  if (!updated) {
    res.status(404).json({ error: "Attendance session not found" });
    return;
  }
  await logAttendanceActivity(req, "cell_attendance_updated", sessionId, accessible.group.name, "Session details updated");
  res.json(await readSession(updated));
});

export default router;