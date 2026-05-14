import { useState } from "react";
import { useListAttendance, useQrScanCheckIn, useCheckIn, useListMembers, useListEvents, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { QrCode, UserCheck } from "lucide-react";

type AttendanceRecord = { id: number; memberId: number; memberName: string; eventName: string; checkedInAt: string; method: string };
type Event = { id: number; title: string };
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
  const [qrToken, setQrToken] = useState("");
  const [eventName, setEventName] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");

  function handleQrScan() {
    if (!qrToken || !eventName) { toast({ title: "QR token and event name required", variant: "destructive" }); return; }
    qrScanMutation.mutate({ data: { qrToken, eventName } }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
        toast({ title: `Checked in: ${data.memberName}` });
        setShowQrDialog(false); setQrToken(""); setEventName("");
      },
      onError: () => toast({ title: "QR token not found. Check the token and try again.", variant: "destructive" }),
    });
  }

  function handleManualCheckIn() {
    if (!selectedMemberId || !eventName) { toast({ title: "Member and event name required", variant: "destructive" }); return; }
    checkInMutation.mutate({ data: { memberId: Number(selectedMemberId), eventName, method: "manual" } }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
        toast({ title: `Checked in: ${data.memberName}` });
        setShowManualDialog(false); setSelectedMemberId(""); setEventName("");
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
            <Button size="sm" variant="outline" onClick={() => { setEventName(""); setQrToken(""); setShowQrDialog(true); }} data-testid="button-qr-scan"><QrCode className="h-4 w-4 mr-1" /> QR Scan</Button>
            <Button size="sm" onClick={() => { setEventName(""); setSelectedMemberId(""); setShowManualDialog(true); }} data-testid="button-manual-checkin"><UserCheck className="h-4 w-4 mr-1" /> Manual</Button>
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

      {/* QR Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent data-testid="dialog-qr-scan">
          <DialogHeader><DialogTitle>QR Code Scan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>QR Token</Label><Input placeholder="Paste or type QR token" value={qrToken} onChange={e => setQrToken(e.target.value)} data-testid="input-qr-token" /></div>
            <div><Label>Event Name</Label><Input placeholder="e.g. Sunday Service" value={eventName} onChange={e => setEventName(e.target.value)} data-testid="input-event-name-qr" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQrDialog(false)}>Cancel</Button>
            <Button onClick={handleQrScan} disabled={qrScanMutation.isPending} data-testid="button-confirm-qr-scan">Check In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent data-testid="dialog-manual-checkin">
          <DialogHeader><DialogTitle>Manual Check-In</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Member</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger data-testid="select-member"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {(members as Member[]).map(m => <SelectItem key={m.id} value={String(m.id)}>{m.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Event Name</Label><Input placeholder="e.g. Sunday Service" value={eventName} onChange={e => setEventName(e.target.value)} data-testid="input-event-name-manual" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>Cancel</Button>
            <Button onClick={handleManualCheckIn} disabled={checkInMutation.isPending} data-testid="button-confirm-checkin">Check In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
