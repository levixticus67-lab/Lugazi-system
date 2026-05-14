import { useState } from "react";
import { useListReports, useCreateReport, getListReportsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { workforceNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { statusBadge } from "@/components/Badge";
import { Plus } from "lucide-react";

type Report = { id: number; title: string; type: string; period: string; status: string };

export default function WorkforceReports() {
  const { data: reports = [], isLoading } = useListReports();
  const createMutation = useCreateReport();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blank = { title: "", type: "weekly_branch", content: "", period: "" };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleAdd() {
    createMutation.mutate({ data: { title: form.title, type: form.type, content: form.content, period: form.period } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() }); toast({ title: "Report submitted" }); setShowAdd(false); setForm(blank); },
    });
  }

  return (
    <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
      <PageHeader title="Reports" actions={<Button size="sm" onClick={() => { setForm(blank); setShowAdd(true); }} data-testid="button-add-report"><Plus className="h-4 w-4 mr-1" /> Submit</Button>} />
      <DataTable
        columns={[{ header: "Title", key: "title" }, { header: "Type", key: "type" }, { header: "Period", key: "period" }, { header: "Status", key: "status", render: r => statusBadge(r.status) }]}
        data={reports as Report[]} keyField="id" isLoading={isLoading} emptyMessage="No reports."
      />
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => f("title", e.target.value)} /></div>
            <div><Label>Period</Label><Input value={form.period} onChange={e => f("period", e.target.value)} /></div>
            <div><Label>Content</Label><Textarea rows={4} value={form.content} onChange={e => f("content", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
