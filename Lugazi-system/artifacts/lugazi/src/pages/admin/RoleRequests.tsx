import { useState } from "react";
import { useListRoleRequests, useApproveRoleRequest, useRejectRoleRequest, getListRoleRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { statusBadge } from "@/components/Badge";
import { Check, X } from "lucide-react";

type RoleRequest = {
  id: number; userId: number; userEmail?: string | null; userDisplayName?: string | null;
  requestedRole: string; currentRole: string; reason?: string | null; status: string;
  adminNote?: string | null; createdAt: string;
};

export default function AdminRoleRequests() {
  const { data: requests = [], isLoading } = useListRoleRequests();
  const approveMutation = useApproveRoleRequest();
  const rejectMutation = useRejectRoleRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rejectTarget, setRejectTarget] = useState<RoleRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");

  function handleApprove(r: RoleRequest) {
    approveMutation.mutate({ id: r.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRoleRequestsQueryKey() });
        toast({ title: `Approved — ${r.userDisplayName} is now ${r.requestedRole}` });
      },
    });
  }

  function handleReject() {
    if (!rejectTarget) return;
    rejectMutation.mutate({ id: rejectTarget.id, data: { adminNote: adminNote || undefined } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRoleRequestsQueryKey() });
        toast({ title: "Request rejected" });
        setRejectTarget(null); setAdminNote("");
      },
    });
  }

  const pending = (requests as RoleRequest[]).filter(r => r.status === "pending");
  const reviewed = (requests as RoleRequest[]).filter(r => r.status !== "pending");

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Role Upgrade Requests" description={`${pending.length} pending requests`} />

      <div className="space-y-6">
        {pending.length === 0 && (
          <div className="bg-card border border-card-border rounded-xl p-8 text-center text-muted-foreground shadow-sm">
            No pending role requests
          </div>
        )}
        {pending.map(r => (
          <div key={r.id} className="bg-card border border-card-border rounded-xl p-5 shadow-sm" data-testid={`role-request-${r.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{r.userDisplayName || r.userEmail}</p>
                <p className="text-sm text-muted-foreground">{r.userEmail}</p>
                <p className="text-sm mt-1">
                  <span className="text-muted-foreground">Requests: </span>
                  <span className="font-medium text-foreground">{r.currentRole}</span>
                  <span className="text-muted-foreground mx-2">→</span>
                  <span className="font-medium text-primary">{r.requestedRole}</span>
                </p>
                {r.reason && <p className="text-sm text-muted-foreground mt-2 italic">"{r.reason}"</p>}
                <p className="text-xs text-muted-foreground mt-2">{new Date(r.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleApprove(r)} disabled={approveMutation.isPending} data-testid={`button-approve-${r.id}`}>
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setRejectTarget(r); setAdminNote(""); }} data-testid={`button-reject-${r.id}`}>
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          </div>
        ))}

        {reviewed.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Reviewed Requests</h3>
            <div className="space-y-2">
              {reviewed.map(r => (
                <div key={r.id} className="bg-card border border-card-border rounded-lg px-4 py-3 flex items-center justify-between shadow-sm" data-testid={`reviewed-request-${r.id}`}>
                  <div>
                    <span className="font-medium text-sm">{r.userDisplayName || r.userEmail}</span>
                    <span className="text-muted-foreground text-sm ml-2">requested {r.requestedRole}</span>
                  </div>
                  {statusBadge(r.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent data-testid="dialog-reject">
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Admin Note (optional)</Label>
            <Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Reason for rejection..." data-testid="textarea-admin-note" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending} data-testid="button-confirm-reject">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
