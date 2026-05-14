import { useState } from "react";
import { useListAttendance, useQrScanCheckIn, useCheckIn, useListMembers, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { workforceNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { QrCode, UserCheck } from "lucide-react";

type AttendanceRecord = { id: number; memberName: string; eventName: string; checkedInAt: string; method: string };
type Member = { id: number; fullName: string };

export default function WorkforceAttendance() {
  const { data: records = [], isLoading } = useListAttendance();
  const { data: members = [] } = useListMembers();
  const qrScanMutation = useQrScanCheckIn();
  const checkInMutation = useCheckIn();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showQr, setShowQr] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [eventName, setEventName] = useState("");
  const [memberId, setMemberId] = useState("");

  return (
    <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
      <PageHeader title="Attendance" actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setQrToken(""); setEventName(""); setShowQr(true); }} data-testid="button-qr-scan"><QrCode className="h-4 w-4 mr-1" /> QR Scan</Button>
          <Button size="sm" onClick={() => { setMemberId(""); setEventName(""); setShowManual(true); }} data-testid="button-manual"><UserCheck className="h-4 w-4 mr-1" /> Manual</Button>
        </div>
      } />
      <DataTable
        columns={[{ header: "Member", key: "memberName" }, { header: "Event", key: "eventName" }, { header: "Method", key: "method" }, { header: "Time", key: "checkedInAt", render: r => new Date(r.checkedInAt).toLocaleString() }]}
        data={(records as AttendanceRecord[]).slice(0, 100)} keyField="id" isLoading={isLoading} emptyMessage="No records."
      />
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent>
          <DialogHeader><DialogTitle>QR Scan Check-In</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>QR Token</Label><Input value={qrToken} onChange={e => setQrToken(e.target.value)} data-testid="input-qr-token" /></div>
            <div><Label>Event Name</Label><Input value={eventName} onChange={e => setEventName(e.target.value)} data-testid="input-event-name" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQr(false)}>Cancel</Button>
            <Button onClick={() => qrScanMutation.mutate({ data: { qrToken, eventName } }, { onSuccess: d => { queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() }); toast({ title: `Checked in: ${d.memberName}` }); setShowQr(false); }, onError: () => toast({ title: "QR not found", variant: "destructive" }) })} disabled={qrScanMutation.isPending} data-testid="button-confirm-qr">Check In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manual Check-In</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Member</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{(members as Member[]).map(m => <SelectItem key={m.id} value={String(m.id)}>{m.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Event Name</Label><Input value={eventName} onChange={e => setEventName(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManual(false)}>Cancel</Button>
            <Button onClick={() => checkInMutation.mutate({ data: { memberId: Number(memberId), eventName, method: "manual" } }, { onSuccess: d => { queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() }); toast({ title: `Checked in: ${d.memberName}` }); setShowManual(false); } })} disabled={checkInMutation.isPending}>Check In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
