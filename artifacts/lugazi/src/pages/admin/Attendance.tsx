import { useState } from "react";
import { useListAttendance, useQrScanCheckIn, useCheckIn, useListMembers, useListEvents, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import QrScanner from "@/components/QrScanner";
import { QrCode, UserCheck } from "lucide-react";

type AttendanceRecord = { id: number; memberId: number; memberName: string; eventName: string; checkedInAt: string; method: string };
type Event = { id: number; title: string; date: string };
type Member = { id: number; fullName: string };

export default function AdminAttendance() {
  const { data: records = [], isLoading } = useListAttendance();
  const { data: events = [] } = useListEvents();
  const { data: members = [] } = useListMembers();
  const qrScanMutation = useQrScanCheckIn();
  const checkInMutation = useCheckIn();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [scannedToken, setScannedToken] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const upcomingEvents = (events as Event[]).filter(e => new Date(e.date) >= new Date(Date.now() - 7 * 86400000));
  const eventOptions = upcomingEvents.length > 0 ? upcomingEvents : (events as Event[]).slice(0, 20);

  function getEventById(id: string) {
    return (events as Event[]).find(e => String(e.id) === id);
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
        toast({ title: `Checked in: ${data.memberName}` });
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
        toast({ title: `Checked in: ${data.memberName}` });
        setShowManualDialog(false); setSelectedMemberId(""); setSelectedEventId("");
      },
      onError: () => toast({ title: "Check-in failed", variant: "destructive" }),
    });
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader
        title="Attendance"
        description={`${(records as AttendanceRecord[]).length} records`}
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
      <DataTable
        columns={[
          { header: "Member", key: "memberName" },
          { header: "Event", key: "eventName" },
          { header: "Method", key: "method" },
          { header: "Time", key: "checkedInAt", render: r => new Date(r.checkedInAt).toLocaleString() },
        ]}
        data={(records as AttendanceRecord[]).slice(0, 100)}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No attendance records yet."
      />

      {/* QR Scan Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>QR Code Check-In</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <QrScanner
              label="Scan member QR code (camera or gallery)"
              onScan={handleQrScan}
            />
            {scannedToken && (
              <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 font-mono break-all">
                ✓ QR Scanned
              </p>
            )}
            <div>
              <Label>Select Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose the event…" />
                </SelectTrigger>
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
    </PortalLayout>
  );
}
