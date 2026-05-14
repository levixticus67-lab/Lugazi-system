import { useState } from "react";
import { useListBranches, useCreateBranch, useUpdateBranch, useDeleteBranch, getListBranchesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Branch = { id: number; name: string; location: string; leaderName?: string | null; memberCount: number; createdAt: string };

export default function AdminBranches() {
  const { data: branches = [], isLoading } = useListBranches();
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();
  const deleteMutation = useDeleteBranch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blank = { name: "", location: "", leaderName: "" };
  const [showAdd, setShowAdd] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState(blank);

  function f(key: string, val: string) { setForm(p => ({ ...p, [key]: val })); }

  function handleAdd() {
    createMutation.mutate({ data: { name: form.name, location: form.location, leaderName: form.leaderName || undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListBranchesQueryKey() }); toast({ title: "Branch created" }); setShowAdd(false); setForm(blank); },
      onError: () => toast({ title: "Error creating branch", variant: "destructive" }),
    });
  }

  function handleUpdate() {
    if (!editBranch) return;
    updateMutation.mutate({ id: editBranch.id, data: { name: form.name, location: form.location, leaderName: form.leaderName || undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListBranchesQueryKey() }); toast({ title: "Branch updated" }); setEditBranch(null); },
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this branch?")) return;
    deleteMutation.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBranchesQueryKey() }) });
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Branches" description={`${(branches as Branch[]).length} branches`} actions={
        <Button size="sm" onClick={() => { setForm(blank); setShowAdd(true); }} data-testid="button-add-branch"><Plus className="h-4 w-4 mr-1" /> Add Branch</Button>
      } />
      <DataTable
        columns={[
          { header: "Name", key: "name" },
          { header: "Location", key: "location" },
          { header: "Leader", key: "leaderName", render: r => r.leaderName || "-" },
          { header: "Members", key: "memberCount" },
          { header: "Actions", key: "actions", render: r => (
            <div className="flex gap-2">
              <button className="text-muted-foreground hover:text-foreground" onClick={() => { setEditBranch(r); setForm({ name: r.name, location: r.location, leaderName: r.leaderName || "" }); }} data-testid={`button-edit-branch-${r.id}`}><Pencil className="h-4 w-4" /></button>
              <button className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r.id)} data-testid={`button-delete-branch-${r.id}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          )},
        ]}
        data={branches as Branch[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No branches found."
      />
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent data-testid="dialog-add-branch">
          <DialogHeader><DialogTitle>Add Branch</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} data-testid="input-branch-name" /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => f("location", e.target.value)} /></div>
            <div><Label>Leader Name</Label><Input value={form.leaderName} onChange={e => f("leaderName", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="button-save-branch">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editBranch} onOpenChange={() => setEditBranch(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Branch</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => f("location", e.target.value)} /></div>
            <div><Label>Leader Name</Label><Input value={form.leaderName} onChange={e => f("leaderName", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBranch(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
