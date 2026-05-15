import { useState } from "react";
import { useListWelfare, useUpdateWelfare, getListWelfareQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { leadershipNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { statusBadge } from "@/components/Badge";

type WelfareRequest = { id: number; memberName: string; category: string; description: string; status: string; createdAt: string };

export default function LeadershipWelfare() {
  const { data: requests = [], isLoading } = useListWelfare();
  const updateMutation = useUpdateWelfare();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editReq, setEditReq] = useState<WelfareRequest | null>(null);
  const [status, setStatus] = useState("approved");
  const [adminNote, setAdminNote] = useState("");

  function handleUpdate() {
    if (!editReq) return;
    updateMutation.mutate({ id: editReq.id, data: { status, adminNote: adminNote || undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListWelfareQueryKey() }); toast({ title: "Updated" }); setEditReq(null); },
    });
  }

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="Welfare Requests" />
      <DataTable
        columns={[
          { header: "Member", key: "memberName" }, { header: "Category", key: "category" },
          { header: "Status", key: "status", render: r => statusBadge(r.status) },
          { header: "Date", key: "createdAt", render: r => new Date(r.createdAt).toLocaleDateString() },
          { header: "Actions", key: "actions", render: r => r.status === "pending" ? (
            <Button size="sm" variant="outline" onClick={() => { setEditReq(r); setStatus("approved"); setAdminNote(""); }} data-testid={`button-review-${r.id}`}>Review</Button>
          ) : null },
        ]}
        data={requests as WelfareRequest[]} keyField="id" isLoading={isLoading} emptyMessage="No welfare requests."
      />
      <Dialog open={!!editReq} onOpenChange={() => setEditReq(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Welfare — {editReq?.memberName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{editReq?.description}</p>
            <div><Label>Decision</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="approved">Approve</SelectItem><SelectItem value="rejected">Reject</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Note</Label><Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReq(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
