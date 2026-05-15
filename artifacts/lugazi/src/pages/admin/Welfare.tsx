import { useState } from "react";
import { useListWelfare, useUpdateWelfare, getListWelfareQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { statusBadge } from "@/components/Badge";

type WelfareRequest = { id: number; memberName: string; category: string; description: string; amountRequested?: number | null; status: string; adminNote?: string | null; createdAt: string };

export default function AdminWelfare() {
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
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListWelfareQueryKey() }); toast({ title: "Status updated" }); setEditReq(null); },
    });
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Welfare Requests" description={`${(requests as WelfareRequest[]).filter(r => r.status === "pending").length} pending`} />
      <DataTable
        columns={[
          { header: "Member", key: "memberName" },
          { header: "Category", key: "category" },
          { header: "Description", key: "description", render: r => r.description.length > 60 ? r.description.slice(0, 60) + "…" : r.description },
          { header: "Amount (UGX)", key: "amountRequested", render: r => r.amountRequested ? Number(r.amountRequested).toLocaleString() : "-" },
          { header: "Status", key: "status", render: r => statusBadge(r.status) },
          { header: "Date", key: "createdAt", render: r => new Date(r.createdAt).toLocaleDateString() },
          { header: "Actions", key: "actions", render: r => r.status === "pending" ? (
            <Button size="sm" variant="outline" onClick={() => { setEditReq(r); setStatus("approved"); setAdminNote(""); }} data-testid={`button-review-welfare-${r.id}`}>Review</Button>
          ) : null },
        ]}
        data={requests as WelfareRequest[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No welfare requests."
      />
      <Dialog open={!!editReq} onOpenChange={() => setEditReq(null)}>
        <DialogContent data-testid="dialog-review-welfare">
          <DialogHeader><DialogTitle>Review Welfare Request</DialogTitle></DialogHeader>
          {editReq && (
            <div className="space-y-3">
              <p className="text-sm"><span className="font-medium">Member:</span> {editReq.memberName}</p>
              <p className="text-sm"><span className="font-medium">Category:</span> {editReq.category}</p>
              <p className="text-sm text-muted-foreground">{editReq.description}</p>
              <div>
                <Label>Decision</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Admin Note</Label><Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReq(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-confirm-welfare">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
