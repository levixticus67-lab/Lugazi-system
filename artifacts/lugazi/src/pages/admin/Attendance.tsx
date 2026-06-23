import { useState, useMemo } from "react";
import { useListAttendance, useQrScanCheckIn, useCheckIn, useListMembers, useListEvents, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import QrScanner from "@/components/QrScanner";
import { QrCode, UserCheck, ChevronDown, ChevronRight, Trash2, Pencil, Users } from "lucide-react";

type AttendanceRecord = {
  id: number;
  memberId: number;
  memberName: string;
  eventId: number | null;
  eventName: string;
  checkedInAt: string;
  method: string;
};

type Event = { id: number; title: string; date: string };
type Member = { id: number; fullName: string };

type EventGroup = {
  eventName: string;
  eventId: number | null;
  records: AttendanceRecord[];
};

export default function AdminAttendance() {
  const { data: rawRecords = [], isLoading } = useListAttendance();
  const records = rawRecords as AttendanceRecord[];
  const { data: events = [] } = useListEvents();
  const { data: members = [] } = useListMembers();
  const qrScanMutation = useQrScanCheckIn();
  const checkInMutation = useCheckIn();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [scannedToken, setScannedToken] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");

  // Edit dialog state
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editMethod, setEditMethod] = useState("");
  const [editEventName, setEditEventName] = useState("");
  const [editCheckedInAt, setEditCheckedInAt] = useState("");

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Group records by event
  const groups = useMemo<EventGroup[]>(() => {
    const map = new Map<string, EventGroup>();
    for (const r of records) {
      const key = r.eventName;
      if (!map.has(key)) {
        map.set(key, { eventName: r.eventName, eventId: r.eventId, records: [] });
      }
      map.get(key)!.records.push(r);
    }
    return Array.from(map.values());
  }, [records]);

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const upcomingEvents = (events as Event[]).filter(e => new Date(e.date) >= new Date(Date.now() - 7 * 86400000));
  const eventOptions = upcomingEvents.length > 0 ? upcomingEvents : (events as Event[]).slice(0, 20);

  function getEventById(id: string) {
    return (events as Event[]).find(e => String(e.id) === id);
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/attendance/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
      toast({ title: "Record deleted" });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, string> }) =>
      axios.patch(`/api/attendance/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
      toast({ title: "Record updated" });
      setEditRecord(null);
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  function openEdit(r: AttendanceRecord) {
    setEditRecord(r);
    setEditMethod(r.method);
    setEditEventName(r.eventName);
    setEditCheckedInAt(new Date(r.checkedInAt).toISOString().slice(0, 16));
  }

  function handleEdit() {
    if (!editRecord) return;
    editMutation.mutate({
      id: editRecord.id,
      data: { method: editMethod, eventName: editEventName, checkedInAt: new Date(editCheckedInAt).toISOString() },
    });
  }

  function handleQrScan(token: string) {
    setScannedToken(token);
    toast({ title: "QR Code scanned", description: "Now select the event below." });
  }

  function handleQrCheckIn() {
    if (!scannedToken) { toast({ title: "Please scan a QR code first", variant: "destructive" }); return; }
    if (!selectedEventId) { toast({ title: "Please select an event", variant: "destructive" }); return; }
    const event = getEventById(selectedEventId);
    if (!event) return;
    qrScanMutation.mutate({ data: { qrToken: scannedToken, eventName: event.title, eventId: Number(selectedEventId) } }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
        toast({ title: `Checked in: ${(data as AttendanceRecord).memberName}` });
        setShowQrDialog(false); setScannedToken(""); setSelectedEventId("");
      },
      onError: () => toast({ title: "QR code not found or invalid", variant: "destructive" }),
    });
  }

  function handleManualCheckIn() {
    if (!selectedMemberId || !selectedEventId) { toast({ title: "Member and event required", variant: "destructive" }); return; }
    const event = getEventById(selectedEventId);
    if (!event) return;
    checkInMutation.mutate({ data: { memberId: Number(selectedMemberId), eventName: event.title, eventId: Number(selectedEventId), method: "manual" } }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
        toast({ title: `Checked in: ${(data as AttendanceRecord).memberName}` });
        setShowManualDialog(false); setSelectedMemberId(""); setSelectedEventId("");
      },
      onError: () => toast({ title: "Check-in failed", variant: "destructive" }),
    });
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader
        title="Attendance"
        description={`${records.length} records across ${groups.length} events`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setScannedToken(""); setSelectedEventId(""); setShowQrDialog(true); }}>
              <QrCode className="h-4 w-4 mr-1" /> QR Scan
            </Button>
            <Button size="sm" onClick={() => { setSelectedMemberId(""); setSelectedEventId(""); setShowManualDialog(true); }}>
              <UserCheck className="h-4 w-4 mr-1" /> Manual
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">No attendance records yet.</div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const isOpen = expandedGroups.has(group.eventName);
            return (
              <div key={group.eventName} className="glass-card overflow-hidden">
                {/* Event header row */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => toggleGroup(group.eventName)}
                >
                  <div className="flex items-center gap-3">
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="font-semibold text-sm">{group.eventName}</span>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {group.records.length}
                  </Badge>
                </button>

                {/* Attendee list */}
                {isOpen && (
                  <div className="border-t border-border/50">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/20">
                        <tr>
                          <th className="text-left px-5 py-2 font-medium text-muted-foreground">Member</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">Method</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">Time</th>
                          <th className="px-4 py-2 w-20" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {group.records.map(r => (
                          <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-5 py-3 font-medium">{r.memberName}</td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <Badge variant="outline" className="text-xs capitalize">{r.method}</Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                              {new Date(r.checkedInAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => openEdit(r)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteId(r.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QR Scan Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>QR Code Check-In</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <QrScanner label="Scan member QR code (camera or gallery)" onScan={handleQrScan} />
            {scannedToken && (
              <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 font-mono break-all">✓ QR Scanned</p>
            )}
            <div>
              <Label>Select Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose the event…" /></SelectTrigger>
                <SelectContent>
                  {eventOptions.map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.title} — {new Date(e.date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQrDialog(false)}>Cancel</Button>
            <Button onClick={handleQrCheckIn} disabled={qrScanMutation.isPending || !scannedToken || !selectedEventId}>
              Check In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manual Check-In</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Member</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {(members as Member[]).map(m => <SelectItem key={m.id} value={String(m.id)}>{m.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose the event…" /></SelectTrigger>
                <SelectContent>
                  {eventOptions.map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.title} — {new Date(e.date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>Cancel</Button>
            <Button onClick={handleManualCheckIn} disabled={checkInMutation.isPending}>Check In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editRecord} onOpenChange={open => !open && setEditRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Attendance Record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Member</Label>
              <p className="text-sm font-medium mt-1 px-3 py-2 bg-muted rounded-md">{editRecord?.memberName}</p>
            </div>
            <div>
              <Label>Event Name</Label>
              <Input className="mt-1" value={editEventName} onChange={e => setEditEventName(e.target.value)} />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={editMethod} onValueChange={setEditMethod}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="qr">QR Scan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Check-in Time</Label>
              <Input type="datetime-local" className="mt-1" value={editCheckedInAt} onChange={e => setEditCheckedInAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editMutation.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Record?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This attendance record will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
