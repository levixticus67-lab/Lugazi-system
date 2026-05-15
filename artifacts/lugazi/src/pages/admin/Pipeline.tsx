import { useState } from "react";
import { useListPipeline, useCreatePipelineContact, useUpdatePipelineContact, useDeletePipelineContact, getListPipelineQueryKey, useListBranches } from "@workspace/api-client-react";
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
import { statusBadge } from "@/components/Badge";
import { Plus, Trash2 } from "lucide-react";

type PipelineContact = { id: number; name: string; phone: string; email?: string | null; stage: string; source: string; branchId: number; createdAt: string };
type Branch = { id: number; name: string };

const STAGES = ["new_contact", "first_visit", "following_up", "committed", "member"];
const SOURCES = ["personal_outreach", "event", "social_media", "referral", "walk_in", "other"];

export default function AdminPipeline() {
  const { data: contacts = [], isLoading } = useListPipeline();
  const { data: branches = [] } = useListBranches();
  const createMutation = useCreatePipelineContact();
  const updateMutation = useUpdatePipelineContact();
  const deleteMutation = useDeletePipelineContact();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blank = { name: "", phone: "", email: "", stage: "new_contact", source: "personal_outreach", branchId: "1" };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleAdd() {
    createMutation.mutate({ data: { name: form.name, phone: form.phone, email: form.email || undefined, stage: form.stage, source: form.source, branchId: Number(form.branchId) } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPipelineQueryKey() }); toast({ title: "Contact added" }); setShowAdd(false); setForm(blank); },
    });
  }

  function handleStageChange(id: number, stage: string) {
    updateMutation.mutate({ id, data: { stage } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPipelineQueryKey() }),
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Remove this contact?")) return;
    deleteMutation.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPipelineQueryKey() }) });
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Soul-Winning Pipeline" description="Track contacts through discipleship stages" actions={
        <Button size="sm" onClick={() => { setForm(blank); setShowAdd(true); }} data-testid="button-add-contact"><Plus className="h-4 w-4 mr-1" /> Add Contact</Button>
      } />
      <DataTable
        columns={[
          { header: "Name", key: "name" },
          { header: "Phone", key: "phone" },
          { header: "Email", key: "email", render: r => r.email || "-" },
          { header: "Source", key: "source" },
          { header: "Stage", key: "stage", render: r => (
            <Select value={r.stage} onValueChange={v => handleStageChange(r.id, v)}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          )},
          { header: "Actions", key: "actions", render: r => (
            <button className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r.id)} data-testid={`button-delete-contact-${r.id}`}><Trash2 className="h-4 w-4" /></button>
          )},
        ]}
        data={contacts as PipelineContact[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No pipeline contacts. Start adding soul-winning contacts."
      />
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent data-testid="dialog-add-contact">
          <DialogHeader><DialogTitle>Add Pipeline Contact</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => f("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => f("email", e.target.value)} /></div>
            <div>
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={v => f("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => f("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branchId} onValueChange={v => f("branchId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(branches as Branch[]).map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="button-save-contact">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
