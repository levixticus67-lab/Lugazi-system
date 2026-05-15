import { useState } from "react";
import { useListWelfare, useCreateWelfare, getListWelfareQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { memberNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { statusBadge } from "@/components/Badge";
import { Plus } from "lucide-react";

type WelfareRequest = { id: number; category: string; description: string; status: string; adminNote?: string | null; createdAt: string };

const CATEGORIES = ["medical", "bereavement", "education", "housing", "food", "other"];

export default function MemberWelfare() {
  const { data: requests = [], isLoading } = useListWelfare();
  const createMutation = useCreateWelfare();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: "medical", description: "", amountRequested: "" });
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleSubmit() {
    if (!form.description) { toast({ title: "Description required", variant: "destructive" }); return; }
    createMutation.mutate({ data: { category: form.category, description: form.description, amountRequested: form.amountRequested ? Number(form.amountRequested) : undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListWelfareQueryKey() }); toast({ title: "Welfare request submitted" }); setShowAdd(false); setForm({ category: "medical", description: "", amountRequested: "" }); },
    });
  }

  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader title="Welfare Requests" description="Submit and track welfare requests" actions={
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-submit-welfare"><Plus className="h-4 w-4 mr-1" /> New Request</Button>
      } />
      <DataTable
        columns={[
          { header: "Category", key: "category" },
          { header: "Description", key: "description", render: r => r.description.length > 60 ? r.description.slice(0, 60) + "…" : r.description },
          { header: "Status", key: "status", render: r => statusBadge(r.status) },
          { header: "Admin Note", key: "adminNote", render: r => r.adminNote || "-" },
          { header: "Date", key: "createdAt", render: r => new Date(r.createdAt).toLocaleDateString() },
        ]}
        data={requests as WelfareRequest[]} keyField="id" isLoading={isLoading} emptyMessage="No welfare requests submitted."
      />
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent data-testid="dialog-welfare">
          <DialogHeader><DialogTitle>Submit Welfare Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => f("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => f("description", e.target.value)} placeholder="Describe your need..." data-testid="textarea-description" /></div>
            <div><Label>Amount Requested (UGX, optional)</Label><Input type="number" value={form.amountRequested} onChange={e => f("amountRequested", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-confirm-welfare">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
