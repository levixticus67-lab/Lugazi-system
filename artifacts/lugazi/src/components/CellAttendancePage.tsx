import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ClipboardCheck, Clock3, FileText, MapPin, Plus, Search, Trash2, Users, UserRound, UsersRound } from "lucide-react";
import axios from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import type { NavItem } from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import QrScanner from "@/components/QrScanner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface CellGroup {
  id: number;
  name: string;
  type?: string;
  leaderName?: string | null;
  location?: string | null;
  meetingDay?: string | null;
  meetingTime?: string | null;
  memberCount?: number;
  isActive?: boolean;
}

interface CellMember {
  id: number;
  fullName: string;
  photoUrl?: string | null;
  ageGroup: "adult" | "child";
  cellGroupId: number | null;
}

interface CellAttendanceRecord {
  id: number;
  memberId: number;
  memberName: string;
  ageGroup: "adult" | "child";
  method: "qr" | "manual";
  checkedInAt: string;
}

interface CellAttendanceSession {
  id: number;
  groupId: number;
  meetingDate: string;
  meetingTime?: string | null;
  adultManualCount: number;
  childManualCount: number;
  adultCount: number;
  childCount: number;
  totalCount: number;
  countMode: "summary" | "detailed" | "mixed";
  notes?: string | null;
  attendees: CellAttendanceRecord[];
  createdAt: string;
  updatedAt: string;
}

interface MyGroupResponse {
  group: CellGroup;
  members: CellMember[];
}

interface CellAttendancePageProps {
  navItems: NavItem[];
  portalLabel: string;
}

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-UG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function meetingLabel(group: CellGroup) {
  return [group.meetingDay, group.meetingTime].filter(Boolean).join(" at ") || "Schedule not set";
}

export default function CellAttendancePage({ navItems, portalLabel }: CellAttendancePageProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [meetingDate, setMeetingDate] = useState(today);
  const [search, setSearch] = useState("");
  const [recordAgeGroup, setRecordAgeGroup] = useState<"adult" | "child">("adult");
  const [adultManualCount, setAdultManualCount] = useState("0");
  const [childManualCount, setChildManualCount] = useState("0");
  const [notes, setNotes] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const myGroupQuery = useQuery<MyGroupResponse | null>({
    queryKey: ["cell-attendance-my-group"],
    queryFn: () => axios.get<MyGroupResponse | null>("/api/cell-attendance/my-group").then(response => response.data),
    enabled: Boolean(user && !isAdmin),
    staleTime: 30_000,
  });

  const groupsQuery = useQuery<CellGroup[]>({
    queryKey: ["cell-attendance-groups"],
    queryFn: () => axios.get<CellGroup[]>("/api/groups").then(response => response.data),
    enabled: Boolean(user && isAdmin),
    staleTime: 30_000,
  });
  const cellGroups = (groupsQuery.data ?? []).filter(group => group.type === "cell" && group.isActive !== false);

  const activeGroup = isAdmin
    ? cellGroups.find(group => String(group.id) === selectedGroupId) ?? null
    : myGroupQuery.data?.group ?? null;
  const groupId = activeGroup?.id ?? null;

  useEffect(() => {
    if (isAdmin && !selectedGroupId && cellGroups.length) {
      setSelectedGroupId(String(cellGroups[0].id));
    }
  }, [cellGroups, isAdmin, selectedGroupId]);

  useEffect(() => {
    if (!user || isAdmin || myGroupQuery.isLoading || myGroupQuery.data) return;
    const dashboardByRole: Record<string, string> = {
      pastor: "/pastor/dashboard",
      leadership: "/leadership/dashboard",
      workforce: "/workforce/dashboard",
      member: "/member/dashboard",
    };
    navigate(dashboardByRole[user.role] ?? "/");
  }, [isAdmin, myGroupQuery.data, myGroupQuery.isLoading, navigate, user]);

  useEffect(() => {
    setSessionId(null);
    setMeetingDate(today());
    setSearch("");
    setReportSubmitted(false);
  }, [groupId]);

  const membersQuery = useQuery<CellMember[]>({
    queryKey: ["cell-attendance-members", groupId],
    queryFn: () => axios.get<CellMember[]>(`/api/cell-attendance/groups/${groupId}/members`).then(response => response.data),
    enabled: Boolean(groupId),
    staleTime: 30_000,
  });

  const sessionsQuery = useQuery<CellAttendanceSession[]>({
    queryKey: ["cell-attendance-sessions", groupId],
    queryFn: () => axios.get<CellAttendanceSession[]>(`/api/cell-attendance/groups/${groupId}/sessions`).then(response => response.data),
    enabled: Boolean(groupId),
    staleTime: 15_000,
  });

  const sessionQuery = useQuery<CellAttendanceSession>({
    queryKey: ["cell-attendance-session", sessionId],
    queryFn: () => axios.get<CellAttendanceSession>(`/api/cell-attendance/sessions/${sessionId}`).then(response => response.data),
    enabled: Boolean(sessionId),
    staleTime: 5_000,
  });

  const session = sessionQuery.data;
  const recordedIds = useMemo(() => new Set((session?.attendees ?? []).map(attendee => attendee.memberId)), [session?.attendees]);
  const availableMembers = (membersQuery.data ?? []).filter(member =>
    !recordedIds.has(member.id) &&
    member.fullName.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const namedAdults = session?.attendees.filter(attendee => attendee.ageGroup === "adult") ?? [];
  const namedChildren = session?.attendees.filter(attendee => attendee.ageGroup === "child") ?? [];

  function refreshSession() {
    void queryClient.invalidateQueries({ queryKey: ["cell-attendance-session", sessionId] });
    void queryClient.invalidateQueries({ queryKey: ["cell-attendance-sessions", groupId] });
  }

  async function createSession() {
    if (!groupId || !meetingDate) return;
    setSaving(true);
    try {
      const response = await axios.post<CellAttendanceSession>("/api/cell-attendance/sessions", {
        groupId,
        meetingDate,
        meetingTime: activeGroup?.meetingTime ?? undefined,
        adultManualCount: Number(adultManualCount) || 0,
        childManualCount: Number(childManualCount) || 0,
        notes: notes.trim() || undefined,
        attendees: [],
      });
      setSessionId(response.data.id);
      setNotes(response.data.notes ?? "");
      setAdultManualCount(String(response.data.adultManualCount));
      setChildManualCount(String(response.data.childManualCount));
      refreshSession();
      toast({ title: "Attendance session ready", description: `${formatDate(meetingDate)} is open for recording.` });
    } catch {
      toast({ title: "Could not create attendance session", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function updateCounts() {
    if (!sessionId) return;
    setSaving(true);
    try {
      await axios.patch(`/api/cell-attendance/sessions/${sessionId}`, {
        adultManualCount: Number(adultManualCount) || 0,
        childManualCount: Number(childManualCount) || 0,
        notes: notes.trim(),
      });
      refreshSession();
      toast({ title: "Attendance totals saved" });
    } catch {
      toast({ title: "Could not save attendance totals", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function submitReport() {
    if (!sessionId) return;
    setReporting(true);
    try {
      const response = await axios.post<{ alreadySubmitted: boolean }>(
        `/api/cell-attendance/sessions/${sessionId}/report`,
      );
      setReportSubmitted(true);
      toast({
        title: response.data.alreadySubmitted ? "Report already submitted" : "Report submitted",
        description: "Pastors and administrators can now review this attendance report.",
      });
    } catch {
      toast({ title: "Could not submit attendance report", variant: "destructive" });
    } finally {
      setReporting(false);
    }
  }

  async function addMember(member: CellMember) {
    if (!sessionId) return;
    try {
      await axios.post(`/api/cell-attendance/sessions/${sessionId}/attendees`, {
        memberId: member.id,
        ageGroup: recordAgeGroup,
      });
      setSearch("");
      refreshSession();
    } catch {
      toast({ title: "Could not record this member", variant: "destructive" });
    }
  }

  async function removeMember(memberId: number) {
    if (!sessionId) return;
    try {
      await axios.delete(`/api/cell-attendance/sessions/${sessionId}/attendees/${memberId}`);
      refreshSession();
    } catch {
      toast({ title: "Could not remove this attendee", variant: "destructive" });
    }
  }

  async function handleScan(qrToken: string) {
    if (!sessionId) return;
    try {
      const response = await axios.post<{ alreadyRecorded: boolean; attendee: CellAttendanceRecord }>(
        `/api/cell-attendance/sessions/${sessionId}/scan`,
        { qrToken },
      );
      setShowScanner(false);
      refreshSession();
      toast({
        title: response.data.alreadyRecorded ? "Already recorded" : "Member checked in",
        description: response.data.attendee.memberName,
      });
    } catch {
      toast({ title: "QR code is not valid for this cell group", variant: "destructive" });
    }
  }

  function openSession(existing: CellAttendanceSession) {
    setSessionId(existing.id);
    setMeetingDate(existing.meetingDate);
    setAdultManualCount(String(existing.adultManualCount));
    setChildManualCount(String(existing.childManualCount));
    setNotes(existing.notes ?? "");
    setReportSubmitted(false);
  }

  function startNewSession() {
    setSessionId(null);
    setMeetingDate(today());
    setAdultManualCount("0");
    setChildManualCount("0");
    setNotes("");
    setReportSubmitted(false);
  }

  return (
    <PortalLayout navItems={navItems} portalLabel={portalLabel}>
      <PageHeader
        title="Cell Attendance"
        description="Record named members and additional adult or child attendees for each fellowship gathering."
        actions={
          session && (
            <Button size="sm" variant="outline" onClick={startNewSession}>
              <Plus className="h-4 w-4 mr-1" /> New session
            </Button>
          )
        }
      />

      <div className="space-y-5">
        {isAdmin && (
          <section className="glass-card p-4">
            <label htmlFor="attendance-group" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cell group</label>
            <select
              id="attendance-group"
              value={selectedGroupId}
              onChange={event => setSelectedGroupId(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {cellGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </section>
        )}

        {activeGroup && (
          <section className="glass-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <UsersRound className="h-5 w-5 text-primary" />
                  <h2 className="font-serif text-lg font-semibold">{activeGroup.name}</h2>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{meetingLabel(activeGroup)}</span>
                  {activeGroup.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{activeGroup.location}</span>}
                  {activeGroup.leaderName && <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{activeGroup.leaderName}</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{activeGroup.memberCount ?? membersQuery.data?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">members</p>
              </div>
            </div>
          </section>
        )}

        {!activeGroup && !myGroupQuery.isLoading && !groupsQuery.isLoading && (
          <section className="glass-card p-8 text-center">
            <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h2 className="font-semibold">No cell group assigned</h2>
            <p className="text-sm text-muted-foreground mt-1">A cell leader assignment is required before attendance can be recorded.</p>
          </section>
        )}

        {activeGroup && (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
            <section className="glass-card p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-serif text-lg font-semibold">{session ? `Attendance for ${formatDate(session.meetingDate)}` : "Open a gathering"}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {session ? "Scan QR codes, add members manually, or record extra attendees below." : "Choose the gathering date and open an attendance session."}
                  </p>
                </div>
                {session && (
                  <Button size="sm" onClick={() => setShowScanner(true)}>
                    <Camera className="h-4 w-4 mr-1" /> Scan QR
                  </Button>
                )}
              </div>

              {!session && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                  <div>
                    <label htmlFor="meeting-date" className="text-sm font-medium">Gathering date</label>
                    <Input id="meeting-date" type="date" value={meetingDate} onChange={event => setMeetingDate(event.target.value)} className="mt-1" />
                  </div>
                  <Button onClick={createSession} disabled={saving || !meetingDate}>
                    <ClipboardCheck className="h-4 w-4 mr-1" /> Open attendance
                  </Button>
                </div>
              )}

              {session && (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="rounded-xl bg-primary/10 p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold text-primary">{session.totalCount}</p></div>
                    <div className="rounded-xl bg-blue-500/10 p-3"><p className="text-xs text-muted-foreground">Adults</p><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{session.adultCount}</p></div>
                    <div className="rounded-xl bg-amber-500/10 p-3"><p className="text-xs text-muted-foreground">Children</p><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{session.childCount}</p></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search a member to add manually" className="pl-9" />
                      {search && availableMembers.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover p-1 shadow-lg max-h-56 overflow-auto">
                          {availableMembers.slice(0, 12).map(member => (
                            <button key={member.id} type="button" onClick={() => addMember(member)} className="w-full flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent">
                              <span>{member.fullName}</span>
                              <span className="text-[10px] uppercase text-muted-foreground">{member.ageGroup}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="record-age-group" className="text-xs text-muted-foreground whitespace-nowrap">Add as</label>
                      <select id="record-age-group" value={recordAgeGroup} onChange={event => setRecordAgeGroup(event.target.value as "adult" | "child")} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                        <option value="adult">Adult</option>
                        <option value="child">Child</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border/70 p-4">
                      <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-sm flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" />Adults</h3><span className="text-xs text-muted-foreground">{namedAdults.length} named</span></div>
                      <div className="space-y-2">
                        {namedAdults.length ? namedAdults.map(attendee => <AttendeeRow key={attendee.id} attendee={attendee} onRemove={() => removeMember(attendee.memberId)} />) : <p className="text-xs text-muted-foreground py-2">No named adults yet.</p>}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/70 p-4">
                      <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-sm flex items-center gap-2"><UsersRound className="h-4 w-4 text-amber-500" />Children</h3><span className="text-xs text-muted-foreground">{namedChildren.length} named</span></div>
                      <div className="space-y-2">
                        {namedChildren.length ? namedChildren.map(attendee => <AttendeeRow key={attendee.id} attendee={attendee} onRemove={() => removeMember(attendee.memberId)} />) : <p className="text-xs text-muted-foreground py-2">No named children yet.</p>}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>

            <aside className="space-y-5">
              {session && (
                <section className="glass-card p-5">
                  <h2 className="font-semibold text-sm mb-3">Additional attendees</h2>
                  <p className="text-xs text-muted-foreground mb-4">Use these fields for visitors or people without a member profile. They are added to the named totals without double counting.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium">Adults<input type="number" min="0" value={adultManualCount} onChange={event => setAdultManualCount(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" /></label>
                    <label className="text-xs font-medium">Children<input type="number" min="0" value={childManualCount} onChange={event => setChildManualCount(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" /></label>
                  </div>
                  <label className="text-xs font-medium block mt-4">Notes<textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder="Optional notes about this gathering" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" /></label>
                  <div className="space-y-2 mt-4">
                    <Button className="w-full" onClick={updateCounts} disabled={saving}>
                      <Check className="h-4 w-4 mr-1" />Save totals
                    </Button>
                    <Button className="w-full" variant="outline" onClick={submitReport} disabled={reporting || reportSubmitted}>
                      <FileText className="h-4 w-4 mr-1" />
                      {reportSubmitted ? "Report submitted" : reporting ? "Submitting report…" : "Submit attendance report"}
                    </Button>
                  </div>
                </section>
              )}

              <section className="glass-card p-5">
                <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-sm">Recent gatherings</h2><span className="text-xs text-muted-foreground">{sessionsQuery.data?.length ?? 0}</span></div>
                {sessionsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading attendance history...</p> : sessionsQuery.data?.length ? (
                  <div className="space-y-2">
                    {sessionsQuery.data.slice(0, 10).map(existing => (
                      <button key={existing.id} type="button" onClick={() => openSession(existing)} className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent ${sessionId === existing.id ? "border-primary bg-primary/5" : "border-border/70"}`}>
                        <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{formatDate(existing.meetingDate)}</span><span className="text-sm font-bold">{existing.totalCount}</span></div>
                        <p className="text-xs text-muted-foreground mt-1">{existing.adultCount} adults · {existing.childCount} children</p>
                      </button>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No gatherings recorded yet.</p>}
              </section>
            </aside>
          </div>
        )}
      </div>

      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Scan member QR code</DialogTitle></DialogHeader>
          <QrScanner onScan={handleScan} label="Point the camera at a member QR code" />
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}

function AttendeeRow({ attendee, onRemove }: { attendee: CellAttendanceRecord; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2">
      <div className="min-w-0"><p className="text-sm truncate">{attendee.memberName}</p><p className="text-[10px] text-muted-foreground uppercase">{attendee.method === "qr" ? "QR scan" : "Manual"}</p></div>
      <button type="button" onClick={onRemove} title={`Remove ${attendee.memberName}`} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}