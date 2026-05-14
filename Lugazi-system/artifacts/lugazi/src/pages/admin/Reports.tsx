import { useState } from "react";
import { useListReports, useCreateReport, useUpdateReport, getListReportsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { statusBadge } from "@/components/Badge";
import { Plus } from "lucide-react";

type Report = { id: number; title: string; type: string; submittedByName?: string | null; period: string; status: string; createdAt: string };

const REPORT_TYPES = ["weekly_branch", "monthly_branch", "quarterly", "annual", "special"];

export default function AdminReports() {
  const { data: reports = [], isLoading } = useListReports();
  const createMutation = useCreateReport();
  const updateMutation = useUpdateReport();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blank = { title: "", type: "weekly_branch", content: "", period: "", attendance: "", soulWinning: "" };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleAdd() {
    createMutation.mutate({ data: { title: form.title, type: form.type, content: form.content, period: form.period, attendance: form.attendance ? Number(form.attendance) : undefined, soulWinning: form.soulWinning ? Number(form.soulWinning) : undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() }); toast({ title: "Report submitted" }); setShowAdd(false); setForm(blank); },
    });
  }

  function handleApprove(id: number) {
    updateMutation.mutate({ id, data: { status: "reviewed" } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() }); toast({ title: "Report approved" }); },
    });
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Reports" description="Branch and ministry reports" actions={
        <Button size="sm" onClick={() => { setForm(blank); setShowAdd(true); }} data-testid="button-add-report"><Plus className="h-4 w-4 mr-1" /> Submit Report</Button>
      } />
      <DataTable
        columns={[
          { header: "Title", key: "title" },
          { header: "Type", key: "type" },
          { header: "Submitted By", key: "submittedByName", render: r => r.submittedByName || "-" },
          { header: "Period", key: "period" },
          { header: "Status", key: "status", render: r => statusBadge(r.status) },
          { header: "Actions", key: "actions", render: r => r.status === "submitted" ? (
            <Button size="sm" variant="outline" onClick={() => handleApprove(r.id)} data-testid={`button-approve-report-${r.id}`}>Approve</Button>
          ) : null },
        ]}
        data={reports as Report[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No reports submitted."
      />
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent data-testid="dialog-add-report">
          <DialogHeader><DialogTitle>Submit Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => f("title", e.target.value)} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => f("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPORT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Period (e.g. Week 1, May 2026)</Label><Input value={form.period} onChange={e => f("period", e.target.value)} /></div>
            <div><Label>Attendance Count</Label><Input type="number" value={form.attendance} onChange={e => f("attendance", e.target.value)} /></div>
            <div><Label>Soul Winning Count</Label><Input type="number" value={form.soulWinning} onChange={e => f("soulWinning", e.target.value)} /></div>
            <div><Label>Report Content</Label><Textarea rows={4} value={form.content} onChange={e => f("content", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="button-save-report">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
